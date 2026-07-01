import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calendar, TrendingUp, Wallet, FileText, Clock, Gift, ArrowLeftRight, LayoutDashboard,
  Printer, Download, Building2, RefreshCw, AlertTriangle, Pencil, Check, X as XIcon, Info,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import {
  PremiumKpi, PremiumSelect, PremiumButton, StatusPill, MeshCorner, SectionLabel,
} from '../../premium/primitives'
import { FinTypePill } from '../../premium/p2cPrimitives'
import { fetchCases, fetchLocations, fetchCaseFinancialIndex, updateInsuranceReference } from '../../lib/api/portalData'
import { computeBranchRevenueReport, sortCurrencies } from '../../lib/branchRevenueAnalytics'
import { CURRENCIES } from '../../lib/format'
import { IS_SUPABASE } from '../../lib/api/config'
import { useUserMode } from '../../context/UserModeContext'
import { useToast } from '../../components/ui/Toast'

/* =========================================================================
 * PremiumAdminBranchRevenueReport — live Supabase branch revenue report.
 * -------------------------------------------------------------------------
 * Consolidated + per-branch view for any date range: KPIs, cases-per-day
 * trend, branch ranking, nationality mix, cash/insurance/pending/free split,
 * transfers, and a case list with an inline-editable insurance reference cell
 * (admin data-quality quick-fix, writes straight to portal_insurance_intakes).
 * Print + CSV export always act on whatever is currently shown (all branches
 * or one branch filtered), mirroring the old per-clinic print workflow.
 * ========================================================================= */

function pad2(n) { return String(n).padStart(2, '0') }
function todayYmd() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
function firstOfMonth(ymd) { return `${ymd.slice(0, 8)}01` }
function lastFullMonthRange() {
  const t = new Date()
  const prevEnd = new Date(t.getFullYear(), t.getMonth(), 0)
  const prevStart = new Date(t.getFullYear(), t.getMonth() - 1, 1)
  const f = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  return { from: f(prevStart), to: f(prevEnd) }
}
function fmtAmt(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '0.00'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}

export default function PremiumAdminBranchRevenueReport() {
  if (!IS_SUPABASE) {
    return (
      <AdminShell active="reports-revenue" searchPlaceholder="Search…">
        <div className="px-4 sm:px-6 lg:px-10 py-10 max-w-[1500px] w-full mx-auto">
          <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-500)' }}>
            Branch Revenue Report runs on live Supabase data. Switch to the live pilot to use it.
          </div>
        </div>
      </AdminShell>
    )
  }
  return <LiveBranchRevenueReport />
}

