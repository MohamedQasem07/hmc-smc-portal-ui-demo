import { getSupabaseClient } from './supabaseClient'
import { sbAdminUsers, escalateIfAuthError } from './auth'
import {
  FINANCIAL_TYPE_TO_PORTAL, ROUTE_TO_PORTAL, ENCOUNTER_PATTERN_TO_PORTAL,
  GENDER_TO_PORTAL, billingPrepToRow,
} from './portalMapping'

/* =========================================================================
 * Live portal_* data access (P3B / S6) — supabase mode only.
 * Reads are RLS-scoped automatically (the JWT decides which rows return).
 * Writes set created_by = auth.uid() to satisfy the INSERT policies.
 * Maps portal rows <-> the in-app (mock-shaped) case object the pages render.
 * ========================================================================= */

let _maps = null
export async function loadRefMaps(force = false) {
  if (_maps && !force) return _maps
  const db = await getSupabaseClient()
  const [{ data: locs }, { data: facs }] = await Promise.all([
    db.from('portal_locations').select('id, code, name, location_type'),
    db.from('portal_billing_facilities').select('id, code'),
  ])
  _maps = {
    locById: Object.fromEntries((locs || []).map((l) => [l.id, l])),
    locIdByCode: Object.fromEntries((locs || []).map((l) => [l.code, l.id])),
    facCodeById: Object.fromEntries((facs || []).map((f) => [f.id, f.code])),
    facIdByCode: Object.fromEntries((facs || []).map((f) => [f.code, f.id])),
  }
  return _maps
}

const FIN_FROM_PORTAL = { pending: 'Pending', cash: 'Cash', insurance: 'Insurance', free_complimentary: 'Free / Complimentary' }
const OPSTATUS_FROM_PORTAL = { open: 'Open', closed: 'Closed', transferred: 'Open', received: 'Open', cancelled: 'Closed' }
const KIND_FROM_TYPE = { external_clinic: 'external', main_branch: 'branch' }
const ROUTE_FROM_PORTAL = { direct: 'direct', transfer_to_al_kawther: 'to_al_kawther', transfer_to_sheraton: 'to_sheraton', transfer_other: 'transfer_other' }
const BILLING_STATUS_FROM_PORTAL = {
  awaiting_admin_completion: 'awaiting_admin_completion',
  ready_for_claude_invoice_preparation: 'ready_for_claude',
  invoice_generated_future_placeholder: 'future_integration',
  review_required: 'review_required', completed: 'completed',
}
const one = (v) => (Array.isArray(v) ? v[0] : v)

export function portalRowToCase(row, maps) {
  const loc = maps.locById[row.registered_location_id] || {}
  const intake = one(row.intake)
  const prep = one(row.prep)
  const p = row.patient || {}
  return {
    id: row.id,
    ourRef: row.our_ref || ('PORTAL-' + String(row.id).slice(0, 8)),
    registeredAtId: loc.code || null,
    registeredAtName: loc.name || '—',
    registeredAtKind: KIND_FROM_TYPE[loc.location_type] || 'external',
    visitDate: row.visit_date,
    patientId: p.id || null,
    patient: {
      id: p.id || null,
      firstName: p.first_name, lastName: p.last_name,
      name: [p.first_name, p.last_name].filter(Boolean).join(' ') || '—',
      gender: p.gender ? (p.gender === 'male' ? 'Male' : 'Female') : null,
      dob: p.date_of_birth, nationality: p.nationality,
      phoneCode: p.phone_country_code || null, phone: p.phone_number || null,
      email: p.email || null, postal: p.postal_code || null,
      hotel: row.hotel_or_location || null, hotelRoom: row.hotel_room_number || null,
      note: row.short_clinical_note || null,
    },
    route: ROUTE_FROM_PORTAL[row.route] || 'direct',
    routeLabel: ROUTE_FROM_PORTAL[row.route] === 'direct' || !row.route ? `Direct at ${loc.name || ''}` : `Transfer`,
    financialType: FIN_FROM_PORTAL[row.financial_type] || 'Pending',
    billingFacility: row.billing_facility_id ? (maps.facCodeById[row.billing_facility_id] || null) : null,
    insurance: intake ? { company: one(intake.company)?.name || null, ref: intake.insurance_reference_number || null, hasExcess: !!intake.has_patient_excess } : null,
    operationalStatus: OPSTATUS_FROM_PORTAL[row.operational_status] || 'Open',
    encounterPattern: row.encounter_pattern,
    treatmentMode: row.treatment_mode || null,
    transfer: (() => {
      const tr = one(row.transfer)
      if (!tr) return null
      const toLoc = maps.locById[tr.to_location_id] || {}
      const frLoc = maps.locById[tr.from_location_id] || {}
      const TS = { requested: 'Sent', sent: 'Sent', received: 'Received', cancelled: 'Cancelled' }
      return {
        toBranchId: toLoc.code || null, toBranchName: toLoc.name || null,
        fromId: frLoc.code || null, fromName: frLoc.name || null,
        status: TS[tr.transfer_status] || 'Sent',
        sentAt: tr.requested_at || null,
        receivedAt: tr.received_at || null,
        reason: tr.transfer_note || null,
      }
    })(),
    currentLocationId: row.current_location_id || null,
    currentLocationCode: (maps.locById[row.current_location_id] || {}).code || null,
    centerRoomId: row.center_room_id || null,
    centerRoomNumber: one(row.center_room)?.room_code || null,
    centerRoomName: one(row.center_room)?.room_name || null,
    closedAt: row.closed_at || null,
    createdAt: row.created_at || null,
    visitTime: row.visit_time || null,
    freeReason: row.free_reason || null,
    freeApprovedBy: row.free_approved_by || null,
    freeApprovedAt: row.free_approved_at || null,
    insuranceCompletion: prep ? {
      invoiceCurrency: prep.invoice_currency,
      serviceChargePct: prep.service_charge_pct,
      localAssistanceId: prep.local_assistance_company_id || '',
      localAssistanceRef: prep.local_assistance_reference_number || '',
      billingPrepStatus: BILLING_STATUS_FROM_PORTAL[prep.billing_preparation_status] || 'awaiting_admin_completion',
      onedriveFolderPath: prep.onedrive_folder_path,
      missingDataNote: prep.missing_data_note,
      transportationFee: prep.transportation_fee,
      patientExcess: prep.patient_excess_amount,
      adminNotes: prep.admin_notes,
      completedAt: prep.completed_at,
    } : null,
    // Specialist visits / sessions (Phase 6) — mapped from portal_encounters.
    // Specialist name / specialty / source are parsed out of the structured note
    // (operational tracking only — no dedicated columns). Raw note always kept.
    sessions: (row.encounters || [])
      .filter((e) => e.encounter_type === 'session')
      .sort((a, b) => (a.sequence_no || 0) - (b.sequence_no || 0))
      .map((e) => {
        const sp = parseSpecialistNote(e.notes)
        return {
          id: e.id,
          sequenceNo: e.sequence_no,
          date: e.check_in_at,
          checkInAt: e.check_in_at,
          checkOutAt: e.check_out_at,
          status: e.status === 'active' ? 'active' : 'closed',
          note: e.notes || '',
          specialistName: sp.name,
          specialty: sp.specialty,
          source: sp.source,        // 'External' | 'Internal' | null (legacy/unstructured)
          visitNote: sp.note,
        }
      }),
    // other runtime fields some pages read — safe empty defaults
    paymentLines: [], excessLines: [], visit: null, admission: null,
    cashPayment: null, mixedCurrency: false, history: [], notes: '',
    source: 'supabase',
  }
}

const CASE_SELECT = `
  id, our_ref, visit_date, visit_time, financial_type, operational_status, encounter_pattern, route,
  treatment_mode, registered_location_id, current_location_id, billing_facility_id, center_room_id,
  hotel_or_location, hotel_room_number, short_clinical_note,
  free_reason, free_approved_by, free_approved_at, free_approval_notes, closed_at, created_at,
  patient:patient_id ( id, first_name, last_name, date_of_birth, gender, nationality, phone_country_code, phone_number, email, postal_code ),
  center_room:center_room_id ( id, room_code, room_name ),
  transfer:portal_transfers ( from_location_id, to_location_id, transfer_status, requested_at, received_at, transfer_note ),
  intake:portal_insurance_intakes ( insurance_reference_number, has_patient_excess, company:insurance_company_id ( name ) ),
  prep:portal_insurance_billing_preparations ( invoice_currency, service_charge_pct, billing_preparation_status,
    local_assistance_company_id, local_assistance_reference_number,
    onedrive_folder_path, missing_data_note, transportation_fee, patient_excess_amount, admin_notes, completed_at ),
  encounters:portal_encounters ( id, sequence_no, encounter_type, check_in_at, check_out_at, status, notes )
`

/** RLS-scoped: returns only the cases the current user may see.
 *  Optional { from, to } (YYYY-MM-DD) filters by visit_date for date-scoped reports. */
