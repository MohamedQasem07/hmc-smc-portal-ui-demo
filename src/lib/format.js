// Lightweight formatting helpers — prototype only.
// Currency formatting uses Intl with conservative defaults so demo numbers read cleanly.

export function fmtMoney(amount, currency = 'EUR', { sign = false } = {}) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—'
  try {
    const v = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      currencyDisplay: 'code',
    }).format(Math.abs(amount))
    // Intl returns "EUR 1,234.56" with currencyDisplay=code on modern engines.
    if (sign && amount < 0) return `-${v}`
    return v
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`
  }
}

export function fmtDate(iso, { withTime = false } = {}) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const opts = withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }
  return new Intl.DateTimeFormat('en-GB', opts).format(d)
}

export function fmtRelative(iso) {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMin = Math.round((now - then) / 60000)
  if (Math.abs(diffMin) < 1) return 'just now'
  if (Math.abs(diffMin) < 60) return `${diffMin} min ago`
  const diffH = Math.round(diffMin / 60)
  if (Math.abs(diffH) < 24) return `${diffH}h ago`
  const diffD = Math.round(diffH / 24)
  if (Math.abs(diffD) < 7) return `${diffD}d ago`
  return fmtDate(iso)
}

export function ageFromDob(dobISO, refISO) {
  if (!dobISO) return null
  const dob = new Date(dobISO)
  const ref = refISO ? new Date(refISO) : new Date()
  let years = ref.getFullYear() - dob.getFullYear()
  const m = ref.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) years--
  return years
}

export const CURRENCIES = ['EUR', 'GBP', 'USD', 'EGP']