function LiveBranchRevenueReport() {
  const { currentUser } = useUserMode()
  const { toast } = useToast()
  const initialRange = useMemo(() => lastFullMonthRange(), [])
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [branchFilter, setBranchFilter] = useState('all')
  const [onlyMissingRef, setOnlyMissingRef] = useState(false)
  const [cases, setCases] = useState([])
  const [locations, setLocations] = useState([])
  const [finIndex, setFinIndex] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [cs, locs, fin] = await Promise.all([
        fetchCases({ from, to }),
        fetchLocations(),
        fetchCaseFinancialIndex(),
      ])
      setCases(cs); setLocations(locs); setFinIndex(fin)
    } catch (e) {
      setError(e?.message || 'Failed to load the report.')
    } finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { load() }, [load])

  const report = useMemo(
    () => computeBranchRevenueReport({ cases, locations, finIndex, from, to }),
    [cases, locations, finIndex, from, to],
  )

  const branchOptions = useMemo(
    () => (locations || []).filter((l) => l.active !== false).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [locations],
  )
  const scopedBranch = useMemo(
    () => (branchFilter === 'all' ? null : report.branches.find((b) => b.code === branchFilter)),
    [report, branchFilter],
  )
  const rankedBranches = useMemo(
    () => (branchFilter === 'all' ? report.branches : report.branches.filter((b) => b.code === branchFilter)),
    [report, branchFilter],
  )
  // Cases narrowed to the selected branch only (independent of the "missing ref"
  // table toggle below) — feeds the KPIs / trend / revenue / nationality sections
  // so the WHOLE report re-scopes when a single clinic is filtered, not just the
  // hero title and the ranking table.
  const scopedCases = useMemo(
    () => (branchFilter === 'all' ? cases : cases.filter((c) => c.registeredAtId === branchFilter)),
    [cases, branchFilter],
  )
  const scopedReport = useMemo(
    () => (branchFilter === 'all' ? report : computeBranchRevenueReport({ cases: scopedCases, locations, finIndex, from, to })),
    [branchFilter, report, scopedCases, locations, finIndex, from, to],
  )
  // "Transfers" for a single branch means "how many cases moved in or out of it" —
  // a transferred-IN case is registered at the ORIGIN clinic, so it never appears
  // in scopedCases for the destination branch. Read it off scopedBranch (computed
  // from the full case set) instead of scopedReport.kpis, which would undercount
  // a main branch's transfers-in to near zero.
  const transfersKpi = branchFilter === 'all'
    ? scopedReport.kpis.transfers
    : (scopedBranch?.transferredIn || 0) + (scopedBranch?.transferredOut || 0)
  const caseRows = useMemo(() => {
    let list = scopedCases
    if (onlyMissingRef) {
      list = list.filter((c) => c.financialType === 'Insurance' && (!c.insurance?.ref || c.insurance.ref === '(pending)'))
    }
    return list.slice().sort((a, b) => (a.visitDate < b.visitDate ? 1 : a.visitDate > b.visitDate ? -1 : 0))
  }, [scopedCases, onlyMissingRef])
  const CASE_ROW_CAP = 400
  const cappedRows = caseRows.slice(0, CASE_ROW_CAP)

  function applyPreset(preset) {
    if (preset === 'this_month') { const t = todayYmd(); setFrom(firstOfMonth(t)); setTo(t) }
    else if (preset === 'last_month') { const r = lastFullMonthRange(); setFrom(r.from); setTo(r.to) }
  }

  async function saveRef(caseId, value) {
    try {
      await updateInsuranceReference(caseId, value)
      setCases((prev) => prev.map((c) => (c.id === caseId
        ? { ...c, insurance: { ...(c.insurance || {}), ref: value.trim() || '(pending)' } }
        : c)))
      toast({ kind: 'success', title: 'Reference updated', message: 'Saved directly to the database.' })
    } catch (e) {
      toast({ kind: 'danger', title: 'Could not save', message: e?.message || 'Please try again.' })
      throw e
    }
  }

  function exportCsv() {
    const head = ['Branch', 'Type', 'Total', 'Cash', 'Insurance', 'Pending', 'Free', 'TransferIn', 'TransferOut',
      ...CURRENCIES.flatMap((cur) => [`Charged_${cur}`, `Collected_${cur}`])]
    const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
    const rows = rankedBranches.map((b) => [
      b.name, b.type === 'main_branch' ? 'Main Branch' : 'External Clinic',
      b.total, b.cash, b.insurance, b.pending, b.free, b.transferredIn, b.transferredOut,
      ...CURRENCIES.flatMap((cur) => [(b.revenue[cur]?.charged || 0).toFixed(2), (b.revenue[cur]?.collected || 0).toFixed(2)]),
    ].map(esc).join(','))
    const csv = '﻿' + [head.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `branch_revenue_${from}_to_${to}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function printReport() {
    const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
    const scopeLabel = branchFilter === 'all' ? 'All Branches' : (scopedBranch?.name || branchFilter)
    const branchRowsHtml = rankedBranches.map((b, i) => `<tr><td>${i + 1}</td><td>${esc(b.name)}</td><td>${b.type === 'main_branch' ? 'Main Branch' : 'External Clinic'}</td><td class="num">${b.total}</td><td class="num">${b.cash}</td><td class="num">${b.insurance}</td><td class="num">${b.pending}</td><td class="num">${b.free}</td><td class="num">${b.transferredIn}</td><td class="num">${b.transferredOut}</td><td>${sortCurrencies(Object.entries(b.revenue)).map(([cur, v]) => `${cur} ${fmtAmt(v.charged)}`).join('<br>') || '—'}</td></tr>`).join('')
    const revenueRowsHtml = sortCurrencies(Object.entries(scopedReport.revenueTotals)).map(([cur, v]) => `<tr><td>${cur}</td><td class="num">${fmtAmt(v.charged)}</td><td class="num">${fmtAmt(v.collected)}</td></tr>`).join('')
    const natRowsHtml = scopedReport.topNationalitiesAll.map((n) => `<tr><td>${esc(n.name)}</td><td class="num">${n.count}</td></tr>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Branch Revenue Report</title><style>
      *{font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{margin:24px;color:#0A1B3D} h1{font-size:19px;margin:0 0 2px} h2{font-size:13px;margin:18px 0 6px;color:#1E4180}
      .sub{color:#555;font-size:12px;margin:0 0 4px} .meta{font-size:11px;color:#777;margin:0 0 14px}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px}
      th,td{border:1px solid #cdd6e6;padding:5px 8px;text-align:left} td.num,th.num{text-align:right}
      tr:nth-child(even) td{background:#f7f9fc} th{background:#eef2f8;text-transform:uppercase;font-size:9.5px;letter-spacing:.04em}
      .kpis{display:flex;gap:14px;margin:10px 0 16px;flex-wrap:wrap}
      .kpi{border:1px solid #cdd6e6;border-radius:8px;padding:8px 12px;min-width:90px}
      .kpi b{display:block;font-size:18px} .kpi span{font-size:10px;text-transform:uppercase;color:#777}
      @media print{body{margin:8px}}</style></head><body>
      <h1>HMC / SMC — Branch Revenue Report</h1>
      <p class="sub"><strong>${esc(scopeLabel)}</strong> &nbsp;·&nbsp; ${esc(from)} → ${esc(to)}</p>
      <p class="meta">Generated ${esc(new Date().toLocaleString('en-GB'))} by ${esc(currentUser?.displayName || 'Admin')}</p>
      <div class="kpis">
        <div class="kpi"><b>${scopedReport.kpis.total}</b><span>Total Cases</span></div>
        <div class="kpi"><b>${scopedReport.kpis.cash}</b><span>Cash</span></div>
        <div class="kpi"><b>${scopedReport.kpis.insurance}</b><span>Insurance</span></div>
        <div class="kpi"><b>${scopedReport.kpis.pending}</b><span>Pending</span></div>
        <div class="kpi"><b>${scopedReport.kpis.free}</b><span>Free</span></div>
        <div class="kpi"><b>${transfersKpi}</b><span>Transfers</span></div>
      </div>
      <h2>Revenue — Cash &amp; Patient Excess (Charged vs Collected) · no FX conversion · Insurance invoiced separately</h2>
      <table><thead><tr><th>Currency</th><th class="num">Charged</th><th class="num">Collected</th></tr></thead><tbody>${revenueRowsHtml || '<tr><td colspan="3" style="text-align:center;color:#999">No cash/excess charges in this period.</td></tr>'}</tbody></table>
      <h2>Branch Ranking</h2>
      <table><thead><tr><th>#</th><th>Branch</th><th>Type</th><th class="num">Total</th><th class="num">Cash</th><th class="num">Insurance</th><th class="num">Pending</th><th class="num">Free</th><th class="num">Transfer In</th><th class="num">Transfer Out</th><th>Revenue Charged</th></tr></thead><tbody>${branchRowsHtml}</tbody></table>
      <h2>Nationalities — ${esc(scopeLabel)}</h2>
      <table><thead><tr><th>Nationality</th><th class="num">Cases</th></tr></thead><tbody>${natRowsHtml || '<tr><td colspan="2" style="text-align:center;color:#999">No data.</td></tr>'}</tbody></table>
      <scr` + `ipt>window.onload=function(){window.focus();window.print()}</scr` + `ipt></body></html>`
    const w = window.open('', '_blank')
    if (!w) { toast({ kind: 'warning', title: 'Pop-up blocked', message: 'Allow pop-ups to print the report.' }); return }
    w.document.open(); w.document.write(html); w.document.close()
  }

  return (
    <AdminShell active="reports-revenue" searchPlaceholder="Search…">
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6 max-w-[1500px] w-full mx-auto pb-32">

        {/* HERO */}
        <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-7 lg:px-10 lg:py-9 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={280} color="#2DD4C7" opacity={0.28} />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-5 lg:justify-between">
            <div>
              <div className="p-eyebrow" style={{ color: '#7FE7DE' }}><TrendingUp className="w-3.5 h-3.5" /> Admin Report · Branch Revenue</div>
              <h1 className="p-display p-display-light text-[30px] lg:text-[36px] mt-2">
                {branchFilter === 'all' ? 'All branches' : scopedBranch?.name} <span style={{ color: '#7FE7DE' }}>· {from} → {to}</span>
              </h1>
              <p className="text-sm lg:text-base mt-2 max-w-xl" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Live from portal_cases + portal_case_charges. Filter to one branch to print or export it alone.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} disabled={loading} className="p-btn-ghost h-10 px-4 text-sm inline-flex items-center gap-1.5">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button onClick={printReport} className="p-btn-ghost h-10 px-4 text-sm inline-flex items-center gap-1.5">
                <Printer className="w-4 h-4" /> Print
              </button>
              <PremiumButton size="md" leftIcon={<Download className="w-4 h-4" />} onClick={exportCsv}>
                Export Excel
              </PremiumButton>
            </div>
          </div>
        </section>

        {/* FILTERS */}
        <section className="p-card p-4 p-rise-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <Field label="From"><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="p-input h-11" /></Field>
            <Field label="To"><input type="date" value={to} min={from} max={todayYmd()} onChange={(e) => setTo(e.target.value)} className="p-input h-11" /></Field>
            <Field label="Quick Range">
              <div className="flex gap-2">
                <button type="button" onClick={() => applyPreset('last_month')} className="p-btn-ghost h-11 px-3 text-xs flex-1">Last Month</button>
                <button type="button" onClick={() => applyPreset('this_month')} className="p-btn-ghost h-11 px-3 text-xs flex-1">This Month</button>
              </div>
            </Field>
            <Field label="Branch">
              <PremiumSelect value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="all">All branches ({branchOptions.length})</option>
                {branchOptions.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </PremiumSelect>
            </Field>
          </div>
        </section>

        {error && (
          <div className="rounded-xl px-4 py-3 flex items-start gap-2 text-sm" style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span className="font-semibold">{error}</span>
          </div>
        )}

        {/* KPIs — re-scope to the selected branch, not just the ranking table */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-rise-2">
          <PremiumKpi label="Total Cases" value={scopedReport.kpis.total} icon={LayoutDashboard} tone="navy" />
          <PremiumKpi label="Cash"        value={scopedReport.kpis.cash}  icon={Wallet} tone="cash" />
          <PremiumKpi label="Insurance"   value={scopedReport.kpis.insurance} icon={FileText} tone="teal" />
          <PremiumKpi label="Pending"     value={scopedReport.kpis.pending} icon={Clock} tone="pending" />
          <PremiumKpi label="Free"        value={scopedReport.kpis.free} icon={Gift} tone="gold" />
          <PremiumKpi label="Transfers"   value={transfersKpi} icon={ArrowLeftRight} tone="transfer" />
        </section>

        {/* TREND + REVENUE */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-rise-2">
          <div className="p-card p-5">
            <SectionLabel eyebrow={`${scopedReport.daily.length}-day trend`} title="Cases per day" description={branchFilter === 'all' ? 'Registered across every branch in range.' : `Registered at ${scopedBranch?.name || ''} in range.`} />
            <RangeBarChart data={scopedReport.daily} />
          </div>
          <div className="p-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--p-border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--p-cash-soft)', color: '#0A8F62' }}><Wallet className="w-4 h-4" /></div>
              <SectionLabel eyebrow="Revenue" title="Cash & Patient Excess by Currency" className="mb-0" />
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              {sortCurrencies(Object.entries(scopedReport.revenueTotals)).map(([cur, v]) => (
                <div key={cur} className="rounded-xl px-3 py-3" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                  <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-teal)' }}>{cur}</div>
                  <div className="mt-1 text-lg font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmtAmt(v.charged)}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>charged · {fmtAmt(v.collected)} collected</div>
                </div>
              ))}
              {Object.keys(scopedReport.revenueTotals).length === 0 && (
                <div className="col-span-2 text-sm text-center py-4" style={{ color: 'var(--p-ink-400)' }}>No cash/excess charges in this period.</div>
              )}
            </div>
            <div className="px-5 pb-4 flex items-start gap-2 text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Insurance case amounts are invoiced separately by the billing engine and are not summed here — Insurance is reported as a case count only, never an invented total.</span>
            </div>
          </div>
        </section>

        {/* BRANCH RANKING */}
        <section className="p-card overflow-hidden p-rise-3">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--p-border)' }}>
            <SectionLabel eyebrow="Ranked by activity" title="Branch Ranking" description="Click a branch to filter the whole report (and print/export just that clinic)." />
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
            {report.branches.map((b, i) => (
              <BranchRow key={b.code} b={b} rank={i + 1} active={branchFilter === b.code}
                onClick={() => setBranchFilter(branchFilter === b.code ? 'all' : b.code)} />
            ))}
          </div>
        </section>

        {/* NATIONALITIES */}
        <section className="p-card overflow-hidden p-rise-3">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--p-border)' }}>
            <SectionLabel eyebrow="Patient Mix" title={`Nationalities — ${branchFilter === 'all' ? 'All Branches' : (scopedBranch?.name || '')}`} />
          </div>
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {scopedReport.topNationalitiesAll.map((n) => (
              <div key={n.name} className="rounded-xl px-3 py-2.5" style={{ background: 'var(--p-surface-tint)' }}>
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--p-ink-900)' }}>{n.name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{n.count} case{n.count !== 1 ? 's' : ''}</div>
              </div>
            ))}
            {scopedReport.topNationalitiesAll.length === 0 && (
              <div className="col-span-full text-sm text-center py-4" style={{ color: 'var(--p-ink-400)' }}>No cases in this period.</div>
            )}
          </div>
        </section>

        {/* CASE LIST + INLINE FIX */}
        <section className="p-card overflow-hidden p-rise-3">
          <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: 'var(--p-border)' }}>
            <SectionLabel eyebrow={`${caseRows.length} case${caseRows.length !== 1 ? 's' : ''}`} title="Cases in this period" description="Click a Reference # to fix it — saves straight to the database." className="mb-0" />
            <label className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--p-ink-600)' }}>
              <input type="checkbox" checked={onlyMissingRef} onChange={(e) => setOnlyMissingRef(e.target.checked)} />
              Only cases missing an insurance reference
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[820px]">
              <thead>
                <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
                  {['Date', 'Patient', 'Branch', 'Type', 'Insurance Co.', 'Reference #', 'Status'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading…</td></tr>}
                {!loading && cappedRows.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No cases match.</td></tr>}
                {!loading && cappedRows.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--p-border)' }}>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{c.visitDate}</td>
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--p-ink-900)' }}>{c.patient?.name || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-600)' }}>{c.registeredAtName}</td>
                    <td className="px-3 py-2.5"><FinTypePill type={c.financialType} /></td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-600)' }}>{c.insurance?.company || '—'}</td>
                    <td className="px-3 py-2.5"><EditableRefCell caseRow={c} onSave={saveRef} /></td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-600)' }}>{c.operationalStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {caseRows.length > CASE_ROW_CAP && (
            <div className="px-5 py-3 text-[11px] border-t" style={{ borderColor: 'var(--p-border)', color: 'var(--p-ink-500)' }}>
              Showing the first {CASE_ROW_CAP} of {caseRows.length} cases — narrow the date range or pick one branch to see the rest.
            </div>
          )}
        </section>

        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--p-ink-400)' }}>
          <StatusPill tone="cash" dot>Live Supabase</StatusPill>
          <span>Generated from portal_cases + portal_locations + portal_case_charges for {from} → {to}.</span>
        </div>
      </div>
    </AdminShell>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold mb-1.5" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
      {children}
    </div>
  )
}

function RankBadge({ rank }) {
  const styles = [
    { bg: 'linear-gradient(135deg,#D9A574,#B8854D)', fg: '#fff' },
    { bg: 'linear-gradient(135deg,#B9C4D6,#8FA0BC)', fg: '#fff' },
    { bg: 'linear-gradient(135deg,#C48A5A,#9C6538)', fg: '#fff' },
  ][rank - 1] || { bg: 'var(--p-surface-tint)', fg: 'var(--p-ink-500)' }
  return (
    <span className="w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-extrabold shrink-0"
      style={{ background: styles.bg, color: styles.fg }}>{rank}</span>
  )
}

function MixBar({ b }) {
  const segs = [
    { pct: b.cashPct, color: '#18A877' },
    { pct: b.insurancePct, color: '#0FB5A9' },
    { pct: b.pendingPct, color: '#E1A148' },
    { pct: b.freePct, color: '#9AA7BD' },
  ]
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full" style={{ background: 'var(--p-surface-tint)' }}>
      {segs.map((s, i) => s.pct > 0 && <span key={i} style={{ width: `${s.pct}%`, background: s.color }} />)}
    </div>
  )
}

function BranchRow({ b, rank, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left px-5 py-4 flex items-center gap-4 transition-colors hover:bg-[var(--p-surface-tint)]"
      style={{ background: active ? 'var(--p-brand-pale)' : 'transparent' }}>
      <RankBadge rank={rank} />
      <div className="w-44 shrink-0">
        <div className="text-sm font-bold truncate" style={{ color: 'var(--p-ink-900)' }}>{b.name}</div>
        <StatusPill tone={b.type === 'main_branch' ? 'navy' : 'teal'} className="mt-1">
          <Building2 className="w-3 h-3" /> {b.type === 'main_branch' ? 'Main Branch' : 'External Clinic'}
        </StatusPill>
      </div>
      <div className="flex-1 min-w-[120px]">
        <MixBar b={b} />
        <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
          <span>{b.cash} cash</span><span>{b.insurance} ins.</span>
          {b.pending > 0 && <span>{b.pending} pending</span>}
          {b.free > 0 && <span>{b.free} free</span>}
          {(b.transferredIn > 0 || b.transferredOut > 0) && <span>⇄ {b.transferredIn} in / {b.transferredOut} out</span>}
        </div>
      </div>
      <div className="text-end shrink-0">
        <div className="text-xl font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{b.total}</div>
        <div className="text-[10px] uppercase tracking-[0.1em] font-bold" style={{ color: 'var(--p-ink-400)' }}>cases</div>
      </div>
      <div className="text-end shrink-0 w-40 hidden sm:block">
        {sortCurrencies(Object.entries(b.revenue)).slice(0, 2).map(([cur, v]) => (
          <div key={cur} className="text-[12px] font-bold p-numeric" style={{ color: 'var(--p-ink-700)' }}>{cur} {fmtAmt(v.charged)}</div>
        ))}
        {Object.keys(b.revenue).length === 0 && <div className="text-[12px]" style={{ color: 'var(--p-ink-400)' }}>—</div>}
      </div>
    </button>
  )
}

function RangeBarChart({ data }) {
  if (!data.length) return <div className="text-sm text-center py-8" style={{ color: 'var(--p-ink-400)' }}>No data for this range.</div>
  const max = Math.max(1, ...data.map((d) => d.count))
  const w = Math.max(560, data.length * 18)
  const h = 140
  const barW = Math.max(3, Math.min(16, (w / data.length) - 4))
  return (
    <div className="overflow-x-auto mt-3">
      <svg width={w} height={h + 4} viewBox={`0 0 ${w} ${h + 4}`} className="block">
        {data.map((d, i) => {
          const barH = Math.round((d.count / max) * (h - 8))
          const x = i * (w / data.length) + 2
          const y = h - barH
          return (
            <rect key={d.date} x={x} y={y} width={barW} height={Math.max(barH, 1)} rx="3" fill="#0FB5A9" fillOpacity={d.count ? 0.85 : 0.15}>
              <title>{`${d.date}: ${d.count} case${d.count !== 1 ? 's' : ''}`}</title>
            </rect>
          )
        })}
        <line x1="0" y1={h} x2={w} y2={h} stroke="var(--p-border)" strokeWidth="1" />
      </svg>
    </div>
  )
}

function EditableRefCell({ caseRow, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(caseRow.insurance?.ref || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setValue(caseRow.insurance?.ref || '') }, [caseRow.insurance?.ref])

  if (caseRow.financialType !== 'Insurance') return <span style={{ color: 'var(--p-ink-400)' }}>—</span>
  const missing = !caseRow.insurance?.ref || caseRow.insurance.ref === '(pending)'

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 group" title="Click to fix">
        <span className="font-mono text-[12px]" style={{ color: missing ? '#B14242' : 'var(--p-ink-700)', fontWeight: missing ? 700 : 400 }}>
          {caseRow.insurance?.ref || '(pending)'}
        </span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--p-ink-400)' }} />
      </button>
    )
  }

  async function commit() {
    setSaving(true)
    try { await onSave(caseRow.id, value); setEditing(false) }
    catch { /* toast already shown by the caller */ }
    finally { setSaving(false) }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus value={value} disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          else if (e.key === 'Escape') { setEditing(false); setValue(caseRow.insurance?.ref || '') }
        }}
        className="h-8 px-2 rounded-md text-[12px] font-mono w-36 focus-visible:outline-none"
        style={{ border: '1px solid var(--p-border-strong)' }}
      />
      <button type="button" disabled={saving} onClick={commit} className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--p-cash-soft)', color: '#0A8F62' }}>
        <Check className="w-3.5 h-3.5" />
      </button>
      <button type="button" disabled={saving} onClick={() => { setEditing(false); setValue(caseRow.insurance?.ref || '') }} className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--p-mixed-soft)', color: '#B14242' }}>
        <XIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