export async function fetchCases(opts = {}) {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  let q = db.from('portal_cases').select(CASE_SELECT)
  if (opts.from) q = q.gte('visit_date', opts.from)
  if (opts.to) q = q.lte('visit_date', opts.to)
  q = q.order('visit_date', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return (data || []).map((r) => portalRowToCase(r, maps))
}

async function currentUid(db) {
  const { data } = await db.auth.getUser()
  return data?.user?.id || null
}

/** Insert patient + case from the in-app newCase object. Returns new case id. */
export async function insertCase(newCase) {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const uid = await currentUid(db)
  const pat = newCase.patient || {}
  const first = pat.firstName || (pat.name || '').trim().split(/\s+/)[0] || 'Unknown'
  const last = pat.lastName || (pat.name || '').trim().split(/\s+/).slice(1).join(' ') || first
  const { data: patRow, error: pErr } = await db.from('portal_patients').insert({
    first_name: first, last_name: last,
    date_of_birth: pat.dob || '1990-01-01',
    gender: GENDER_TO_PORTAL[pat.gender] || 'female',
    nationality: pat.nationality || null,
    created_by: uid,
  }).select('id').single()
  if (pErr) throw pErr

  const locId = maps.locIdByCode[newCase.registeredAtId] || null
  const facId = newCase.billingFacility ? (maps.facIdByCode[newCase.billingFacility] || null) : null
  const { data: caseRow, error: cErr } = await db.from('portal_cases').insert({
    our_ref: null, // assigned server-side via portal_assign_our_ref (atomic, collision-free)
    patient_id: patRow.id,
    registered_location_id: locId,
    current_location_id: locId,
    billing_facility_id: facId,
    route: ROUTE_TO_PORTAL[newCase.route] || 'direct',
    financial_type: FINANCIAL_TYPE_TO_PORTAL[newCase.financialType] || 'pending',
    encounter_pattern: ENCOUNTER_PATTERN_TO_PORTAL[newCase.encounterPattern] || 'outpatient_single',
    operational_status: 'open',
    visit_date: (newCase.visitDate || '').slice(0, 10) || null,
    hotel_or_location: pat.hotel || null,
    short_clinical_note: pat.note || null,
    // Free / Complimentary approval (Bundle 1 / Phase E) — reason + approver required by the UI.
    free_reason: newCase.financialType === 'Free / Complimentary' ? (newCase.complimentary?.reason || null) : null,
    free_approved_by: newCase.financialType === 'Free / Complimentary' ? (newCase.complimentary?.approvedBy || null) : null,
    free_approved_at: newCase.financialType === 'Free / Complimentary' ? (newCase.complimentary?.approvedAt || new Date().toISOString()) : null,
    created_by: uid,
  }).select('id').single()
  if (cErr) throw cErr
  const caseId = caseRow.id

  // Server-authoritative OUR Ref (atomic per facility/date counter; collision-free).
  try { await db.rpc('portal_assign_our_ref', { p_case_id: caseId }) }
  catch (e) { console.warn('[portal] our_ref assign failed', e?.message) }

  // Stage-1 insurance intake (clinic-visible) + patient-excess charge.
  if (newCase.financialType === 'Insurance' && facId) {
    const insName = (newCase.insurance?.company || '').trim()
    let companyId = null
    if (insName) {
      const { data: existing } = await db.from('portal_insurance_companies')
        .select('id').ilike('name', insName).maybeSingle()
      if (existing) companyId = existing.id
      else {
        const { data: created } = await db.from('portal_insurance_companies')
          .insert({ name: insName, email: newCase.insurance?.email || null, phone: newCase.insurance?.phone || null, created_by: uid })
          .select('id').single()
        companyId = created?.id || null
      }
    }
    if (companyId) {
      await db.from('portal_insurance_intakes').insert({
        case_id: caseId,
        insurance_company_id: companyId,
        insurance_reference_number: (newCase.insurance?.ref || '').trim() || '(pending)',
        insurance_company_email: newCase.insurance?.email || null,
        insurance_company_phone: newCase.insurance?.phone || null,
        billing_facility_id: facId,
        has_patient_excess: !!newCase.hasPatientExcess,
        created_by: uid,
      })
    }
    if (newCase.hasPatientExcess && Number(newCase.excessAmount) > 0) {
      await db.from('portal_case_charges').insert({
        case_id: caseId, charge_type: 'patient_excess',
        amount: Number(newCase.excessAmount), currency: newCase.excessCurrency || 'EUR', created_by: uid,
      })
    }
  }

  // Cash invoice amount → cash_case_amount charge (powers the invoice-vs-collected
  // warning in the workspace). Additive + best-effort; never blocks intake.
  if (newCase.financialType === 'Cash' && Number(newCase.invoice?.amount) > 0) {
    try {
      await db.from('portal_case_charges').insert({
        case_id: caseId, charge_type: 'cash_case_amount',
        amount: Number(newCase.invoice.amount), currency: newCase.invoice.currency || 'EUR', created_by: uid,
      })
    } catch (e) { console.warn('[portal] cash invoice charge failed', e?.message) }
  }

  // Collections (cash + patient-excess lines) via the secure RPC.
  for (const l of (newCase.paymentLines || [])) {
    try { await recordCollection(db, caseId, l, 'cash_case_payment', locId) }
    // P3J — additive/best-effort (case+charge already saved), but a DEAD SESSION
    // must not silently drop the money: escalate auth errors to a clean re-login.
    catch (e) { console.warn('[portal] collection failed', e?.message); await escalateIfAuthError(e) }
  }
  for (const l of (newCase.excessLines || [])) {
    try { await recordCollection(db, caseId, l, 'patient_excess', locId) }
    catch (e) { console.warn('[portal] excess collection failed', e?.message); await escalateIfAuthError(e) }
  }

  // Transfer record when the case is routed to a destination branch.
  if (newCase.transfer && newCase.transfer.toBranchId) {
    const toLoc = maps.locIdByCode[newCase.transfer.toBranchId] || null
    if (toLoc && locId) {
      await db.from('portal_transfers').insert({
        case_id: caseId, from_location_id: locId, to_location_id: toLoc,
        transfer_status: 'sent', requested_by: uid,
        transfer_note: [newCase.transfer.reason, newCase.transfer.transport, newCase.transfer.referralNote].filter(Boolean).join(' · ') || null,
      })
    }
  }
  return caseId
}

/** Record one collection line via the secure RPC (handles FX + treasury movement).
 *  Cash → original currency / physical_cash; Visa/Card → EGP / visa_bank (FX required). */
export async function recordCollection(db, caseId, line, purpose, locId) {
  const isVisa = /visa|card/i.test(line.method || '')
  const method = isVisa ? 'visa_card' : 'cash'
  const actualCurrency = isVisa ? 'EGP' : (line.currency || 'EUR')
  const invoiceCurrency = isVisa ? (line.fxRefCurrency || line.currency || 'EUR') : (line.currency || 'EUR')
  const foreign = isVisa ? Number(line.fxRefAmount ?? line.amount) : Number(line.amount)
  const fxRate = isVisa
    ? (Number(line.fxRate) || null)
    : (actualCurrency === invoiceCurrency ? null : (Number(line.fxRate) || null))
  if (!foreign || foreign <= 0) return null
  if (isVisa && (!fxRate || fxRate <= 0)) return null   // RPC requires FX for Visa — skip incomplete line
  const { data, error } = await db.rpc('portal_record_collection', {
    p_case_id: caseId, p_collection_purpose: purpose, p_payment_method: method,
    p_invoice_currency: invoiceCurrency, p_foreign_amount_covered: foreign,
    p_actual_currency: actualCurrency, p_fx_rate: fxRate,
    p_collection_location_id: locId, p_charge_id: null,
  })
  if (error) throw error
  return data
}

/** P3J — record ONE real collection against a case from Case Detail (cash or
 *  Visa/Card). Resolves the location CODE → id, then delegates to the same
 *  secure portal_record_collection RPC the intake flow uses (it also writes the
 *  linked treasury movement + FX). Throws on an empty/invalid line so the UI
 *  shows a real error instead of a silent no-op. purpose defaults to
 *  cash_case_payment (powers Collected vs Outstanding on the cash invoice). */
export async function recordCaseCollection(caseId, line, { locationCode = null, purpose = 'cash_case_payment' } = {}) {
  if (!caseId) throw new Error('No case id')
  const db = await getSupabaseClient()
  let locId = null
  if (locationCode) { try { locId = await locationIdForCode(locationCode) } catch { locId = null } }
  const res = await recordCollection(db, caseId, line, purpose, locId)
  if (res === null) throw new Error('Enter a valid collection amount (and an FX rate for Visa / Card).')
  return res
}

/** Record MULTIPLE collection lines from the Full Case Editor. NEW lines only:
 *  a row with no Foreign Amount Covered is a blank row and is skipped — so saving
 *  the editor again WITHOUT adding a line creates NO new collection / treasury rows
 *  (the ledger is append-only; existing collections are shown read-only). A line
 *  that WAS entered but is incomplete (e.g. Visa / Card with no FX rate) throws —
 *  never a silent drop, never fake success. Returns the count actually recorded. */
export async function recordCaseCollections(caseId, lines, { locationCode = null, purpose = 'cash_case_payment' } = {}) {
  if (!caseId) throw new Error('No case id')
  const db = await getSupabaseClient()
  let locId = null
  if (locationCode) { try { locId = await locationIdForCode(locationCode) } catch { locId = null } }
  let recorded = 0
  for (const line of (lines || [])) {
    if (!(Number(line?.fxRefAmount) > 0)) continue   // blank row → skip (new-lines-only)
    const res = await recordCollection(db, caseId, line, purpose, locId)
    if (res === null) throw new Error('A payment line is incomplete — Visa / Card needs an FX rate. Fix or remove it before saving.')
    recorded++
  }
  return recorded
}

/** P3J — ADMIN-ONLY safe delete of a wrong/test case. Calls the SECURITY DEFINER
 *  RPC portal_admin_delete_case (strict portal_is_admin() guard) which removes the
 *  case + ALL operational children in FK-safe order (incl. collections + treasury),
 *  deletes the patient ONLY if orphaned, and writes an audit row. Returns the
 *  deleted-row counts. Throws on failure (never silent; non-admins get PORTAL_DENIED). */
export async function adminDeleteCase(caseId, { deleteOrphanPatient = true } = {}) {
  if (!caseId) throw new Error('No case id')
  const db = await getSupabaseClient()
  const { data, error } = await db.rpc('portal_admin_delete_case', {
    p_case_id: caseId, p_delete_orphan_patient: deleteOrphanPatient,
  })
  if (error) throw error
  return data
}

/* =========================================================================
 * Transfers — receive & classify at the destination branch (Phase 4).
 * supabase mode only. receiveTransfer() flips the transfer + case atomically
 * via the SECURITY DEFINER RPC. classifyReceivedCase() applies the branch's
 * financial/treatment classification and records any REAL collections — it
 * reuses recordCollection() so "receive as Cash" obeys the exact same
 * FX / treasury_channel rules as a direct Cash case (Visa -> EGP visa_bank).
 * ========================================================================= */

const TREATMENT_TO_PORTAL = {
  pending: 'not_determined', not_determined: 'not_determined',
  conservative: 'conservative', surgical: 'surgical',
}

/** Accept an incoming transfer (atomic): transfer -> received; case -> received,
 *  current_location := destination. RLS-scoped to the destination branch. */
export async function receiveTransfer(caseId) {
  const db = await getSupabaseClient()
  const { data, error } = await db.rpc('portal_receive_transfer', { p_case_id: caseId })
  if (error) throw error
  return data
}

/** Classify a just-received case at the destination + record real money lines.
 *  patch: { financialType, billingFacility, treatmentMode, insurance:{company,ref,email,phone},
 *           hasPatientExcess, excessAmount, excessCurrency, excessLines:[], paymentLines:[], roomId }
 *  No fake cash: only the payment/excess lines actually entered are recorded. */
export async function classifyReceivedCase(caseId, patch = {}) {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const uid = await currentUid(db)

  // After receipt the case lives at the destination — collections/rooms use it.
  const { data: caseRow, error: cErr } = await db.from('portal_cases')
    .select('current_location_id').eq('id', caseId).single()
  if (cErr) throw cErr
  const locId = caseRow.current_location_id
  const facId = patch.billingFacility ? (maps.facIdByCode[patch.billingFacility] || null) : null

  // 1) Classification on the same case row (no duplicate case; our_ref unchanged).
  const { error: uErr } = await db.from('portal_cases').update({
    financial_type: FINANCIAL_TYPE_TO_PORTAL[patch.financialType] || 'pending',
    treatment_mode: TREATMENT_TO_PORTAL[patch.treatmentMode] || 'not_determined',
    billing_facility_id: patch.financialType === 'Insurance' ? facId : null,
    updated_at: new Date().toISOString(),
  }).eq('id', caseId)
  if (uErr) throw uErr

  // 2) Insurance intake (only if classified Insurance with insurer details).
  if (patch.financialType === 'Insurance' && facId) {
    const insName = (patch.insurance?.company || '').trim()
    let companyId = null
    if (insName) {
      const { data: existing } = await db.from('portal_insurance_companies').select('id').ilike('name', insName).maybeSingle()
      if (existing) companyId = existing.id
      else {
        const { data: created } = await db.from('portal_insurance_companies')
          .insert({ name: insName, email: patch.insurance?.email || null, phone: patch.insurance?.phone || null, created_by: uid })
          .select('id').single()
        companyId = created?.id || null
      }
    }
    if (companyId) {
      const { data: existingIntake } = await db.from('portal_insurance_intakes').select('id').eq('case_id', caseId).maybeSingle()
      if (!existingIntake) {
        await db.from('portal_insurance_intakes').insert({
          case_id: caseId, insurance_company_id: companyId,
          insurance_reference_number: (patch.insurance?.ref || '').trim() || '(pending)',
          insurance_company_email: patch.insurance?.email || null,
          insurance_company_phone: patch.insurance?.phone || null,
          billing_facility_id: facId, has_patient_excess: !!patch.hasPatientExcess, created_by: uid,
        })
      }
    }
    if (patch.hasPatientExcess && Number(patch.excessAmount) > 0) {
      await db.from('portal_case_charges').insert({
        case_id: caseId, charge_type: 'patient_excess',
        amount: Number(patch.excessAmount), currency: patch.excessCurrency || 'EUR', created_by: uid,
      })
    }
    if (patch.hasPatientExcess) {
      for (const l of (patch.excessLines || [])) {
        try { await recordCollection(db, caseId, l, 'patient_excess', locId) }
        catch (e) { console.warn('[portal] receive excess collection failed', e?.message) }
      }
    }
  }

  // 3) Cash classification -> record each real payment line (same rules as direct intake).
  if (patch.financialType === 'Cash') {
    for (const l of (patch.paymentLines || [])) {
      try { await recordCollection(db, caseId, l, 'cash_case_payment', locId) }
      catch (e) { console.warn('[portal] receive collection failed', e?.message) }
    }
  }

  // 4) Optional Center Room assignment.
  if (patch.roomId) {
    const { data: existingRoom } = await db.from('portal_room_assignments')
      .select('id').eq('case_id', caseId).eq('status', 'occupied').maybeSingle()
    if (!existingRoom) {
      await db.from('portal_cases').update({ center_room_id: patch.roomId }).eq('id', caseId)
      await db.from('portal_room_assignments').insert({ case_id: caseId, room_id: patch.roomId, assigned_by: uid })
    }
  }
  return caseId
}

/* =========================================================================
 * Specialist visits / sessions (Phase 6) — supabase mode only.
 * portal_encounters CUD is RLS-allowed via portal_can_access_case(); inserts go
 * through portal_insert_encounter for ATOMIC per-case sequence_no. Operational
 * tracking only — NO billing/invoice integration. Encounters are children of an
 * existing case, so adding a visit never creates a duplicate patient.
 * ========================================================================= */

/** Parse the structured specialist-visit note back into display/report fields.
 *  Format written by insertEncounter:
 *    "External Specialist Visit — <name> — <specialty> · <free note>"
 *    "Internal Doctor Visit — <name> — <specialty> · <free note>"
 *  Legacy ("Specialist: <name> · <note>") and unstructured text are handled
 *  honestly — free text is surfaced as the note; nothing is fabricated. */
export function parseSpecialistNote(raw) {
  const s = (raw || '').trim()
  if (!s) return { source: null, name: null, specialty: null, note: '' }
  const i = s.indexOf(' · ')
  const head = i >= 0 ? s.slice(0, i) : s
  const note = i >= 0 ? s.slice(i + 3).trim() : ''
  if (/^External Specialist Visit/i.test(head) || /^Internal Doctor Visit/i.test(head)) {
    const source = /^Internal/i.test(head) ? 'Internal' : 'External'
    const parts = head.split(' — ')
    return { source, name: (parts[1] || '').trim() || null, specialty: (parts[2] || '').trim() || null, note }
  }
  if (/^Specialist:/i.test(head)) {
    return { source: 'External', name: head.replace(/^Specialist:\s*/i, '').trim() || null, specialty: null, note }
  }
  return { source: null, name: null, specialty: null, note: s }   // unstructured legacy — honest passthrough
}

/** Add a specialist visit/session to a case. The specialist source (external by
 *  default, or internal duty doctor), name and specialty are encoded into the
 *  encounter note in a structured, parseable, human-readable form (no dedicated
 *  columns — operational tracking only). Returns the new encounter id. */
export async function insertEncounter(caseId, { specialist, specialty, source = 'external', note, checkInAt, checkOutAt, status, encounterType = 'session' } = {}) {
  const db = await getSupabaseClient()
  const kind = source === 'internal' ? 'Internal Doctor Visit' : 'External Specialist Visit'
  const head = [kind, specialist && specialist.trim(), specialty && specialty.trim()].filter(Boolean).join(' — ')
  const combinedNote = [head, note && note.trim()].filter(Boolean).join(' · ') || null
  const { data, error } = await db.rpc('portal_insert_encounter', {
    p_case_id: caseId,
    p_encounter_type: encounterType,
    p_check_in_at: checkInAt || new Date().toISOString(),
    p_check_out_at: checkOutAt || null,
    p_note: combinedNote,
    p_status: status || 'active',
  })
  if (error) throw error
  return data
}

/** Update an encounter (e.g. close: set check_out_at + status). Direct update is
 *  RLS-scoped via portal_can_access_case(case_id). */
export async function updateEncounter(encounterId, { checkOutAt, status, note } = {}) {
  const db = await getSupabaseClient()
  const upd = { updated_at: new Date().toISOString() }
  if (checkOutAt !== undefined) upd.check_out_at = checkOutAt
  if (status !== undefined) upd.status = status
  if (note !== undefined) upd.notes = note
  const { error } = await db.from('portal_encounters').update(upd).eq('id', encounterId)
  if (error) throw error
}

/** RLS-scoped: collections the current user may see (clinic = own location; admin = all).
 *  Enriched for the live Collections list: case OUR Ref + patient name (via the case FK)
 *  and the collector's display name (best-effort — portal_user_profiles is self-readable
 *  for clinic users, all-readable for admin). No FX is invented: cash settles in its own
 *  currency; Visa/Card settles in EGP and carries the stored fx_rate verbatim. */
export async function fetchCollections(opts = {}) {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  let cq = db.from('portal_collections')
    .select(`id, case_id, collection_purpose, payment_method, invoice_currency,
      foreign_amount_covered, actual_currency, fx_rate, actual_collected_amount,
      treasury_channel, status, collection_location_id, collected_by, collected_at,
      caseref:case_id ( our_ref, patient:patient_id ( first_name, last_name ) )`)
    .neq('status', 'cancelled')   // corrected/voided collections never count toward active totals
  if (opts.from) cq = cq.gte('collected_at', `${opts.from}T00:00:00`)
  if (opts.to) cq = cq.lte('collected_at', `${opts.to}T23:59:59.999`)
  cq = cq.order('collected_at', { ascending: false })
  const { data, error } = await cq
  if (error) throw error
  const rows = data || []

  // Best-effort collector-name resolution. RLS returns only the current user's own
  // profile for a clinic user (so other collectors show as a short id), and every
  // profile for an admin. Never blocks the list if it fails.
  let nameByUid = {}
  let myUid = null
  try {
    const { data: au } = await db.auth.getUser()
    myUid = au?.user?.id || null
    const { data: profs } = await db.from('portal_user_profiles').select('user_id, display_name')
    nameByUid = Object.fromEntries((profs || []).map((p) => [p.user_id, p.display_name]))
  } catch { /* names are best-effort only */ }

  return rows.map((c) => {
    const cs = one(c.caseref)
    const pat = cs ? one(cs.patient) : null
    const loc = maps.locById[c.collection_location_id] || {}
    return {
      id: c.id,
      caseId: c.case_id,
      ourRef: cs?.our_ref || null,
      patientName: pat ? [pat.first_name, pat.last_name].filter(Boolean).join(' ') || null : null,
      purpose: c.collection_purpose,
      method: c.payment_method,
      invoiceCurrency: c.invoice_currency,
      foreignAmount: c.foreign_amount_covered,
      actualCurrency: c.actual_currency,
      actualAmount: c.actual_collected_amount,
      fxRate: c.fx_rate,
      treasuryChannel: c.treasury_channel,
      status: c.status,
      locationCode: loc.code || null,
      locationName: loc.name || null,
      collectedBy: c.collected_by,
      collectedByName: nameByUid[c.collected_by] || (c.collected_by && c.collected_by === myUid ? 'You' : null),
      collectedAt: c.collected_at,
    }
  })
}

/** Group collection rows (from fetchCollections) by treasury channel + currency.
 *  No cross-currency conversion — each (channel, currency) is its own bucket, so
 *  physical cash by currency and Visa/bank EGP stay separate (Phase 5 rule). */
export function summarizeCollections(rows = []) {
  const buckets = {}
  for (const c of rows) {
    const channel = c.treasuryChannel || (c.method === 'visa_card' ? 'visa_bank' : 'physical_cash')
    const currency = c.actualCurrency || 'EGP'
    const key = `${channel}|${currency}`
    if (!buckets[key]) buckets[key] = { channel, currency, total: 0, count: 0 }
    buckets[key].total += Number(c.actualAmount) || 0
    buckets[key].count += 1
  }
  return Object.values(buckets).sort((a, b) =>
    a.channel.localeCompare(b.channel) || a.currency.localeCompare(b.currency))
}

/** Group collection rows (from fetchCollections) by collection_purpose AND by
 *  treasury channel, each split by the SETTLED currency. Read-only, no cross-
 *  currency conversion (physical cash keeps its original currency, Visa/Card is
 *  EGP). patient_excess IS included (it is treasury money) but kept in its own
 *  purpose bucket so a dashboard can show Cash-Case Revenue separately from
 *  Insurance Excess (Mohamed's rule). No collection status is mutated. */
export function summarizeCollectionsByPurpose(rows = []) {
  const purpose = {}   // purpose -> { [currency]: { total, count } }
  const channel = {}   // channel -> { [currency]: { total, count } }
  const add = (bag, key, cur, amt) => {
    bag[key] = bag[key] || {}
    bag[key][cur] = bag[key][cur] || { total: 0, count: 0 }
    bag[key][cur].total += amt
    bag[key][cur].count += 1
  }
  for (const c of rows) {
    const cur = c.actualCurrency || 'EGP'
    const amt = Number(c.actualAmount) || 0
    const p = c.purpose || 'other'
    const ch = c.treasuryChannel || (c.method === 'visa_card' ? 'visa_bank' : 'physical_cash')
    add(purpose, p, cur, amt)
    add(channel, ch, cur, amt)
  }
  return { purpose, channel, count: rows.length }
}

/** Admin-only (RLS). Upsert billing preparation for a case. */
export async function upsertBillingPrep(caseId, fields) {
  const db = await getSupabaseClient()
  const uid = await currentUid(db)
  const row = {
    ...billingPrepToRow(caseId, fields, { localAssistanceCompanyId: fields.localAssistanceId || null }),
    completed_by: uid,
    completed_at: new Date().toISOString(),
  }
  const { error } = await db.from('portal_insurance_billing_preparations').upsert(row, { onConflict: 'case_id' })
  if (error) throw error
  return caseId
}

/* =========================================================================
 * Attendance (P3B / Task #9) — supabase mode only.
 * Reads are RLS-scoped (clinic = own location; admin = all). Writes go
 * through the verified SECURITY DEFINER RPCs, which enforce that the caller
 * has scope on the location AND the staff is an active nurse/doctor assigned
 * to that location.
 * ========================================================================= */

/** uuid of a location CODE (e.g. 'tropitel'), or null. */
export async function locationIdForCode(code) {
  if (!code) return null
  const maps = await loadRefMaps()
  return maps.locIdByCode[code] || null
}

/** RLS-scoped nurse shifts + doctor duties, optionally for one work date (YYYY-MM-DD). */
export async function fetchAttendance(workDateYmd = null) {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  let shiftsQ = db.from('portal_nurse_shifts')
    .select('id, location_id, staff_id, work_date, shift_start_at, shift_end_at, worked_minutes, status, recorded_by, staff:staff_id ( full_name )')
    .order('shift_start_at', { ascending: false })
  let dutiesQ = db.from('portal_doctor_daily_duty')
    .select('id, location_id, staff_id, work_date, note, recorded_by, staff:staff_id ( full_name )')
    .order('work_date', { ascending: false })
  if (workDateYmd) { shiftsQ = shiftsQ.eq('work_date', workDateYmd); dutiesQ = dutiesQ.eq('work_date', workDateYmd) }
  const [{ data: sh, error: e1 }, { data: du, error: e2 }] = await Promise.all([shiftsQ, dutiesQ])
  if (e1) throw e1
  if (e2) throw e2
  const loc = (id) => maps.locById[id] || {}
  // Resolve the recording user's display name (attribution). Best-effort: an
  // admin can read every profile; a clinic user resolves at least their own.
  let nameByUid = {}
  try {
    const { data: profs } = await db.from('portal_user_profiles').select('user_id, display_name')
    nameByUid = Object.fromEntries((profs || []).map((p) => [p.user_id, p.display_name]))
  } catch { /* recorder names are best-effort only */ }
  return {
    shifts: (sh || []).map((s) => ({
      id: s.id,
      locationCode: loc(s.location_id).code || null,
      locationName: loc(s.location_id).name || null,
      staffId: s.staff_id,
      staffName: one(s.staff)?.full_name || null,
      workDate: s.work_date,
      startAt: s.shift_start_at,
      endAt: s.shift_end_at,
      workedMinutes: s.worked_minutes,
      status: s.status,
      recordedBy: s.recorded_by,
      recordedByName: nameByUid[s.recorded_by] || null,
    })),
    duties: (du || []).map((d) => ({
      id: d.id,
      locationCode: loc(d.location_id).code || null,
      locationName: loc(d.location_id).name || null,
      staffId: d.staff_id,
      staffName: one(d.staff)?.full_name || null,
      workDate: d.work_date,
      note: d.note,
      recordedBy: d.recorded_by,
      recordedByName: nameByUid[d.recorded_by] || null,
    })),
  }
}

/** RLS-scoped active staff↔location assignments (own clinic; admin = all).
 *  Feeds the nurse/doctor pickers — only staff valid for the RPC appear. */
export async function fetchAssignableStaff() {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const { data, error } = await db.from('portal_staff_location_assignments')
    .select('assignment_role, active, location_id, staff:staff_id ( id, full_name, staff_role, specialty, active )')
    .eq('active', true)
  if (error) throw error
  return (data || [])
    .map((a) => {
      const st = one(a.staff) || {}
      return {
        staffId: st.id,
        name: st.full_name,
        role: a.assignment_role,            // 'nurse' | 'doctor'
        specialty: st.specialty || null,
        staffActive: st.active !== false,
        locationId: a.location_id,
        locationCode: maps.locById[a.location_id]?.code || null,
        locationName: maps.locById[a.location_id]?.name || null,
      }
    })
    .filter((a) => a.staffId && a.staffActive)
}

/** Start a nurse shift (RPC validates scope + nurse assignment). Returns shift id. */
export async function recordNurseShift(locationId, staffId, workDateYmd) {
  const db = await getSupabaseClient()
  const { data, error } = await db.rpc('portal_record_nurse_shift', {
    p_location_id: locationId, p_staff_id: staffId, p_work_date: workDateYmd,
  })
  if (error) throw error
  return data
}

/** End an active nurse shift (RPC validates location scope). */
export async function endNurseShift(shiftId) {
  const db = await getSupabaseClient()
  const { error } = await db.rpc('portal_end_nurse_shift', { p_shift_id: shiftId })
  if (error) throw error
}

/** Record the doctor on duty for a date (RPC validates scope + doctor assignment;
 *  upserts on location+date+staff). Returns duty id. */
export async function recordDoctorDuty(locationId, staffId, workDateYmd, note = null) {
  const db = await getSupabaseClient()
  const { data, error } = await db.rpc('portal_record_doctor_duty', {
    p_location_id: locationId, p_staff_id: staffId, p_work_date: workDateYmd, p_note: note,
  })
  if (error) throw error
  return data
}

/* =========================================================================
 * Admin configuration (config-first staging) — supabase mode only.
 * All writes are gated by the existing admin RLS (portal_is_admin()).
 * NO auth-user / password handling here (creating logins needs a server-side
 * function with the service-role key — intentionally out of the client).
 * ========================================================================= */

/** All locations (for pickers). */
export async function fetchLocations() {
  const db = await getSupabaseClient()
  const { data, error } = await db.from('portal_locations')
    .select('id, code, name, location_type, active').order('location_type').order('name')
  if (error) throw error
  return (data || []).map((l) => ({ id: l.id, code: l.code, name: l.name, type: l.location_type, active: l.active }))
}

// ---- Rooms (portal_rooms) ----
export async function fetchRooms() {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const { data, error } = await db.from('portal_rooms')
    .select('id, location_id, room_code, room_name, sort_order, active')
    .order('location_id').order('sort_order', { nullsFirst: true }).order('room_code')
  if (error) throw error
  return (data || []).map((r) => ({
    id: r.id, locationId: r.location_id,
    locationCode: maps.locById[r.location_id]?.code || null,
    locationName: maps.locById[r.location_id]?.name || null,
    roomCode: r.room_code, roomName: r.room_name, sortOrder: r.sort_order, active: r.active,
  }))
}
export async function upsertRoom(room) {
  const db = await getSupabaseClient()
  const row = {
    location_id: room.locationId, room_code: room.roomCode, room_name: room.roomName,
    sort_order: room.sortOrder ?? null, active: room.active ?? true,
  }
  if (room.id) {
    const { error } = await db.from('portal_rooms').update(row).eq('id', room.id)
    if (error) throw error
    return room.id
  }
  const { data, error } = await db.from('portal_rooms').insert(row).select('id').single()
  if (error) throw error
  return data.id
}
export async function setRoomActive(id, active) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_rooms').update({ active }).eq('id', id)
  if (error) throw error
}

