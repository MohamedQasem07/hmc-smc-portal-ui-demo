/* =========================================================================
 * Admin Operations Analytics — pure, deterministic helpers (P3E).
 * -------------------------------------------------------------------------
 * No React, no Supabase, no Date.now() inside compute (the caller passes
 * todayKey) so results are reproducible and unit-testable. All month math is
 * done on explicit 'YYYY-MM' string keys to avoid JS Date timezone surprises
 * (the off-by-one month bug). The ONLY Date use is the local calendar reader
 * localDateKey() and daysInMonth(), both using local constructors (no UTC
 * parsing, no toISOString) so the calendar day/month never shifts.
 *
 * Counting model (the case shape comes from portalRowToCase):
 *   - registeredAtId  = location CODE where the case was REGISTERED. This is
 *     set at registration and NEVER changes on transfer, so grouping by it
 *     gives "direct / own activity" for BOTH external clinics and main
 *     branches. For a main branch this naturally EXCLUDES transferred-in
 *     cases (those were registered at the origin clinic, not the branch).
 *   - transfer.toBranchId = transfer DESTINATION  -> "transferred-in" metric.
 *   - transfer.fromId     = transfer ORIGIN       -> "transferred-out" metric.
 * ========================================================================= */

export const LOCATION_TYPE = { EXTERNAL: 'external_clinic', MAIN: 'main_branch' }

export function pad2(n) { return String(n).padStart(2, '0') }

/** Local 'YYYY-MM-DD' for a JS Date (defaults to now). Uses local calendar
 *  fields — NO UTC conversion — so the day never shifts across midnight TZ. */
export function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 'YYYY-MM' month key from a 'YYYY-MM-DD' (or longer) string. Pure slice — no
 *  parsing, so a date string is bucketed into exactly the month it spells. */
export function monthKeyOf(dateStr) {
  if (!dateStr) return null
  return String(dateStr).slice(0, 7)
}

/** Number of calendar days in a 'YYYY-MM' month. new Date(y, m, 0) is day 0 of
 *  the NEXT month = the last day of month m (local constructor, no parse). */
