/* =========================================================================
 * P2C.R3 — Consistent date display helpers
 * -----------------------------------------------------------------------
 * Mohamed asked for DD.MM.YYYY everywhere a user reads a record, and
 * DD.MM.YYYY — HH:mm where date+time. These small helpers keep that
 * presentation centralised so every page formats the same way.
 * ========================================================================= */

const PAD = (n) => String(n).padStart(2, '0')

/** "DD.MM.YYYY" for a Date / ISO string. Returns "—" if missing. */
export function fmtDMY(value) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${PAD(d.getDate())}.${PAD(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** "DD.MM.YYYY — HH:mm". */
export function fmtDMYHM(value) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${PAD(d.getDate())}.${PAD(d.getMonth() + 1)}.${d.getFullYear()} — ${PAD(d.getHours())}:${PAD(d.getMinutes())}`
}

/** "HH:mm" (24h). */
export function fmtHM(value) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${PAD(d.getHours())}:${PAD(d.getMinutes())}`
}

/** Today in YYYY-MM-DD (input[type=date] format). */
export function todayYMD(refDate = new Date()) {
  return `${refDate.getFullYear()}-${PAD(refDate.getMonth() + 1)}-${PAD(refDate.getDate())}`
}

/** Parse YYYY-MM-DD (input[type=date]) into a Date at local midnight. */
export function parseYMD(s) {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** Move a YYYY-MM-DD by N days. */
export function shiftYMD(s, days) {
  const d = parseYMD(s)
  if (!d) return s
  d.setDate(d.getDate() + days)
  return todayYMD(d)
}

/** Compare YYYY-MM-DD strings. -1, 0, 1. */
export function cmpYMD(a, b) {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1
  return a < b ? -1 : a > b ? 1 : 0
}

/** Friendly long label "Wed · 27 May 2026" used in dashboard headers. */
export function fmtLongLabel(value) {
  if (!value) return ''
  const d = value instanceof Date ? value : (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseYMD(value) : new Date(value))
  if (!d || Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
}

/* =========================================================================
 * Age from Date of Birth
 * -----------------------------------------------------------------------
 * Mohamed's R3.1 rule: Age is calculated from DOB based on the Visit /
 * Service Date when available (so the clinically correct age-on-date-of-
 * service is shown), and otherwise from today. Age is never typed.
 * ========================================================================= */
export function ageFromDob(dob, refDate) {
  if (!dob) return null
  // Accept Date, YYYY-MM-DD, DD.MM.YYYY (Mohamed's display format), or ISO
  let d
  if (dob instanceof Date) d = dob
  else if (typeof dob === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dob)) d = parseYMD(dob)
  else if (typeof dob === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(dob)) {
    const [dd, mm, yyyy] = dob.split('.').map(Number)
    d = new Date(yyyy, mm - 1, dd)
  } else {
    d = new Date(dob)
  }
  if (!d || Number.isNaN(d.getTime())) return null
  const ref = refDate
    ? (refDate instanceof Date ? refDate : (typeof refDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(refDate) ? parseYMD(refDate) : new Date(refDate)))
    : new Date()
  if (!ref || Number.isNaN(ref.getTime())) return null
  let years = ref.getFullYear() - d.getFullYear()
  const m = ref.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) years--
  return years >= 0 ? years : null
}

/** "45 Years 🔒" friendly age label (returns "—" for null). */
export function ageLabel(years) {
  if (years === null || years === undefined) return '—'
  if (years < 1) return '< 1 year'
  if (years === 1) return '1 Year'
  return `${years} Years`
}

/** Hours/minutes diff between two ISOs as "Xh Ym" (compact). */
export function diffHM(startIso, endIso) {
  if (!startIso) return '—'
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  let mins = Math.max(0, Math.round((end - start) / 60000))
  const h = Math.floor(mins / 60)
  mins -= h * 60
  if (h === 0) return `${mins}m`
  if (mins === 0) return `${h}h`
  return `${h}h ${mins}m`
}
