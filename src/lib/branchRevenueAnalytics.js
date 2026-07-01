/* =========================================================================
 * Branch Revenue Report — pure, deterministic helpers.
 * -------------------------------------------------------------------------
 * No React, no Supabase. Mirrors the adminAnalytics.js convention: the caller
 * fetches live rows (fetchCases / fetchLocations / fetchCaseFinancialIndex)
 * and this module turns them into the report shape. Cases are already
 * date-scoped by the caller (fetchCases({from,to}) filters by visit_date);
 * this module never re-derives "today" and never calls Date.now() except in
 * the trend-day loop, where the range boundaries are caller-supplied strings.
 *
 * Revenue honesty rule: only CASH-CASE and PATIENT-EXCESS amounts are tracked
 * as money in the Portal (portal_case_charges). Insurance case totals are
 * invoiced separately by the protected billing engine and are NOT summed
 * here — Insurance is reported as a CASE COUNT only. Never fabricate a
 * currency total for it.
 * ========================================================================= */

import { prettyCode, localDateKey } from './adminAnalytics'

const CUR_ORDER = ['EUR', 'GBP', 'USD', 'EGP']
export function sortCurrencies(entries) {
  return entries.sort(([a], [b]) => {
    const ia = CUR_ORDER.indexOf(a), ib = CUR_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b)
  })
}

function addToCurrencyMap(map, currency, field, amount) {
  if (!currency || amount == null) return
  map[currency] ||= { charged: 0, collected: 0 }
  map[currency][field] += Number(amount) || 0
}

/**
 * @param {object} p
 * @param {Array}  p.cases      Cases already filtered to the reporting range (fetchCases({from,to})).
 * @param {Array}  p.locations  [{ id, code, name, type, active }] from fetchLocations().
 * @param {object} p.finIndex   { [caseId]: {cashInvoice,cashCurrency,cashCollected,excessExpected,excessCurrency,excessCollected} } from fetchCaseFinancialIndex().
 * @param {string} p.from       'YYYY-MM-DD' range start (inclusive).
 * @param {string} p.to         'YYYY-MM-DD' range end (inclusive).
 */
export function computeBranchRevenueReport({ cases = [], locations = [], finIndex = {}, from, to }) {
  const byCode = {}
  for (const l of locations || []) byCode[l.code] = l

  const branchAgg = {}
  const ensureBranch = (code) => (branchAgg[code] ||= {
    code,
    name: byCode[code]?.name || prettyCode(code),
    type: byCode[code]?.type || 'external_clinic',
    total: 0, cash: 0, insurance: 0, pending: 0, free: 0,
    transferredOut: 0, transferredIn: 0,
    revenue: {},          // { currency: { charged, collected } } — cash + patient excess combined
    nationalities: {},    // { name: count }
  })

  // Seed every ACTIVE location so a branch with zero cases in-range (e.g. a
  // clinic with no user assigned yet) still appears in the ranking at zero —
  // "show whatever data exists" rather than silently omitting it.
  for (const l of locations || []) if (l.active !== false) ensureBranch(l.code)

  for (const c of cases) {
    const code = c.registeredAtId
    if (!code) continue
    const b = ensureBranch(code)
    b.total += 1
    if (c.financialType === 'Cash') b.cash += 1
    else if (c.financialType === 'Insurance') b.insurance += 1
    else if (c.financialType === 'Free / Complimentary') b.free += 1
    else b.pending += 1

    if (c.transfer) {
      b.transferredOut += 1
      const destCode = c.transfer.toBranchId
      if (destCode) ensureBranch(destCode).transferredIn += 1
    }

    const nat = c.patient?.nationality || 'Unknown'
    b.nationalities[nat] = (b.nationalities[nat] || 0) + 1

    const fin = finIndex[c.id]
    if (fin) {
      if (fin.cashInvoice != null) addToCurrencyMap(b.revenue, fin.cashCurrency, 'charged', fin.cashInvoice)
      if (fin.cashCollected) addToCurrencyMap(b.revenue, fin.cashCurrency, 'collected', fin.cashCollected)
      if (fin.excessExpected != null) addToCurrencyMap(b.revenue, fin.excessCurrency, 'charged', fin.excessExpected)
      if (fin.excessCollected) addToCurrencyMap(b.revenue, fin.excessCurrency, 'collected', fin.excessCollected)
    }
  }

  const branches = Object.values(branchAgg)
    .map((b) => ({
      ...b,
      topNationalities: Object.entries(b.nationalities)
        .sort((x, y) => y[1] - x[1]).slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      cashPct: b.total ? Math.round((b.cash / b.total) * 100) : 0,
      insurancePct: b.total ? Math.round((b.insurance / b.total) * 100) : 0,
      pendingPct: b.total ? Math.round((b.pending / b.total) * 100) : 0,
      freePct: b.total ? Math.round((b.free / b.total) * 100) : 0,
      transferPct: b.total ? Math.round((b.transferredOut / b.total) * 100) : 0,
    }))
    .sort((a, b2) => b2.total - a.total || a.name.localeCompare(b2.name))

  const kpis = {
    total: cases.length,
    cash: cases.filter((c) => c.financialType === 'Cash').length,
    insurance: cases.filter((c) => c.financialType === 'Insurance').length,
    pending: cases.filter((c) => c.financialType === 'Pending').length,
    free: cases.filter((c) => c.financialType === 'Free / Complimentary').length,
    transfers: cases.filter((c) => c.transfer).length,
  }

  const revenueTotals = {}
  for (const b of branches) {
    for (const [cur, v] of Object.entries(b.revenue)) {
      revenueTotals[cur] ||= { charged: 0, collected: 0 }
      revenueTotals[cur].charged += v.charged
      revenueTotals[cur].collected += v.collected
    }
  }

  const natTotals = {}
  for (const c of cases) {
    const n = c.patient?.nationality || 'Unknown'
    natTotals[n] = (natTotals[n] || 0) + 1
  }
  const topNationalitiesAll = Object.entries(natTotals)
    .sort((a, b2) => b2[1] - a[1]).slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  // Daily trend across the whole range (capped to guard against a malformed
  // or accidentally huge range — a report is never meant to chart years).
  const daily = []
  if (from && to) {
    const dayMap = {}
    for (const c of cases) if (c.visitDate) dayMap[c.visitDate] = (dayMap[c.visitDate] || 0) + 1
    const cur = new Date(`${from}T00:00:00`)
    const end = new Date(`${to}T00:00:00`)
    let guard = 0
    while (cur <= end && guard < 400) {
      const key = localDateKey(cur)
      daily.push({ date: key, count: dayMap[key] || 0 })
      cur.setDate(cur.getDate() + 1)
      guard += 1
    }
  }

  return {
    from, to, kpis, branches, revenueTotals, topNationalitiesAll, daily,
    hasCases: cases.length > 0,
  }
}