// ---- Payment methods (portal_payment_methods) ----
export async function fetchPaymentMethods({ activeOnly = false } = {}) {
  const db = await getSupabaseClient()
  let q = db.from('portal_payment_methods').select('code, label, kind, settlement_note, active, sort_order').order('sort_order')
  if (activeOnly) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return data || []
}
export async function setPaymentMethodActive(code, active) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_payment_methods').update({ active, updated_at: new Date().toISOString() }).eq('code', code)
  if (error) throw error
}

// ---- Nationalities (portal_nationalities) ----
export async function fetchNationalities({ activeOnly = true } = {}) {
  const db = await getSupabaseClient()
  let q = db.from('portal_nationalities').select('id, name_en, flag, phone_code, active').order('name_en')
  if (activeOnly) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return data || []
}
export async function setNationalityActive(id, active) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_nationalities').update({ active }).eq('id', id)
  if (error) throw error
}

// ---- Users + location scopes (portal_user_profiles / portal_user_location_scopes) ----
export async function fetchAdminUsers() {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const [{ data: profs, error: e1 }, { data: scopes, error: e2 }] = await Promise.all([
    db.from('portal_user_profiles').select('user_id, display_name, role, active, linked_staff_id'),
    db.from('portal_user_location_scopes').select('id, user_id, location_id, active'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const byUser = {}
  for (const s of (scopes || [])) (byUser[s.user_id] ||= []).push(s)
  return (profs || []).map((u) => ({
    userId: u.user_id, displayName: u.display_name, role: u.role, active: u.active, linkedStaffId: u.linked_staff_id,
    scopes: (byUser[u.user_id] || []).filter((s) => s.active).map((s) => ({
      id: s.id, locationId: s.location_id,
      locationCode: maps.locById[s.location_id]?.code || null,
      locationName: maps.locById[s.location_id]?.name || null,
    })),
  })).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
}
export async function grantUserScope(userId, locationId) {
  const db = await getSupabaseClient()
  const { data: existing } = await db.from('portal_user_location_scopes')
    .select('id, active').eq('user_id', userId).eq('location_id', locationId).maybeSingle()
  if (existing) {
    if (!existing.active) {
      const { error } = await db.from('portal_user_location_scopes').update({ active: true }).eq('id', existing.id)
      if (error) throw error
    }
    return existing.id
  }
  const { data, error } = await db.from('portal_user_location_scopes')
    .insert({ user_id: userId, location_id: locationId, active: true }).select('id').single()
  if (error) throw error
  return data.id
}
export async function revokeUserScope(scopeId) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_user_location_scopes').update({ active: false }).eq('id', scopeId)
  if (error) throw error
}

// ---- Staff + clinic assignments (portal_staff / portal_staff_location_assignments) ----
export async function fetchAdminStaff() {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const [{ data: staff, error: e1 }, { data: asg, error: e2 }] = await Promise.all([
    db.from('portal_staff').select('id, staff_code, full_name, staff_role, specialty, phone, active'),
    db.from('portal_staff_location_assignments').select('id, staff_id, location_id, assignment_role, active'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const byStaff = {}
  for (const a of (asg || [])) (byStaff[a.staff_id] ||= []).push(a)
  return (staff || []).map((s) => ({
    id: s.id, staffCode: s.staff_code, fullName: s.full_name, role: s.staff_role, specialty: s.specialty || null, phone: s.phone, active: s.active,
    assignments: (byStaff[s.id] || []).filter((a) => a.active).map((a) => ({
      id: a.id, locationId: a.location_id, role: a.assignment_role,
      locationCode: maps.locById[a.location_id]?.code || null,
      locationName: maps.locById[a.location_id]?.name || null,
    })),
  })).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
}
export async function upsertStaff(staff) {
  const db = await getSupabaseClient()
  if (staff.id) {
    const { error } = await db.from('portal_staff').update({
      full_name: staff.fullName, staff_role: staff.role,
      specialty: staff.role === 'doctor' ? (staff.specialty || null) : null,
      phone: staff.phone || null, active: staff.active ?? true,
    }).eq('id', staff.id)
    if (error) throw error
    return staff.id
  }
  const code = staff.staffCode || ('STF-' + String(staff.role || 'oth').slice(0, 3).toUpperCase() + '-' + Date.now().toString(36).slice(-5).toUpperCase())
  const { data, error } = await db.from('portal_staff').insert({
    staff_code: code, full_name: staff.fullName, staff_role: staff.role,
    specialty: staff.role === 'doctor' ? (staff.specialty || null) : null,
    phone: staff.phone || null, active: staff.active ?? true,
  }).select('id').single()
  if (error) throw error
  return data.id
}
export async function assignStaffToClinic(staffId, locationId, assignmentRole) {
  const db = await getSupabaseClient()
  const { data: existing } = await db.from('portal_staff_location_assignments')
    .select('id, active').eq('staff_id', staffId).eq('location_id', locationId).eq('assignment_role', assignmentRole).maybeSingle()
  if (existing) {
    if (!existing.active) {
      const { error } = await db.from('portal_staff_location_assignments').update({ active: true }).eq('id', existing.id)
      if (error) throw error
    }
    return existing.id
  }
  const uid = await currentUid(db)
  const { data, error } = await db.from('portal_staff_location_assignments')
    .insert({ staff_id: staffId, location_id: locationId, assignment_role: assignmentRole, active: true, created_by: uid })
    .select('id').single()
  if (error) throw error
  return data.id
}
export async function unassignStaff(assignmentId) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_staff_location_assignments').update({ active: false }).eq('id', assignmentId)
  if (error) throw error
}

/* =========================================================================
 * Portal user administration (Sprint 1) — supabase mode only.
 * These call the admin-users Edge Function (service-role, server-side). The
 * function re-verifies the caller is an admin; nothing privileged runs in the
 * client and no service-role key is present here. Each returns
 * { ok, error?, ... } (link actions also return { action_link, email_otp }).
 * ========================================================================= */

/** Create a real login user: auth user + profile + scopes + optional staff link.
 *  payload: { email, display_name, role, active, scope_location_codes:[], linked_staff_id? }
 *  Returns { ok, user_id?, action_link?, email_otp?, error? }. The link/otp are a
 *  one-time set-password handle to give the new user. */
export async function createPortalUser(payload) {
  return sbAdminUsers('create_user', payload)
}
/** Enable/disable a login (profile.active + auth ban). History is preserved. */
export async function setUserActive(userId, active) {
  return sbAdminUsers('set_active', { user_id: userId, active })
}
/** Change a login's portal role. */
export async function setUserRole(userId, role) {
  return sbAdminUsers('set_role', { user_id: userId, role })
}
/** Link (or unlink with null) a login to a portal_staff record. */
export async function linkUserStaff(userId, linkedStaffId) {
  return sbAdminUsers('link_staff', { user_id: userId, linked_staff_id: linkedStaffId || null })
}
/** Generate a one-time set-password link/OTP for an existing user (admin only). */
export async function generateSetPasswordLink({ userId, email, redirectTo }) {
  return sbAdminUsers('generate_set_password_link', { user_id: userId, email, redirectTo })
}

/* =========================================================================
 * Active Case Workspace — case lifecycle (Phases 1–5) — supabase mode only.
 * -----------------------------------------------------------------------
 * Existing-schema only. All writes are RLS-scoped via portal_can_access_case()
 * / portal_cases_upd / portal_patients_upd / portal_room_assign_cud /
 * portal_charges_cud (verified in migrations 009 + 011). No DDL, no new RPC.
 * Discharge is sequenced (encounters → room → case-close last) so a mid-step
 * failure never leaves a "closed but still-occupied" room.
 * ========================================================================= */

/** Edit missing patient contact details on an active case (phone / email / postal). */
export async function updatePatientContact(patientId, fields = {}) {
  if (!patientId) throw new Error('No patient id')
  const db = await getSupabaseClient()
  const upd = { updated_at: new Date().toISOString() }
  if (fields.phoneCode !== undefined) upd.phone_country_code = fields.phoneCode || null
  if (fields.phone !== undefined) upd.phone_number = fields.phone || null
  if (fields.email !== undefined) upd.email = fields.email || null
  if (fields.postal !== undefined) upd.postal_code = fields.postal || null
  const { error } = await db.from('portal_patients').update(upd).eq('id', patientId)
  if (error) throw error
}

/** Edit case-level fields on an active case (hotel / hotel room / clinical note). */
export async function updateCaseFields(caseId, fields = {}) {
  if (!caseId) throw new Error('No case id')
  const db = await getSupabaseClient()
  const upd = { updated_at: new Date().toISOString() }
  if (fields.hotel !== undefined) upd.hotel_or_location = fields.hotel || null
  if (fields.hotelRoom !== undefined) upd.hotel_room_number = fields.hotelRoom || null
  if (fields.note !== undefined) upd.short_clinical_note = fields.note || null
  const { error } = await db.from('portal_cases').update(upd).eq('id', caseId)
  if (error) throw error
}

/** P3G — Full registration edit for an OPEN case. Reuses the original registration
 *  form (edit mode). Updates the SAME patient + case rows in place — it NEVER
 *  creates a new patient/case, NEVER changes our_ref, NEVER touches center_room_id /
 *  operational_status / closed_at / registered_location_id (so room assignment,
 *  discharge state and case identity are preserved). Money lines (collections /
 *  treasury / charges) are NOT mutated here — those keep their own flows. Runs on
 *  the caller's session, so the existing portal_patients_upd / portal_cases_upd RLS
 *  (case-access scoped) authorizes it; no RLS/auth change.
 *
 *  patch: { patient:{firstName,lastName,dob,gender,nationality,phoneCode,phone,email,postal,hotel,hotelRoom,note},
 *           route, financialType, billingFacility, encounterPattern, visitDate, visitTime,
 *           insurance:{company,ref,email,phone}, hasPatientExcess } */
export async function updateCaseRegistration(caseId, patientId, patch = {}) {
  if (!caseId) throw new Error('No case id')
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const uid = await currentUid(db)
  const now = new Date().toISOString()
  const p = patch.patient || {}

  // 1) Patient (PHI) — same row, no new patient created.
  if (patientId) {
    const pUpd = { updated_at: now }
    if (p.firstName !== undefined || p.lastName !== undefined) {
      const first = (p.firstName || '').trim() || 'Unknown'
      pUpd.first_name = first
      pUpd.last_name = (p.lastName || '').trim() || first
    }
    if (p.dob !== undefined) pUpd.date_of_birth = p.dob || null
    if (p.gender !== undefined) pUpd.gender = GENDER_TO_PORTAL[p.gender] || 'female'
    if (p.nationality !== undefined) pUpd.nationality = p.nationality || null
    if (p.phoneCode !== undefined) pUpd.phone_country_code = p.phoneCode || null
    if (p.phone !== undefined) pUpd.phone_number = p.phone || null
    if (p.email !== undefined) pUpd.email = p.email || null
    if (p.postal !== undefined) pUpd.postal_code = p.postal || null
    const { error } = await db.from('portal_patients').update(pUpd).eq('id', patientId)
    if (error) throw error
  }

  // 2) Case — registration fields only. NEVER our_ref / room / status / closed_at / location.
  const cUpd = { updated_at: now }
  if (patch.route !== undefined) cUpd.route = ROUTE_TO_PORTAL[patch.route] || 'direct'
  if (patch.financialType !== undefined) {
    cUpd.financial_type = FINANCIAL_TYPE_TO_PORTAL[patch.financialType] || 'pending'
    cUpd.billing_facility_id = patch.financialType === 'Insurance'
      ? (maps.facIdByCode[patch.billingFacility] || null) : null
    // Free / Complimentary reason + approver — now persisted on EDIT too (was
    // create-only, so editing a Free case silently lost the reason/approver).
    if (patch.financialType === 'Free / Complimentary') {
      cUpd.free_reason = patch.complimentary?.reason || null
      cUpd.free_approved_by = patch.complimentary?.approvedBy || null
      cUpd.free_approved_at = patch.complimentary?.approvedAt || now
    } else {
      cUpd.free_reason = null
      cUpd.free_approved_by = null
      cUpd.free_approved_at = null
    }
  }
  if (patch.encounterPattern !== undefined) cUpd.encounter_pattern = ENCOUNTER_PATTERN_TO_PORTAL[patch.encounterPattern] || 'outpatient_single'
  if (patch.visitDate !== undefined) cUpd.visit_date = String(patch.visitDate).slice(0, 10) || null
  if (patch.visitTime !== undefined) cUpd.visit_time = patch.visitTime || null
  if (p.hotel !== undefined) cUpd.hotel_or_location = p.hotel || null
  if (p.hotelRoom !== undefined) cUpd.hotel_room_number = p.hotelRoom || null
  if (p.note !== undefined) cUpd.short_clinical_note = p.note || null
  const { error: cErr } = await db.from('portal_cases').update(cUpd).eq('id', caseId)
  if (cErr) throw cErr

  // 3) Insurance intake — best-effort upsert when classified Insurance. Never blocks
  //    the save (case + patient already persisted); reports via console if RLS denies.
  if (patch.financialType === 'Insurance' && patch.billingFacility) {
    try {
      const facId = maps.facIdByCode[patch.billingFacility] || null
      const insName = (patch.insurance?.company || '').trim()
      let companyId = null
      if (insName) {
        const { data: existingCo } = await db.from('portal_insurance_companies').select('id').ilike('name', insName).maybeSingle()
        if (existingCo) companyId = existingCo.id
        else {
          const { data: created } = await db.from('portal_insurance_companies')
            .insert({ name: insName, email: patch.insurance?.email || null, phone: patch.insurance?.phone || null, created_by: uid })
            .select('id').single()
          companyId = created?.id || null
        }
      }
      const { data: existingIntake } = await db.from('portal_insurance_intakes').select('id').eq('case_id', caseId).maybeSingle()
      if (existingIntake) {
        const iUpd = {
          insurance_reference_number: (patch.insurance?.ref || '').trim() || '(pending)',
          insurance_company_email: patch.insurance?.email || null,
          insurance_company_phone: patch.insurance?.phone || null,
          billing_facility_id: facId, has_patient_excess: !!patch.hasPatientExcess, updated_at: now,
        }
        if (companyId) iUpd.insurance_company_id = companyId
        await db.from('portal_insurance_intakes').update(iUpd).eq('id', existingIntake.id)
      } else if (companyId) {
        await db.from('portal_insurance_intakes').insert({
          case_id: caseId, insurance_company_id: companyId,
          insurance_reference_number: (patch.insurance?.ref || '').trim() || '(pending)',
          insurance_company_email: patch.insurance?.email || null,
          insurance_company_phone: patch.insurance?.phone || null,
          billing_facility_id: facId, has_patient_excess: !!patch.hasPatientExcess, created_by: uid,
        })
      }
    } catch (e) { console.warn('[portal] intake update skipped (case+patient saved):', e?.message) }
  }
  return caseId
}

/** Active rooms for a branch location CODE (e.g. 'al_kawther'). Empty for
 *  external clinics (no room board). RLS: portal_rooms readable by active users. */
export async function fetchRoomsForLocation(locationCode) {
  if (!locationCode) return []
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const locId = maps.locIdByCode[locationCode]
  if (!locId) return []
  const { data, error } = await db.from('portal_rooms')
    .select('id, room_code, room_name, sort_order, active')
    .eq('location_id', locId).eq('active', true)
    .order('sort_order', { nullsFirst: false }).order('room_code')
  if (error) throw error
  return (data || []).map((r) => ({
    id: r.id, roomCode: r.room_code, roomName: r.room_name, sortOrder: r.sort_order, active: r.active,
  }))
}

/** Assign (or CHANGE) the Center Room for a case. If the case already occupies a
 *  different room, that assignment is released first (old room frees, new occupies).
 *  RLS: portal_room_assign_cud + portal_cases_upd (both case-access scoped). */
export async function assignRoom(caseId, roomId) {
  if (!caseId || !roomId) throw new Error('Case and room are required')
  const db = await getSupabaseClient()
  const uid = await currentUid(db)
  const now = new Date().toISOString()
  const { data: existing } = await db.from('portal_room_assignments')
    .select('id, room_id').eq('case_id', caseId).eq('status', 'occupied').maybeSingle()
  if (existing) {
    if (existing.room_id === roomId) return caseId   // already in this room — no-op
    const { error: relErr } = await db.from('portal_room_assignments')
      .update({ released_at: now, released_by: uid, status: 'released' }).eq('id', existing.id)
    if (relErr) throw relErr
  }
  const { error: insErr } = await db.from('portal_room_assignments')
    .insert({ case_id: caseId, room_id: roomId, assigned_by: uid })
  if (insErr) throw insErr
  const { error: upErr } = await db.from('portal_cases')
    .update({ center_room_id: roomId, updated_at: now }).eq('id', caseId)
  if (upErr) throw upErr
  return caseId
}

/** Release the case's active room assignment and clear center_room_id. */
export async function releaseRoom(caseId) {
  if (!caseId) return
  const db = await getSupabaseClient()
  const uid = await currentUid(db)
  const now = new Date().toISOString()
  const { data: asg } = await db.from('portal_room_assignments')
    .select('id').eq('case_id', caseId).eq('status', 'occupied').maybeSingle()
  if (asg) {
    const { error } = await db.from('portal_room_assignments')
      .update({ released_at: now, released_by: uid, status: 'released' }).eq('id', asg.id)
    if (error) throw error
  }
  const { error: upErr } = await db.from('portal_cases')
    .update({ center_room_id: null, updated_at: now }).eq('id', caseId)
  if (upErr) throw upErr
}

/** Discharge / End Visit a case. ATOMIC via portal_discharge_case RPC (migration
 *  029): one transaction closes active encounters + releases the room + closes the
 *  case. Saves the discharge date+time as portal_cases.closed_at. */
export async function dischargeCase(caseId, { checkOutAt, sessionIds = [] } = {}) {
  if (!caseId) throw new Error('No case id')
  const db = await getSupabaseClient()
  const when = checkOutAt || new Date().toISOString()
  // Atomic discharge (Bundle 1 / Phase G, migration 029): one transaction closes
  // all active encounters + releases the active room + closes the case. No partial
  // "closed but still-occupied" state. The RPC ignores sessionIds (it closes ALL
  // active encounters for the case) — kept in the signature for call-site compatibility.
  const { error } = await db.rpc('portal_discharge_case', {
    p_case_id: caseId, p_encounter_id: null, p_checkout_at: when,
  })
  if (error) throw error   // surfaced by the workspace; never fake success
  return caseId
}

/** Case charges + collections (RLS case-scoped) → cash invoice-vs-collected.
 *  A real recorded payment is NEVER dropped just because it settled in a currency
 *  other than the invoice: `collectedByCurrency` sums every cash_case_payment by the
 *  currency that actually hit the till (actual_currency). `collected`/`remaining`
 *  stay invoice-currency (same-currency reconciliation only — no invented FX); when
 *  money was collected only in another currency, `crossCurrency` is true so the UI
 *  shows "collected 17,568.20 EGP; invoice EUR — verify FX" instead of "collected 0". */
export async function fetchCaseFinancials(caseId) {
  const db = await getSupabaseClient()
  const [{ data: charges, error: e1 }, { data: cols, error: e2 }] = await Promise.all([
    db.from('portal_case_charges').select('id, charge_type, amount, currency, status').eq('case_id', caseId),
    db.from('portal_collections')
      .select('id, collection_purpose, payment_method, invoice_currency, foreign_amount_covered, actual_currency, actual_collected_amount, fx_rate, treasury_channel, status, collected_by, collected_at')
      .eq('case_id', caseId),
  ])
  if (e1) throw e1
  if (e2) throw e2

  // Best-effort collector-name resolution (admin reads all profiles; a clinic user
  // resolves at least their own). Never blocks the financial read.
  let collectorNames = {}
  try {
    const { data: au } = await db.auth.getUser()
    const myUid = au?.user?.id || null
    const { data: profs } = await db.from('portal_user_profiles').select('user_id, display_name')
    collectorNames = Object.fromEntries((profs || []).map((p) => [p.user_id, p.display_name]))
    if (myUid && !collectorNames[myUid]) collectorNames[myUid] = 'You'
  } catch { /* names are best-effort only */ }

  // Active vs corrected/voided. ACTIVE drives every money figure; CANCELLED rows are
  // kept only for the admin-only "Corrected history" block — never counted.
  const active = (cols || []).filter((c) => c.status !== 'cancelled')
  const cancelledCollections = (cols || []).filter((c) => c.status === 'cancelled')

  const cashCharge = (charges || []).find((c) => c.charge_type === 'cash_case_amount')
  let cashOutstanding = null
  if (cashCharge) {
    const cashCols = active.filter((c) => c.collection_purpose === 'cash_case_payment')
    const collectedByCurrency = {}
    for (const c of cashCols) {
      const cur = c.actual_currency || c.invoice_currency || cashCharge.currency
      collectedByCurrency[cur] = (collectedByCurrency[cur] || 0) + (Number(c.actual_collected_amount ?? c.foreign_amount_covered) || 0)
    }
    const invoice = Number(cashCharge.amount) || 0
    const collected = Number(collectedByCurrency[cashCharge.currency] || 0)   // same-currency only
    const otherCurrencies = Object.keys(collectedByCurrency).filter((cur) => cur !== cashCharge.currency)
    cashOutstanding = {
      currency: cashCharge.currency, invoice, collected,
      remaining: Number((invoice - collected).toFixed(2)),
      collectedByCurrency,
      hasAnyCollection: cashCols.length > 0,
      crossCurrency: collected <= 0 && otherCurrencies.length > 0,   // paid only in a non-invoice currency
      otherCurrencies,
    }
  }
  return { charges: charges || [], collections: active, cancelledCollections, cashOutstanding, collectorNames }
}

/** Pilot Supervision — BULK financial summary for every case the user may see,
 *  in ONE pair of RLS-scoped reads (no per-case round trips). Powers the
 *  case-list warning chips + Admin review queues. RLS does the scoping:
 *  portal_case_charges SELECT = portal_can_access_case(case_id); portal_collections
 *  SELECT = admin OR has_location OR can_access_case — so a clinic user only ever
 *  gets their own cases' rows, an admin gets all. Collections are matched to the
 *  charge's invoice currency (same convention as fetchCaseFinancials). Returns
 *  { [caseId]: { cashInvoice, cashCurrency, cashCollected, excessExpected,
 *                excessCurrency, excessCollected } }. */
export async function fetchCaseFinancialIndex() {
  const db = await getSupabaseClient()
  const [{ data: charges, error: e1 }, { data: cols, error: e2 }] = await Promise.all([
    db.from('portal_case_charges').select('case_id, charge_type, amount, currency'),
    db.from('portal_collections').select('case_id, collection_purpose, invoice_currency, foreign_amount_covered, actual_currency, actual_collected_amount').neq('status', 'cancelled'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const byCase = {}
  const ensure = (id) => (byCase[id] ||= {
    cashInvoice: null, cashCurrency: null, cashCollected: 0,
    excessExpected: null, excessCurrency: null, excessCollected: 0,
    _cashCol: {}, _exCol: {},
  })
  for (const ch of (charges || [])) {
    const e = ensure(ch.case_id)
    if (ch.charge_type === 'cash_case_amount') { e.cashInvoice = Number(ch.amount); e.cashCurrency = ch.currency }
    else if (ch.charge_type === 'patient_excess') { e.excessExpected = Number(ch.amount); e.excessCurrency = ch.currency }
  }
  // Bucket by SETTLEMENT currency (actual_currency) — never silently drop a real
  // payment recorded in a currency other than the invoice.
  for (const col of (cols || [])) {
    const e = ensure(col.case_id)
    const amt = Number(col.actual_collected_amount ?? col.foreign_amount_covered) || 0
    const cur = col.actual_currency || col.invoice_currency || ''
    if (col.collection_purpose === 'cash_case_payment') e._cashCol[cur] = (e._cashCol[cur] || 0) + amt
    else if (col.collection_purpose === 'patient_excess') e._exCol[cur] = (e._exCol[cur] || 0) + amt
  }
  for (const id of Object.keys(byCase)) {
    const e = byCase[id]
    // same-currency collected (for outstanding) + full per-currency map + flags
    e.cashCollectedByCurrency = { ...e._cashCol }
    e.excessCollectedByCurrency = { ...e._exCol }
    e.cashCollected = Number(e.cashCurrency ? (e._cashCol[e.cashCurrency] || 0) : 0)
    e.excessCollected = Number(e.excessCurrency ? (e._exCol[e.excessCurrency] || 0) : 0)
    e.cashHasAnyCollection = Object.keys(e._cashCol).length > 0
    e.excessHasAnyCollection = Object.keys(e._exCol).length > 0
    e.cashCrossCurrency = e.cashHasAnyCollection && !(e.cashCollected > 0)
    e.excessCrossCurrency = e.excessHasAnyCollection && !(e.excessCollected > 0)
    delete e._cashCol; delete e._exCol
  }
  return byCase
}

/** ADMIN-ONLY safe correction of a wrong/misclassified collection (migration 032).
 *  Calls the atomic SECURITY DEFINER RPC portal_admin_correct_collection, which
 *  reverses the old treasury movement(s), marks the old collection 'cancelled',
 *  inserts the corrected collection + its movement, and writes a before/after audit
 *  — all in one transaction. SETTLED-AMOUNT-CENTRIC: the real paid amount is
 *  preserved (no FX re-conversion) unless the admin enters a different amount. The
 *  frontend NEVER touches treasury rows directly. Throws on any rule/denied/config
 *  error (never a silent partial). patch: { method:'cash'|'visa_card', amount?,
 *  currency?, fxRate? }. */
export async function correctCollection(collectionId, patch = {}, reason) {
  if (!collectionId) throw new Error('No collection id')
  if (!reason || !String(reason).trim()) throw new Error('A correction reason is required.')
  const db = await getSupabaseClient()
  const method = /visa|card/i.test(patch.method || '') ? 'visa_card' : 'cash'
  const { data, error } = await db.rpc('portal_admin_correct_collection', {
    p_collection_id: collectionId,
    p_new_payment_method: method,
    p_new_actual_amount: (patch.amount != null && patch.amount !== '') ? Number(patch.amount) : null,
    p_new_actual_currency: patch.currency || null,
    p_new_fx_rate: (patch.fxRate != null && patch.fxRate !== '') ? Number(patch.fxRate) : null,
    p_reason: String(reason).trim(),
  })
  if (error) throw error
  return data
}

/** P3H — Room stay history for a case (READ-ONLY display in Case Detail). Every
 *  room assignment with entry (assigned_at) + exit (released_at) + status. No
 *  mutation; RLS: portal_room_assignments readable for accessible cases. */
export async function fetchRoomStayHistory(caseId) {
  if (!caseId) return []
  const db = await getSupabaseClient()
  const { data, error } = await db.from('portal_room_assignments')
    .select('id, room_id, assigned_at, released_at, status, room:room_id ( room_code, room_name )')
    .eq('case_id', caseId).order('assigned_at', { ascending: true })
  if (error) throw error
  return (data || []).map((r) => {
    const rm = one(r.room) || {}
    return {
      id: r.id, roomCode: rm.room_code || null, roomName: rm.room_name || null,
      assignedAt: r.assigned_at, releasedAt: r.released_at, status: r.status,
    }
  })
}

/** Set / update the Cash invoice amount as a portal_case_charges row
 *  (charge_type='cash_case_amount'). Powers the invoice-vs-collected warning. */
export async function upsertCashInvoiceCharge(caseId, amount, currency = 'EUR') {
  if (!caseId) throw new Error('No case id')
  const amt = Number(amount)
  if (!(amt > 0)) throw new Error('Enter a valid invoice amount')
  const db = await getSupabaseClient()
  const uid = await currentUid(db)
  const now = new Date().toISOString()
  const { data: existing } = await db.from('portal_case_charges')
    .select('id').eq('case_id', caseId).eq('charge_type', 'cash_case_amount').maybeSingle()
  if (existing) {
    const { error } = await db.from('portal_case_charges')
      .update({ amount: amt, currency, updated_at: now }).eq('id', existing.id)
    if (error) throw error
    return existing.id
  }
  const { data, error } = await db.from('portal_case_charges')
    .insert({ case_id: caseId, charge_type: 'cash_case_amount', amount: amt, currency, created_by: uid })
    .select('id').single()
  if (error) throw error
  return data.id
}

/** Set / update the patient-excess EXPECTED amount as a portal_case_charges row
 *  (charge_type='patient_excess'). Idempotent upsert (one charge per case) — mirrors
 *  upsertCashInvoiceCharge. Powers the excess expected-vs-collected outstanding. The
 *  actual money collected is recorded separately via recordCaseCollections(...,
 *  { purpose: 'patient_excess' }). */
export async function upsertExcessCharge(caseId, amount, currency = 'EUR') {
  if (!caseId) throw new Error('No case id')
  const amt = Number(amount)
  if (!(amt > 0)) throw new Error('Enter a valid excess amount')
  const db = await getSupabaseClient()
  const uid = await currentUid(db)
  const now = new Date().toISOString()
  const { data: existing } = await db.from('portal_case_charges')
    .select('id').eq('case_id', caseId).eq('charge_type', 'patient_excess').maybeSingle()
  if (existing) {
    const { error } = await db.from('portal_case_charges')
      .update({ amount: amt, currency, updated_at: now }).eq('id', existing.id)
    if (error) throw error
    return existing.id
  }
  const { data, error } = await db.from('portal_case_charges')
    .insert({ case_id: caseId, charge_type: 'patient_excess', amount: amt, currency, created_by: uid })
    .select('id').single()
  if (error) throw error
  return data.id
}

/** Internal clinic / duty doctors the current user may pick (RLS-scoped staff,
 *  role=doctor). Secondary/optional source for specialist visits — EXTERNAL
 *  specialists are the default and live in the portal_specialist_doctors
 *  directory (fetchSpecialistDirectory). Optionally filtered to one location
 *  CODE; deduped by staff id. */
export async function fetchInternalDoctors(locationCode = null) {
  const all = await fetchAssignableStaff()
  const seen = new Set()
  return all
    .filter((s) => s.role === 'doctor')
    .filter((s) => !locationCode || s.locationCode === locationCode)
    .filter((s) => { if (seen.has(s.staffId)) return false; seen.add(s.staffId); return true })
    .map((s) => ({ staffId: s.staffId, name: s.name, specialty: s.specialty || null, locationCode: s.locationCode }))
}

/* =========================================================================
 * Specialist Doctors directory (EXTERNAL visiting specialists) — supabase mode.
 * portal_specialist_doctors (migration 030). These are NOT staff: no auth login,
 * no attendance, no clinic assignments, no billing. Admin maintains the roster
 * (RLS portal_is_admin); any active user reads it for the case specialist-visit
 * picker (RLS portal_is_active_user).
 * ========================================================================= */

/** List specialist doctors. activeOnly=true for pickers; false for admin management. */
export async function fetchSpecialistDirectory({ activeOnly = false } = {}) {
  const db = await getSupabaseClient()
  let q = db.from('portal_specialist_doctors')
    .select('id, doctor_name, specialty, phone, notes, active, created_at, updated_at')
    .order('doctor_name', { ascending: true })
  if (activeOnly) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map((d) => ({
    id: d.id, name: d.doctor_name, doctorName: d.doctor_name, specialty: d.specialty || '',
    phone: d.phone || '', notes: d.notes || '', active: d.active !== false,
    createdAt: d.created_at, updatedAt: d.updated_at,
  }))
}

/** Create or update a specialist doctor (admin-only via RLS). Returns the id. */
export async function upsertSpecialistDoctor({ id, doctorName, specialty, phone, notes, active = true } = {}) {
  const db = await getSupabaseClient()
  const name = (doctorName || '').trim()
  const spec = (specialty || '').trim()
  if (!name) throw new Error('Doctor name is required.')
  if (!spec) throw new Error('Specialty is required.')
  const row = {
    doctor_name: name, specialty: spec,
    phone: (phone || '').trim() || null, notes: (notes || '').trim() || null,
    active: active !== false, updated_at: new Date().toISOString(),
  }
  if (id) {
    const { error } = await db.from('portal_specialist_doctors').update(row).eq('id', id)
    if (error) throw error
    return id
  }
  const { data: au } = await db.auth.getUser()
  row.created_by = au?.user?.id || null
  const { data, error } = await db.from('portal_specialist_doctors').insert(row).select('id').single()
  if (error) throw error
  return data.id
}

/** Activate / deactivate a specialist doctor (admin-only via RLS). */
export async function setSpecialistDoctorActive(id, active) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_specialist_doctors')
    .update({ active: !!active, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Admin report: specialist visits (portal_encounters type 'session') across all
 *  cases the user may see (admin = all), enriched with case ref / patient / branch
 *  and parsed specialist fields. Optional { from, to } (YYYY-MM-DD) on check-in. */
export async function fetchSpecialistVisits({ from, to } = {}) {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  let q = db.from('portal_encounters')
    .select(`id, sequence_no, check_in_at, check_out_at, status, notes, created_at,
      kase:case_id ( our_ref, current_location_id, registered_location_id,
        patient:patient_id ( first_name, last_name ) )`)
    .eq('encounter_type', 'session')
  if (from) q = q.gte('check_in_at', `${from}T00:00:00`)
  if (to) q = q.lte('check_in_at', `${to}T23:59:59.999`)
  q = q.order('check_in_at', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return (data || []).map((e) => {
    const c = one(e.kase) || {}
    const p = c.patient || {}
    const loc = maps.locById[c.current_location_id] || maps.locById[c.registered_location_id] || {}
    const sp = parseSpecialistNote(e.notes)
    const mins = (e.check_in_at && e.check_out_at)
      ? Math.max(0, Math.round((new Date(e.check_out_at) - new Date(e.check_in_at)) / 60000)) : null
    return {
      id: e.id, when: e.check_in_at, checkOutAt: e.check_out_at || null, durationMin: mins,
      status: e.status === 'active' ? 'active' : 'closed',
      caseRef: c.our_ref || '—',
      patientName: [p.first_name, p.last_name].filter(Boolean).join(' ') || '—',
      branchName: loc.name || '—', branchCode: loc.code || null,
      doctorName: sp.name, specialty: sp.specialty, source: sp.source,
      note: sp.note, rawNote: e.notes || '',
    }
  })
}

/* =========================================================================
 * Insurance / assistance master data (Bundle 1 / Phase C) — supabase mode.
 * Tables existed pre-Bundle-1; migration 025 added nullable master fields.
 * Reception reads the active list for intake; admin maintains the master.
 * Existing cases keep their snapshot insurer text via portal_insurance_intakes.
 * ========================================================================= */

/** Billing facilities [{id, code}] for the admin "default facility" picker. */
export async function fetchBillingFacilities() {
  const maps = await loadRefMaps()
  return Object.entries(maps.facIdByCode).map(([code, id]) => ({ id, code }))
}

/** Local assistance companies (admin list). */
export async function fetchLocalAssistanceCompanies({ activeOnly = false } = {}) {
  const db = await getSupabaseClient()
  let q = db.from('portal_local_assistance_companies')
    .select('id, name, email, phone, default_contact_person, notes, active').order('name')
  if (activeOnly) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map((a) => ({
    id: a.id, name: a.name, email: a.email, phone: a.phone,
    defaultContactPerson: a.default_contact_person || null, notes: a.notes || null, active: a.active,
  }))
}
export async function upsertLocalAssistanceCompany(a) {
  const db = await getSupabaseClient()
  const uid = await currentUid(db)
  const row = {
    name: a.name, email: a.email || null, phone: a.phone || null,
    default_contact_person: a.defaultContactPerson || null, notes: a.notes || null,
    active: a.active ?? true, updated_at: new Date().toISOString(),
  }
  if (a.id) {
    const { error } = await db.from('portal_local_assistance_companies').update(row).eq('id', a.id)
    if (error) throw error
    return a.id
  }
  const { data, error } = await db.from('portal_local_assistance_companies')
    .insert({ ...row, created_by: uid }).select('id').single()
  if (error) throw error
  return data.id
}

/** Full insurer list with master fields (admin config). Resolves assistance
 *  name + facility code for display. */
export async function fetchInsuranceCompaniesAdmin() {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const [{ data, error }, assist] = await Promise.all([
    db.from('portal_insurance_companies')
      .select('id, name, email, phone, active, workflow_type, default_assistance_company_id, default_contact_person, default_billing_facility_id, notes')
      .order('name'),
    fetchLocalAssistanceCompanies().catch(() => []),
  ])
  if (error) throw error
  const assistById = Object.fromEntries(assist.map((a) => [a.id, a.name]))
  return (data || []).map((c) => ({
    id: c.id, name: c.name, email: c.email, phone: c.phone, active: c.active,
    workflowType: c.workflow_type || null,
    defaultAssistanceCompanyId: c.default_assistance_company_id || null,
    defaultAssistanceName: c.default_assistance_company_id ? (assistById[c.default_assistance_company_id] || null) : null,
    defaultContactPerson: c.default_contact_person || null,
    defaultBillingFacilityId: c.default_billing_facility_id || null,
    defaultBillingFacility: c.default_billing_facility_id ? (maps.facCodeById[c.default_billing_facility_id] || null) : null,
    notes: c.notes || null,
  }))
}

/** Active insurers for the intake picker (id, name + light defaults). */
export async function fetchInsuranceCompaniesForPicker() {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const { data, error } = await db.from('portal_insurance_companies')
    .select('id, name, email, phone, workflow_type, default_contact_person, default_billing_facility_id, default_assistance_company_id')
    .eq('active', true).order('name')
  if (error) throw error
  return (data || []).map((c) => ({
    id: c.id, name: c.name, email: c.email || '', phone: c.phone || '',
    workflowType: c.workflow_type || null,
    defaultContactPerson: c.default_contact_person || null,
    defaultBillingFacility: c.default_billing_facility_id ? (maps.facCodeById[c.default_billing_facility_id] || null) : null,
  }))
}

/** Admin upsert of an insurer master row (additive fields). */
export async function upsertInsuranceCompany(c) {
  const db = await getSupabaseClient()
  const uid = await currentUid(db)
  const row = {
    name: c.name, email: c.email || null, phone: c.phone || null, active: c.active ?? true,
    workflow_type: c.workflowType || null,
    default_assistance_company_id: c.defaultAssistanceCompanyId || null,
    default_contact_person: c.defaultContactPerson || null,
    default_billing_facility_id: c.defaultBillingFacilityId || null,
    notes: c.notes || null, updated_at: new Date().toISOString(),
  }
  if (c.id) {
    const { error } = await db.from('portal_insurance_companies').update(row).eq('id', c.id)
    if (error) throw error
    return c.id
  }
  const { data, error } = await db.from('portal_insurance_companies')
    .insert({ ...row, created_by: uid }).select('id').single()
  if (error) throw error
  return data.id
}
export async function setInsuranceCompanyActive(id, active) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_insurance_companies')
    .update({ active, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/* =========================================================================
 * Service catalog + case services (Bundle 1 / Phase B) — supabase mode.
 * Tables created by migration 024. The portal NEVER prices or generates
 * invoices; it only CAPTURES structured performed services for future Claude
 * Code billing. Catalog carries NO prices. Categories are text+CHECK.
 * ========================================================================= */

export const SERVICE_CATEGORIES = ['basic', 'specialist', 'labs', 'radiology', 'procedure', 'medication', 'other']

/** Service catalog (admin config = all; intake picker = activeOnly). */
export async function fetchServiceCatalog({ activeOnly = false } = {}) {
  const db = await getSupabaseClient()
  let q = db.from('portal_service_catalog')
    .select('id, category, display_name, canonical_billing_name, source_system, source_table, source_code, billing_mapping_hint, default_quantity, is_active, sort_order, notes')
    .order('category').order('sort_order', { nullsFirst: false }).order('display_name')
  if (activeOnly) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map((s) => ({
    id: s.id, category: s.category, displayName: s.display_name,
    canonicalBillingName: s.canonical_billing_name || null,
    sourceSystem: s.source_system || null, sourceTable: s.source_table || null, sourceCode: s.source_code || null,
    billingMappingHint: s.billing_mapping_hint || null,
    defaultQuantity: s.default_quantity, isActive: s.is_active, sortOrder: s.sort_order, notes: s.notes || null,
  }))
}
export async function upsertServiceCatalogItem(item) {
  const db = await getSupabaseClient()
  const uid = await currentUid(db)
  const row = {
    category: item.category, display_name: item.displayName,
    canonical_billing_name: item.canonicalBillingName || null,
    source_system: item.sourceSystem || null, source_table: item.sourceTable || null, source_code: item.sourceCode || null,
    billing_mapping_hint: item.billingMappingHint || null,
    default_quantity: item.defaultQuantity ?? 1, is_active: item.isActive ?? true,
    sort_order: item.sortOrder ?? null, notes: item.notes || null, updated_at: new Date().toISOString(),
  }
  if (item.id) {
    const { error } = await db.from('portal_service_catalog').update(row).eq('id', item.id)
    if (error) throw error
    return item.id
  }
  const { data, error } = await db.from('portal_service_catalog')
    .insert({ ...row, created_by: uid }).select('id').single()
  if (error) throw error
  return data.id
}
export async function setServiceCatalogActive(id, isActive) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_service_catalog')
    .update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Services recorded on a case (workspace + timeline). */
export async function fetchCaseServices(caseId) {
  const db = await getSupabaseClient()
  const { data, error } = await db.from('portal_case_services')
    .select('id, case_id, encounter_id, service_catalog_id, category, display_name, canonical_billing_name, quantity, performed_at, notes, billing_status, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map((s) => ({
    id: s.id, caseId: s.case_id, encounterId: s.encounter_id, serviceCatalogId: s.service_catalog_id,
    category: s.category, displayName: s.display_name, canonicalBillingName: s.canonical_billing_name || null,
    quantity: s.quantity, performedAt: s.performed_at, notes: s.notes || null,
    billingStatus: s.billing_status, createdAt: s.created_at,
  }))
}

/** Record a performed service on a case from a catalog item. billing_status is
 *  'draft' when a canonical billing name exists, else 'needs_review' (uncertain
 *  mapping → never fake billing). NO price is computed in the portal. */
export async function recordCaseService(caseId, { catalogItem, quantity, performedAt, notes } = {}) {
  if (!caseId || !catalogItem) throw new Error('Case and service are required')
  const db = await getSupabaseClient()
  const uid = await currentUid(db)
  const billingStatus = catalogItem.canonicalBillingName ? 'draft' : 'needs_review'
  const { data, error } = await db.from('portal_case_services').insert({
    case_id: caseId,
    service_catalog_id: catalogItem.id || null,
    category: catalogItem.category,
    display_name: catalogItem.displayName,
    canonical_billing_name: catalogItem.canonicalBillingName || null,
    quantity: Number(quantity) > 0 ? Number(quantity) : (catalogItem.defaultQuantity ?? 1),
    performed_at: performedAt || new Date().toISOString(),
    notes: notes || null,
    selected_by_user_id: uid,
    billing_status: billingStatus,
  }).select('id').single()
  if (error) throw error
  return data.id
}
export async function removeCaseService(id) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_case_services').delete().eq('id', id)
  if (error) throw error
}
