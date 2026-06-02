/* =========================================================================
 * caseWarnings.js — Pilot Supervision layer (mistake / incompleteness rules)
 * -----------------------------------------------------------------------
 * ONE deterministic, frontend-only source of truth for "what looks wrong or
 * incomplete on this case". Used by:
 *   - case-list warning chips (admin All Cases + clinic/reception My Cases)
 *   - the Case Detail "Needs Attention" panel (quick actions → Full Case Editor)
 *   - the Admin dashboard review queues
 *
 * Pure functions only (no React, no IO). Every rule reads ONLY the in-app case
 * object (portalRowToCase shape) plus an OPTIONAL normalized financial summary
 * (cash invoice / collected, excess expected / collected). No fabrication: a
 * money rule that needs financial data simply does not fire when that data is
 * absent. Nothing here mutates a case.
 *
 * Severity tiers (kept deliberately small to avoid alert fatigue):
 *   - 'danger' (red)   money/operational inconsistency — something IS wrong.
 *   - 'warn'   (amber) required workflow step still incomplete.
 *   - 'info'   (grey)  soft completeness nudge (contact details, DOB sanity).
 * ========================================================================= */

export const SECTION = {
  REGISTRATION: 'registration', // contact / classification / insurer / cash amount → Full Case Editor
  FINANCIAL: 'financial',       // collections / excess collection
  VISIT: 'visit',               // room assignment / discharge
  TRANSFER: 'transfer',         // receive incoming transfer
}

export const SEVERITY_RANK = { danger: 0, warn: 1, info: 2 }

const PLACEHOLDER_DOB = '1990-01-01' // intake default when DOB is unknown (see insertCase)

const isBlank = (v) => v == null || String(v).trim() === ''
const ymd = (d) => (d ? String(d).slice(0, 10) : null)
const fmtAmt = (n) => {
  const num = Number(n) || 0
  return Number.isInteger(num) ? String(num) : num.toFixed(2)
}

/** Convert the raw fetchCaseFinancials({charges,collections}) result into the
 *  normalized shape the rules use. Collections are matched to the charge's
 *  invoice currency (same rule as fetchCaseFinancials / fetchCaseFinancialIndex).
 *  Returns null when there is no financial data at all. */
export function normalizeCaseFinancials(raw) {
  if (!raw) return null
  const charges = raw.charges || []
  const cols = raw.collections || []
  const cashCharge = charges.find((c) => c.charge_type === 'cash_case_amount')
  const excessCharge = charges.find((c) => c.charge_type === 'patient_excess')
  const sum = (purpose, cur) => cols
    .filter((c) => c.collection_purpose === purpose && (!cur || c.invoice_currency === cur))
    .reduce((s, c) => s + (Number(c.foreign_amount_covered) || 0), 0)
  return {
    cashInvoice: cashCharge ? Number(cashCharge.amount) : null,
    cashCurrency: cashCharge?.currency || null,
    cashCollected: cashCharge ? sum('cash_case_payment', cashCharge.currency) : sum('cash_case_payment'),
    excessExpected: excessCharge ? Number(excessCharge.amount) : null,
    excessCurrency: excessCharge?.currency || null,
    excessCollected: excessCharge ? sum('patient_excess', excessCharge.currency) : sum('patient_excess'),
  }
}

/** Compute the warning list for one case.
 *  @param c   in-app case object (portalRowToCase shape)
 *  @param fin OPTIONAL normalized financials ({cashInvoice,cashCollected,excessExpected,...})
 *  @param opts.today YYYY-MM-DD (inject for determinism; defaults to runtime today)
 *  @returns Array<{ id, severity, label, detail, section }> sorted danger→warn→info
 */
