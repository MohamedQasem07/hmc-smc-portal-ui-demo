import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FileBarChart2, Banknote, CreditCard, Receipt, RefreshCw, AlertTriangle, Printer, Info,
} from 'lucide-react'
import { SectionHead, FinTypePill } from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import { fetchCases, fetchCollections, summarizeCollections } from '../../../../lib/api/portalData'
import { fmtDMYHM } from '../../../../lib/displayDate'

/* =========================================================================
 * LiveDailyReport (Phase 5) — supabase-mode only, presentational block.
 * -----------------------------------------------------------------------
 * Date-selectable daily operational report from the LIVE, RLS-scoped data:
 *   - cases registered on the selected date (fetchCases {from,to})
 *   - collections recorded on the selected date (fetchCollections {from,to})
 * Collections are grouped by treasury channel + currency — NO cross-currency
 * conversion, NO invented FX. Handover closure / reconciliation is deferred
 * (Phase 5b) and clearly noted. Print via the browser for a paper daily report.
 * The page supplies the surrounding shell (clinic / reception / admin).
 * ========================================================================= */

function todayYmd() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
function fmtAmt(n) {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}

export default function LiveDailyReport({ scopeNote, filterLocationCode = null }) {
  const [date, setDate] = useState(todayYmd())
  const [cases, setCases] = useState([])
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async (day) => {
    setLoading(true); setError(null)
    try {
      const [cs, cols] = await Promise.all([
        fetchCases({ from: day, to: day }),
        fetchCollections({ from: day, to: day }),
      ])
      // Operate-As: an admin's RLS read returns every location — narrow to the
      // operated clinic/branch. No-op for RLS-scoped clinic/reception users.
      const fcs = filterLocationCode
        ? cs.filter((c) => c.registeredAtId === filterLocationCode || c.currentLocationCode === filterLocationCode || c.transfer?.toBranchId === filterLocationCode)
        : cs
      const fcol = filterLocationCode ? cols.filter((c) => c.locationCode === filterLocationCode) : cols
      setCases(fcs); setCollections(fcol)
    } catch (e) {
      setError(e?.message || 'Failed to load the daily report.')
      setCases([]); setCollections([])
    } finally { setLoading(false) }
  }, [filterLocationCode])

  useEffect(() => { load(date) }, [date, load])

  const summary = useMemo(() => summarizeCollections(collections), [collections])
  const finCounts = useMemo(() => {
    const o = { Cash: 0, Insurance: 0, Pending: 0, 'Free / Complimentary': 0 }
    for (const c of cases) o[c.financialType] = (o[c.financialType] || 0) + 1
    return o
  }, [cases])

  return (
    <section className="space-y-5">
      <SectionHead
        eyebrow="Live · daily operational report"
        title="Daily Report"
        description={scopeNote}
        action={
          <div className="flex items-center gap-2 no-print">
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold p-btn-ghost">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={() => load(date)} disabled={loading}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold p-btn-ghost">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        }
      />

      {/* Date selector */}
      <div className="p-card p-4 flex items-center gap-3 flex-wrap">
        <label className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Report Date</label>
        <input type="date" value={date} max={todayYmd()} onChange={(e) => setDate(e.target.value)} className="p-input h-10 w-48" />
        <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>Cases by visit date · collections by collected date (RLS-scoped to your access).</span>
      </div>

      {error && (
        <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]"
          style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span className="font-semibold">{error}</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Cases" value={cases.length} tone="navy" />
        <Kpi label="Cash" value={finCounts.Cash} tone="cash" />
        <Kpi label="Insurance" value={finCounts.Insurance} tone="navy" />
        <Kpi label="Pending" value={finCounts.Pending} tone="pending" />
        <Kpi label="Free" value={finCounts['Free / Complimentary']} tone="gold" />
        <Kpi label="Collections" value={collections.length} tone="cash" />
      </div>

      {/* Collections by channel + currency */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.12em] font-bold mb-2" style={{ color: 'var(--p-ink-500)' }}>
          Collections by Channel &amp; Currency — {date}
        </div>
        {summary.length === 0 ? (
          <div className="p-card p-5 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>
            {loading ? 'Loading…' : 'No collections recorded on this date.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {summary.map((b) => {
              const isVisa = b.channel === 'visa_bank'
              return (
                <div key={b.channel + b.currency} className="rounded-xl px-3 py-3"
                  style={{ background: isVisa ? 'var(--p-brand-pale)' : 'var(--p-cash-soft)', border: '1px solid ' + (isVisa ? '#BCCDE8' : '#A8E6C7') }}>
                  <div className="text-[10px] uppercase tracking-[0.12em] font-bold inline-flex items-center gap-1.5"
                       style={{ color: isVisa ? '#1E4180' : '#0A8F62' }}>
                    {isVisa ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                    {isVisa ? 'Visa / Bank' : 'Physical Cash'} · {b.currency}
                  </div>
                  <div className="mt-1 text-lg font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmtAmt(b.total)} {b.currency}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{b.count} collection{b.count !== 1 ? 's' : ''}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cases on the date */}
      <div>
        <SectionHead eyebrow={`${cases.length} case${cases.length !== 1 ? 's' : ''}`} title="Cases on this date" />
        <div className="p-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[680px]">
              <thead>
                <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
                  {['OUR Ref', 'Patient', 'Clinic', 'Financial', 'Route', 'Status'].map((h) =>
                    <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading…</td></tr>}
                {!loading && cases.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No cases registered on this date.</td></tr>}
                {!loading && cases.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--p-border)' }}>
                    <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{c.ourRef}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--p-ink-900)' }}>{c.patient?.name || '—'}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-600)' }}>{c.registeredAtName}</td>
                    <td className="px-3 py-2.5"><FinTypePill type={c.financialType} /></td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-600)' }}>{c.route === 'direct' ? 'Direct' : 'Transfer'}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-600)' }}>{c.operationalStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Handover deferral note (Phase 5 safe-minimum) */}
      <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]"
        style={{ background: 'var(--p-pending-soft)', color: '#7A4F1F', border: '1px solid #F0C97A' }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          This is the live operational collection summary grouped by currency and payment method. <strong>Physical-cash handover
          closure and multi-currency bank reconciliation are deferred (Phase 5b)</strong> — no cross-currency totals are computed here.
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--p-ink-400)' }}>
        <StatusPill tone="cash" dot>Live Supabase</StatusPill>
        <span>Generated from portal_cases + portal_collections for {date}.</span>
      </div>
    </section>
  )
}

function Kpi({ label, value, tone = 'navy' }) {
  const tones = {
    navy: { fg: 'var(--p-brand-mid)' }, cash: { fg: '#0A8F62' },
    pending: { fg: '#A1672A' }, gold: { fg: '#9A6E36' },
  }[tone] || { fg: 'var(--p-ink-900)' }
  return (
    <div className="p-card p-4">
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
      <div className="text-3xl font-bold p-numeric mt-1" style={{ color: tones.fg }}>{value}</div>
    </div>
  )
}
