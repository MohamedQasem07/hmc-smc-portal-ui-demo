import { useCallback, useEffect, useState } from 'react'
import {
  Banknote, CreditCard, RefreshCw, AlertTriangle, ShieldCheck, Receipt, Wallet,
} from 'lucide-react'
import { SectionHead } from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import { fetchCollections, summarizeCollections } from '../../../../lib/api/portalData'
import { fmtDMYHM } from '../../../../lib/displayDate'

/* =========================================================================
 * LiveCollectionsList (P3B / Task #9) — supabase-mode only.
 * -----------------------------------------------------------------------
 * Renders RLS-scoped rows from portal_collections via fetchCollections().
 * The JWT decides which rows return: a clinic user sees only its own
 * location's collections; an admin sees all. NO mock derivation, NO invented
 * FX. Cash settles in its original currency; Visa/Card settles in EGP and
 * shows the stored fx_rate verbatim.
 *
 * Presentational block only — the page supplies the surrounding shell so the
 * same list can sit inside OperationalShell (clinic / reception) or
 * AdminShell (admin all-collections overview).
 * ========================================================================= */

const PURPOSE_LABEL = {
  cash_case_payment: 'Cash Invoice',
  patient_excess: 'Patient Excess',
  insurance_settlement: 'Insurance Settlement',
  repatriation: 'Repatriation',
}
const METHOD_LABEL = { cash: 'Physical Cash', visa_card: 'Visa / Bank (EGP)' }

function prettyEnum(v) {
  if (!v) return '—'
  return String(v).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}
function fmtAmt(n) {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}
function fmtRate(n) {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return null
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(Number(n))
}
function shortId(uid) {
  return uid ? `usr:${String(uid).slice(0, 8)}` : '—'
}

export default function LiveCollectionsList({ scopeNote, eyebrow = 'Live · portal_collections' }) {
  const [rows, setRows] = useState(null)   // null = not loaded yet
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchCollections())
    } catch (e) {
      setError(e?.message || 'Failed to load collections.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const list = rows || []
  const cashCount = list.filter((c) => c.method === 'cash').length
  const visaCount = list.filter((c) => c.method === 'visa_card').length
  const summary = summarizeCollections(list)

  return (
    <section className="space-y-4">
      <SectionHead
        eyebrow={eyebrow}
        title="Collections"
        description={scopeNote}
        action={
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold p-btn-ghost no-print">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {/* RLS scope assurance + cash/visa rule legend */}
      <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]"
        style={{ background: 'var(--p-brand-pale)', color: 'var(--p-ink-800)', border: '1px solid #BCCDE8' }}>
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--p-brand-mid)' }} />
        <span>
          Rows are <strong>row-level-security scoped</strong> — you see only what your account is permitted to.
          <strong> Physical cash</strong> is kept in its original currency (no conversion);
          <strong> Visa / Card</strong> settles in <strong>EGP</strong> and shows the stored FX rate. No rate is invented.
        </span>
      </div>

      {error && (
        <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]"
          style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Summary chips */}
      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full font-bold"
          style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-700)', border: '1px solid var(--p-border)' }}>
          <Receipt className="w-3.5 h-3.5" /> {list.length} collection{list.length !== 1 ? 's' : ''}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full font-bold"
          style={{ background: 'var(--p-cash-soft)', color: '#0A8F62', border: '1px solid #A8E6C7' }}>
          <Wallet className="w-3.5 h-3.5" /> {cashCount} cash
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full font-bold"
          style={{ background: 'var(--p-brand-pale)', color: '#1E4180', border: '1px solid #BCCDE8' }}>
          <CreditCard className="w-3.5 h-3.5" /> {visaCount} visa / bank
        </span>
      </div>

      {/* Treasury by channel + currency — NO cross-currency conversion (Phase 5) */}
      {summary.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] font-bold mb-2" style={{ color: 'var(--p-ink-500)' }}>
            Treasury by Channel &amp; Currency
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {summary.map((b) => {
              const isVisa = b.channel === 'visa_bank'
              return (
                <div key={b.channel + b.currency} className="rounded-xl px-3 py-3"
                  style={{ background: isVisa ? 'var(--p-brand-pale)' : 'var(--p-cash-soft)',
                           border: '1px solid ' + (isVisa ? '#BCCDE8' : '#A8E6C7') }}>
                  <div className="text-[10px] uppercase tracking-[0.12em] font-bold inline-flex items-center gap-1.5"
                       style={{ color: isVisa ? '#1E4180' : '#0A8F62' }}>
                    {isVisa ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                    {isVisa ? 'Visa / Bank' : 'Physical Cash'} · {b.currency}
                  </div>
                  <div className="mt-1 text-lg font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>
                    {fmtAmt(b.total)} <span className="text-xs" style={{ color: 'var(--p-ink-500)' }}>{b.currency}</span>
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{b.count} collection{b.count !== 1 ? 's' : ''}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="p-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[1040px]">
            <thead>
              <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
                {['Clinic', 'Case / OUR Ref', 'Patient', 'Purpose', 'Method', 'Orig. Cur.', 'Orig. Amount',
                  'Settle Cur.', 'Settle Amount', 'FX Rate', 'Collected By', 'Collected At'].map((h) =>
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px] whitespace-nowrap" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={12} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading live collections…</td></tr>
              )}
              {!loading && list.length === 0 && (
                <tr><td colSpan={12} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>
                  No collections visible to your account.
                </td></tr>
              )}
              {!loading && list.map((c) => {
                const isVisa = c.method === 'visa_card'
                const rate = fmtRate(c.fxRate)
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--p-border)' }}>
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--p-ink-900)' }}>{c.locationName || c.locationCode || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{c.ourRef || (c.caseId ? `case:${String(c.caseId).slice(0, 8)}` : '—')}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--p-ink-900)' }}>{c.patientName || '—'}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-700)' }}>{PURPOSE_LABEL[c.purpose] || prettyEnum(c.purpose)}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: isVisa ? '#1E4180' : '#0A8F62' }}>
                        {isVisa ? <CreditCard className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                        {METHOD_LABEL[c.method] || prettyEnum(c.method)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--p-brand-mid)' }}>{c.invoiceCurrency}</td>
                    <td className="px-3 py-2.5 p-numeric font-semibold" style={{ color: 'var(--p-ink-900)' }}>{fmtAmt(c.foreignAmount)}</td>
                    <td className="px-3 py-2.5 font-bold" style={{ color: isVisa ? '#1E4180' : 'var(--p-brand-mid)' }}>{c.actualCurrency}</td>
                    <td className="px-3 py-2.5 p-numeric font-bold" style={{ color: 'var(--p-ink-900)' }}>{fmtAmt(c.actualAmount)}</td>
                    <td className="px-3 py-2.5 p-numeric" style={{ color: rate ? 'var(--p-ink-700)' : 'var(--p-ink-400)' }}>
                      {rate ? rate : <span title="Cash — no conversion">—</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>
                      {c.collectedByName || shortId(c.collectedBy)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-500)' }}>{fmtDMYHM(c.collectedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--p-ink-400)' }}>
        <StatusPill tone="cash" dot>Live Supabase</StatusPill>
        <span>Operational collection log — original currencies only, no grand total across currencies.</span>
      </div>
    </section>
  )
}