export function daysInMonth(monthKey) {
  const [y, m] = String(monthKey || '').split('-').map(Number)
  if (!y || !m) return 30
  return new Date(y, m, 0).getDate()
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 'June 2026' from '2026-06'. */
export function monthLabel(monthKey) {
  const [y, m] = String(monthKey || '').split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return monthKey || '—'
  return `${MONTH_NAMES[m - 1]} ${y}`
}
/** 'Jun 2026' from '2026-06'. */
export function monthShort(monthKey) {
  const [y, m] = String(monthKey || '').split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return monthKey || '—'
  return `${MONTH_SHORT[m - 1]} ${y}`
}

/** Shift a 'YYYY-MM' key by +/- whole months (pure integer math). */
export function addMonth(monthKey, delta) {
  let [y, m] = String(monthKey || '').split('-').map(Number)
  if (!y || !m) return monthKey
  m += delta
  while (m < 1) { m += 12; y -= 1 }
  while (m > 12) { m -= 12; y += 1 }
  return `${y}-${pad2(m)}`
}

/** The n most recent month keys, newest first, ending at currentKey. */
export function recentMonthKeys(currentKey, n = 12) {
  const out = []
  let key = currentKey
  for (let i = 0; i < n; i++) { out.push(key); key = addMonth(key, -1) }
  return out
}

/** Humanize a location code with no name (e.g. 'sahl_hasheesh' -> 'Sahl Hasheesh'). */
export function prettyCode(code) {
  if (!code) return '—'
  return String(code).split(/[_\s-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ')
}

const FREE = ['Free / Complimentary', 'Free']
function isInsurance(c) { return c.financialType === 'Insurance' }
function isCash(c) { return c.financialType === 'Cash' }
function isFree(c) { return FREE.includes(c.financialType) }
function isPending(c) { return !isCash(c) && !isInsurance(c) && !isFree(c) }
function isClosed(c) { return c.operationalStatus === 'Closed' }
function isAdmittedish(c) {
  return (c.centerRoomNumber != null || c.encounterPattern === 'inpatient_admission') && !isClosed(c)
}

/**
 * Compute the whole admin dashboard model for one month.
 *
 * @param {object}   p
 * @param {Array}    p.cases      RLS-scoped case list (mock-shaped, from portalRowToCase)
 * @param {Array}    p.locations  [{ code, name, type, active }] from fetchLocations()
 * @param {string}   p.monthKey   'YYYY-MM' selected month
 * @param {string}   p.todayKey   'YYYY-MM-DD' local today (caller-supplied, deterministic)
 */
export function computeAdminAnalytics({ cases = [], locations = [], monthKey, todayKey }) {
  const nameByCode = {}
  for (const l of (locations || [])) nameByCode[l.code] = l.name
  const nm = (code) => nameByCode[code] || prettyCode(code)

  // "Today" is only meaningful when the selected month IS the current month.
  const todayInMonth = monthKeyOf(todayKey) === monthKey
  const isToday = (c) => todayInMonth && c.visitDate === todayKey

  const monthCases = (cases || []).filter((c) => monthKeyOf(c.visitDate) === monthKey)

  // ---- Hero KPIs ----
  const kpis = {
    total: monthCases.length,
    today: monthCases.filter(isToday).length,
    open: monthCases.filter((c) => !isClosed(c)).length,
    closed: monthCases.filter(isClosed).length,
    insurance: monthCases.filter(isInsurance).length,
    cash: monthCases.filter(isCash).length,
    free: monthCases.filter(isFree).length,
    pending: monthCases.filter(isPending).length,
    transfers: monthCases.filter((c) => c.transfer).length,
  }

  // ---- Daily series for the line chart (index 0 = day 1) ----
  const dim = daysInMonth(monthKey)
  const counts = new Array(dim).fill(0)
  for (const c of monthCases) {
    const day = Number(String(c.visitDate || '').slice(8, 10))
    if (day >= 1 && day <= dim) counts[day - 1] += 1
  }
  const daily = counts.map((count, i) => ({ day: i + 1, count }))
  const peakDay = daily.reduce((best, d) => (d.count > best.count ? d : best), { day: 0, count: 0 })

  // ---- External clinics performance grid (active external locations) ----
  const clinics = (locations || [])
    .filter((l) => l.type === LOCATION_TYPE.EXTERNAL && l.active !== false)
    .map((l) => {
      const cm = monthCases.filter((c) => c.registeredAtId === l.code)
      return {
        code: l.code,
        name: l.name || prettyCode(l.code),
        casesMonth: cm.length,
        casesToday: cm.filter(isToday).length,
        insurance: cm.filter(isInsurance).length,
        cash: cm.filter(isCash).length,
        // Registered here AND has a transfer = it was sent onward (transferred out).
        transferredOut: cm.filter((c) => c.transfer && (!c.transfer.fromId || c.transfer.fromId === l.code)).length,
      }
    })
    .sort((a, b) => b.casesMonth - a.casesMonth || a.name.localeCompare(b.name))

  // ---- Main branches (Al-Kawther / Sheraton): direct vs transferred-in ----
  const branches = (locations || [])
    .filter((l) => l.type === LOCATION_TYPE.MAIN && l.active !== false)
    .map((l) => {
      // DIRECT = registered at the branch itself. Excludes transfers-in by construction.
      const direct = monthCases.filter((c) => c.registeredAtId === l.code)
      // TRANSFERRED-IN = arrived from elsewhere (registered at an external clinic).
      const tin = monthCases.filter((c) => c.transfer && c.transfer.toBranchId === l.code)
      // Present at the branch (direct + received) for the admitted / in-room figure.
      const present = direct.concat(tin)
      return {
        code: l.code,
        name: l.name || prettyCode(l.code),
        directMonth: direct.length,
        directToday: direct.filter(isToday).length,
        transferredInMonth: tin.length,
        transferredInReceived: tin.filter((c) => c.transfer?.receivedAt || c.transfer?.status === 'Received').length,
        directInsurance: direct.filter(isInsurance).length,
        directCash: direct.filter(isCash).length,
        inRoom: present.filter(isAdmittedish).length,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  // ---- Transfers flow ----
  const transferCases = monthCases.filter((c) => c.transfer)
  const byDestMap = {}
  const flowMap = {}
  for (const c of transferCases) {
    const to = c.transfer.toBranchId || 'unknown'
    byDestMap[to] = (byDestMap[to] || 0) + 1
    const from = c.transfer.fromId || c.registeredAtId || 'unknown'
    const key = `${from}__${to}`
    flowMap[key] = (flowMap[key] || 0) + 1
  }
  const byDestination = Object.entries(byDestMap)
    .map(([code, count]) => ({ code, name: nm(code), count }))
    .sort((a, b) => b.count - a.count)
  const flows = Object.entries(flowMap)
    .map(([k, count]) => {
      const [from, to] = k.split('__')
      return { from, to, fromName: nm(from), toName: nm(to), count }
    })
    .sort((a, b) => b.count - a.count)

  return {
    monthKey,
    todayInMonth,
    hasCases: monthCases.length > 0,
    kpis,
    daily,
    dim,
    peakDay,
    clinics,
    branches,
    transfers: { total: transferCases.length, byDestination, flows },
  }
}