export function computeCaseWarnings(c, fin, opts = {}) {
  if (!c) return []
  const today = opts.today || new Date().toISOString().slice(0, 10)
  const w = []
  const add = (id, severity, label, detail, section) => w.push({ id, severity, label, detail, section })

  const ft = c.financialType
  const isClosed = c.operationalStatus === 'Closed'
  const isOpen = !isClosed
  const p = c.patient || {}
  const tr = c.transfer || null

  // ---- Contact / identity (info) -----------------------------------------
  if (isBlank(p.phone)) add('missing_phone', 'info', 'No phone', 'Patient phone number is missing.', SECTION.REGISTRATION)
  if (isBlank(p.email)) add('missing_email', 'info', 'No email', 'Patient email is missing.', SECTION.REGISTRATION)
  if (isBlank(p.nationality)) add('missing_nationality', 'info', 'No nationality', 'Patient nationality is missing.', SECTION.REGISTRATION)

  const dob = ymd(p.dob)
  if (isBlank(dob)) add('missing_dob', 'info', 'No DOB', 'Date of birth is missing.', SECTION.REGISTRATION)
  else if (dob > today) add('dob_future', 'warn', 'DOB in future', `Date of birth ${dob} is in the future — likely a typo.`, SECTION.REGISTRATION)
  else if (dob === today) add('dob_today', 'info', 'DOB = today', `Date of birth is set to today (${dob}) — confirm it was entered correctly.`, SECTION.REGISTRATION)
  else if (dob === PLACEHOLDER_DOB) add('dob_placeholder', 'info', 'DOB placeholder', `Date of birth is the default ${PLACEHOLDER_DOB} — confirm the real DOB.`, SECTION.REGISTRATION)

  // ---- Financial classification (warn) -----------------------------------
  if (ft === 'Pending' || ft == null) {
    if (tr && tr.status === 'Received') {
      add('transfer_received_pending', 'warn', 'Received — classify',
        `Transfer received at ${tr.toBranchName || 'destination'} but the financial type is still Pending.`, SECTION.REGISTRATION)
    } else {
      add('pending_classification', 'warn', 'Classify financial',
        'Financial type is still Pending — set Cash / Insurance / Free.', SECTION.REGISTRATION)
    }
  }

  // ---- Cash (warn / danger) — needs financials ---------------------------
  if (ft === 'Cash' && fin) {
    const inv = fin.cashInvoice
    if (inv == null || !(Number(inv) > 0)) {
      add('cash_no_invoice', 'warn', 'No invoice amount', 'Cash case has no invoice amount recorded.', SECTION.FINANCIAL)
    } else {
      const collected = Number(fin.cashCollected || 0)
      const remaining = Number((inv - collected).toFixed(2))
      const cur = fin.cashCurrency || ''
      if (collected <= 0) {
        add('cash_uncollected', 'danger', 'Cash not collected',
          `Cash invoice ${fmtAmt(inv)} ${cur} recorded but nothing has been collected.`, SECTION.FINANCIAL)
      } else if (remaining > 0.005) {
        add('cash_partial', 'danger', 'Cash outstanding',
          `${fmtAmt(remaining)} ${cur} of the ${fmtAmt(inv)} cash invoice is still outstanding.`, SECTION.FINANCIAL)
      }
    }
  }

  // ---- Insurance (warn / danger) -----------------------------------------
  if (ft === 'Insurance') {
    const ins = c.insurance || {}
    if (isBlank(ins.company)) {
      add('ins_no_company', 'warn', 'No insurer', 'Insurance case is missing the insurance company.', SECTION.REGISTRATION)
    }
    const ref = ins.ref
    if (isBlank(ref) || /^\(pending\)$/i.test(String(ref).trim())) {
      add('ins_no_ref', 'warn', 'No insurance ref', 'Insurance case is missing the insurance reference number.', SECTION.REGISTRATION)
    }
    const markedExcess = !!ins.hasExcess
    const excessExpected = fin ? fin.excessExpected : null
    if (markedExcess && (excessExpected == null || !(Number(excessExpected) > 0))) {
      add('excess_no_amount', 'warn', 'Excess amount?', 'Marked as patient excess but no excess amount is set.', SECTION.FINANCIAL)
    }
    if (fin && excessExpected != null && Number(excessExpected) > 0) {
      const exCollected = Number(fin.excessCollected || 0)
      const exRemaining = Number((excessExpected - exCollected).toFixed(2))
      const cur = fin.excessCurrency || ''
      if (exCollected <= 0) {
        add('excess_uncollected', 'danger', 'Excess not collected',
          `Patient excess ${fmtAmt(excessExpected)} ${cur} is expected but has not been collected.`, SECTION.FINANCIAL)
      } else if (exRemaining > 0.005) {
        add('excess_partial', 'danger', 'Excess outstanding',
          `${fmtAmt(exRemaining)} ${cur} of the patient excess is still outstanding.`, SECTION.FINANCIAL)
      }
    }
  }

  // ---- Transfer (warn) ---------------------------------------------------
  if (tr && tr.status === 'Sent' && !tr.receivedAt) {
    add('transfer_awaiting', 'warn', 'Awaiting receipt',
      `Transfer to ${tr.toBranchName || 'destination'} is waiting to be received.`, SECTION.TRANSFER)
  }

  // ---- Visit / room (warn / danger) --------------------------------------
  // Open visit left past its day (a same-day open case is normal → no nag).
  const vd = ymd(c.visitDate)
  if (isOpen && vd && vd < today) {
    add('open_stale', 'warn', 'Open — not discharged',
      `Visit ${vd} is still open with no checkout/discharge recorded.`, SECTION.VISIT)
  }
  // Inpatient admission with no room (outpatient never needs one → no nag).
  if (isOpen && !c.centerRoomId && c.encounterPattern === 'inpatient_admission') {
    add('no_room', 'warn', 'No room', 'Inpatient case has no Center Room assigned.', SECTION.VISIT)
  }
  // Closed but still holding a room — release inconsistency.
  if (isClosed && c.centerRoomId) {
    add('room_on_closed', 'danger', 'Room not released',
      `Case is closed but still holds ${c.centerRoomName || c.centerRoomNumber || 'a room'} — release it.`, SECTION.VISIT)
  }

  // ---- Soft: created-date vs visit-date mismatch (info) -------------------
  const cd = ymd(c.createdAt)
  if (cd && vd && cd !== vd) {
    add('created_visit_mismatch', 'info', 'Date mismatch',
      `Recorded ${cd} but the visit date is ${vd} — confirm the visit date.`, SECTION.REGISTRATION)
  }

  return w.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

/** Highest severity present in a warning list (for a row dot / sort key). */
export function topSeverity(warnings = []) {
  if (warnings.some((w) => w.severity === 'danger')) return 'danger'
  if (warnings.some((w) => w.severity === 'warn')) return 'warn'
  if (warnings.some((w) => w.severity === 'info')) return 'info'
  return null
}

/* =========================================================================
 * Review-queue buckets for the Admin dashboard. Pure: takes the list of cases
 * and a (caseId → normalized financials) index, returns clickable buckets.
 * Each bucket entry is { case, warnings } so the UI links straight to the case.
 * ========================================================================= */

export const QUEUE_DEFS = [
  { key: 'needs_review_today', title: 'Needs admin review', tone: 'danger', match: (ws) => ws.some((w) => w.severity === 'danger') },
  { key: 'pending_classification', title: 'Pending classification', tone: 'warn', ids: ['pending_classification', 'transfer_received_pending'] },
  { key: 'cash_outstanding', title: 'Cash outstanding', tone: 'danger', ids: ['cash_uncollected', 'cash_partial'] },
  { key: 'insurance_incomplete', title: 'Insurance incomplete', tone: 'warn', ids: ['ins_no_company', 'ins_no_ref', 'excess_no_amount', 'excess_uncollected', 'excess_partial'] },
  { key: 'transfers_awaiting', title: 'Transfers awaiting receipt', tone: 'warn', ids: ['transfer_awaiting'] },
  { key: 'open_no_discharge', title: 'Open visits — no discharge', tone: 'warn', ids: ['open_stale'] },
  { key: 'missing_contact', title: 'Missing phone number', tone: 'info', ids: ['missing_phone'] },
  { key: 'closed_with_outstanding', title: 'Closed — money outstanding', tone: 'danger', custom: true },
]

/** Build all review-queue buckets in a single pass over the cases.
 *  @param cases array of in-app case objects
 *  @param finIndex { [caseId]: normalized financials }
 *  @returns { [queueKey]: Array<{case, warnings}> }  plus _warningsByCase map
 */
export function buildReviewQueues(cases = [], finIndex = {}, opts = {}) {
  const today = opts.today || new Date().toISOString().slice(0, 10)
  const queues = {}
  for (const def of QUEUE_DEFS) queues[def.key] = []
  const warningsByCase = {}

  for (const c of cases) {
    const ws = computeCaseWarnings(c, finIndex[c.id], { today })
    warningsByCase[c.id] = ws
    if (!ws.length) continue
    const ids = new Set(ws.map((w) => w.id))
    for (const def of QUEUE_DEFS) {
      let hit = false
      if (def.match) hit = def.match(ws)
      else if (def.custom && def.key === 'closed_with_outstanding') {
        hit = c.operationalStatus === 'Closed' &&
          ['cash_uncollected', 'cash_partial', 'excess_uncollected', 'excess_partial'].some((id) => ids.has(id))
      } else if (def.ids) {
        hit = def.ids.some((id) => ids.has(id))
      }
      if (hit) queues[def.key].push({ case: c, warnings: ws.filter((w) => (def.ids ? def.ids.includes(w.id) : true)) })
    }
  }
  queues._warningsByCase = warningsByCase
  return queues
}
