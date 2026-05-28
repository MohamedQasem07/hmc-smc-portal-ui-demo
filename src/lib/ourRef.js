/* =========================================================================
 * P2C.R3 — OUR Ref deterministic demo generator
 * -----------------------------------------------------------------------
 * Generates a unique non-duplicating OUR Ref inside the current runtime
 * demo session. Two formats, matching Mohamed's existing Master Sheet
 * workflow:
 *
 *   - HMC2026XXXXX        — for cases billed under HMC (5-digit suffix).
 *   - SHMC-DDMYYYY.NNN    — for cases billed under SMC (DDMYYYY = visit
 *                           day + visit month letter + year; .NNN is the
 *                           per-day sequence).
 *
 * For pending-financial-type cases at intake (the most common state),
 * Mohamed wants the case ID assigned at registration time so it can be
 * referenced later. We default the prefix from the registering facility:
 *
 *   - External clinic + Cash / Pending / Free   → SMC route (SHMC-…)
 *   - External clinic + Insurance HMC           → HMC route (HMC2026…)
 *   - Al-Kawther branch                         → HMC route (Al-Kawther
 *                                                  is the HMC operational
 *                                                  centre).
 *   - Sheraton branch                           → HMC route by default.
 *   - Insurance + SMC                           → SMC route.
 *
 * The generator inspects the current case list to skip any duplicates,
 * but this is a DEMO sequence only. Production-global sequencing must
 * come from an approved backend later. Keep that honest disclaimer in
 * the UI next to the locked field.
 * ========================================================================= */

const MONTH_LETTERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
// Mohamed uses simple "DDMYYYY" = day + month (1-12) + year, e.g. "2052026"
// for 20 May 2026. The DAILY_BILLING_WORKFLOW.md naming for SMC is
// "SHMC-DDMYYYY.NNN" so we follow that exactly.

/** Decide which prefix this case should use. */
export function pickRefFamily({ facility, registeredAtKind, registeredAtId, billingFacility } = {}) {
  // Explicit billingFacility wins (set after insurance classification).
  if (billingFacility === 'HMC') return 'HMC'
  if (billingFacility === 'SMC') return 'SMC'
  if (facility === 'HMC') return 'HMC'
  if (facility === 'SMC') return 'SMC'
  // Al-Kawther + Sheraton are HMC operational centres.
  if (registeredAtKind === 'branch') return 'HMC'
  // External clinic default — most external clinics in this demo are SMC-rooted
  // (Tropitel / Romance / Sahl Hasheesh / Mamsha / Pharaoh / Menamark).
  return 'SMC'
}

/** Pick the next 5-digit HMC suffix not present in existingRefs. */
function nextHmcSuffix(existingRefs, year) {
  const prefix = `HMC${year}`
  let max = 0
  for (const r of existingRefs) {
    if (typeof r !== 'string' || !r.startsWith(prefix)) continue
    const tail = r.slice(prefix.length)
    const n = parseInt(tail, 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  // Always start above any seen value, minimum 30001 to look like a real range.
  return Math.max(max + 1, 30001)
}

/** Format an HMC ref. e.g. HMC202630042. */
export function formatHmcRef(year, seq) {
  return `HMC${year}${String(seq).padStart(5, '0')}`
}

/** Build the SMC DDMYYYY token from a date. */
function smcDayToken(d) {
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  return `${day}${month}${year}`
}

/** Pick the next per-day SMC sequence not present in existingRefs. */
function nextSmcSeq(existingRefs, dayToken) {
  const prefix = `SHMC-${dayToken}.`
  let max = 0
  for (const r of existingRefs) {
    if (typeof r !== 'string' || !r.startsWith(prefix)) continue
    const tail = r.slice(prefix.length)
    const n = parseInt(tail, 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return Math.max(max + 1, 1)
}

/** Format an SMC ref. e.g. SHMC-2752026.001. */
export function formatSmcRef(dayToken, seq) {
  return `SHMC-${dayToken}.${String(seq).padStart(3, '0')}`
}

/**
 * Generate the next OUR Ref given:
 *   - allExistingRefs: array of every ref currently used (cases in demo
 *     state). Used to enforce non-duplication.
 *   - context: { registeredAtKind, registeredAtId, billingFacility,
 *                facility, refDate? (Date) }
 *
 * Returns { ref, family, year, seq, dayToken }.
 */
export function generateOurRef(allExistingRefs, context = {}) {
  const refDate = context.refDate instanceof Date ? context.refDate : new Date()
  const family = pickRefFamily(context)
  if (family === 'HMC') {
    const year = refDate.getFullYear()
    const seq = nextHmcSuffix(allExistingRefs, year)
    return { ref: formatHmcRef(year, seq), family, year, seq }
  }
  const dayToken = smcDayToken(refDate)
  const seq = nextSmcSeq(allExistingRefs, dayToken)
  return { ref: formatSmcRef(dayToken, seq), family, dayToken, seq }
}

/** Display label used in the locked field hint. */
export const OUR_REF_DEMO_DISCLAIMER =
  'Auto-generated case identity — locked. Unique within this demo session. ' +
  'Final irreversible global sequencing will be enforced by the backend later.'
