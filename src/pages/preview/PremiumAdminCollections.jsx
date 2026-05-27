import { useMemo, useState } from 'react'
import {
  Banknote, Calendar, Building2, Landmark, Wallet, CreditCard, AlertTriangle,
  ArrowUpRight, ArrowDownRight, FileDown, FlaskConical, Coins,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import {
  PremiumKpi, PremiumButton, PremiumSelect, StatusPill, MeshCorner,
  SectionLabel, Sparkline,
} from '../../premium/primitives'
import { PrintExportActions, PrintPreviewModal, usePrintPreview } from '../../premium/print'
import {
  BILLING_FACILITIES, CLINICS, CURRENCIES_LIST, PAYMENT_METHODS,
  REPATRIATION_ENTRIES,
} from '../../data/controlCenter'
import { CASES, getBranchName } from '../../data/mock'
import { fmtMoney, fmtDate } from '../../lib/format'

export default function PremiumAdminCollections() {
  const preview = usePrintPreview()
  const [bf, setBF] = useState('all')
  const [clinic, setClinic] = useState('all')
  const [cur, setCur] = useState('all')
  const [method, setMethod] = useState('all')
  const [fin, setFin] = useState('all')

  // Aggregate per-currency invoiced + collected + outstanding from CASES + REPATRIATION
  const data = useMemo(() => {
    const invoiced = {}, collected = {}, outstanding = {}
    const byMethodCur = {}
    let mixedCount = 0

    CASES.forEach((c) => {
      if (bf !== 'all' && c.facilityId !== bf) return
      if (clinic !== 'all' && c.branchId !== clinic) return
      if (fin !== 'all' && c.financialType !== fin) return
      if (c.financialType !== 'Cash') return

      const total = c.invoiceTotal || 0
      const paid = (c.payments || []).reduce((s, p) => s + p.amount, 0)
      const c1 = c.currency
      if (cur === 'all' || cur === c1) {
        invoiced[c1] = (invoiced[c1] || 0) + total
        collected[c1] = (collected[c1] || 0) + (c.mixedCurrency ? 0 : paid)
        outstanding[c1] = (outstanding[c1] || 0) + Math.max(0, total - (c.mixedCurrency ? 0 : paid))
      }
      if (c.mixedCurrency) mixedCount++
      ;(c.payments || []).forEach((p) => {
        if (method !== 'all' && p.method !== method) return
        if (cur !== 'all' && p.currency !== cur) return
        const key = `${p.method}::${p.currency}`
        byMethodCur[key] = (byMethodCur[key] || 0) + p.amount
      })
    })

    REPATRIATION_ENTRIES.forEach((r) => {
      if (bf !== 'all' && r.billingFacility !== bf) return
      if (cur !== 'all' && r.invoiceCurrency !== cur) return
      invoiced[r.invoiceCurrency] = (invoiced[r.invoiceCurrency] || 0) + r.invoiceAmount
      if (r.invoiceCurrency === r.paidCurrency) {
        collected[r.paidCurrency] = (collected[r.paidCurrency] || 0) + r.paidAmount
        outstanding[r.invoiceCurrency] = (outstanding[r.invoiceCurrency] || 0) + Math.max(0, r.invoiceAmount - r.paidAmount)
      } else if (r.paidAmount > 0) {
        mixedCount++
      } else {
        outstanding[r.invoiceCurrency] = (outstanding[r.invoiceCurrency] || 0) + r.invoiceAmount
      }
      if (r.paidAmount > 0) {
        const key = `${r.paymentMethod || 'Bank Transfer'}::${r.paidCurrency}`
        byMethodCur[key] = (byMethodCur[key] || 0) + r.paidAmount
      }
    })

    const unpaid = [
      ...CASES.filter((c) => c.financialType === 'Cash' && c.invoiceTotal && c.invoiceTotal > (c.payments || []).reduce((s, p) => s + p.amount, 0)),
      ...REPATRIATION_ENTRIES.filter((r) => r.paymentStatus !== 'Paid'),
    ].slice(0, 8)

    return { invoiced, collected, outstanding, byMethodCur, mixedCount, unpaid }
  }, [bf, clinic, cur, method, fin])

  const allCurrencies = Object.keys({ ...data.invoiced, ...data.collected })

  return (
    <AdminShell active="collections" searchPlaceholder="Search collections…">
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6 max-w-[1500px] w-full mx-auto pb-32">

        <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-7 lg:px-10 lg:py-9 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={280} color="#2DD4C7" opacity={0.28} />
          <MeshCorner position="bl" size={240} color="#1E4180" opacity={0.20} />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-5 lg:justify-between">
            <div className="max-w-2xl">
              <div className="p-eyebrow" style={{ color: '#7FE7DE' }}><Banknote className="w-3.5 h-3.5" /> Admin · Operational Overview</div>
              <h1 className="p-display p-display-light text-[30px] lg:text-[38px] mt-2">
                Collections <span style={{ color: '#7FE7DE' }}>& Treasury Overview.</span>
              </h1>
              <p className="text-sm lg:text-base mt-2 max-w-xl" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Per-currency collection summary across all billing facilities. <span className="font-semibold">No exchange conversion · No bank reconciliation · No grand totals.</span> An operational summary, not an accounting ledger.
              </p>
            </div>
            <PrintExportActions onOpenPreview={preview.onOpenPreview} />
          </div>
        </section>

        {/* FILTERS */}
        <section className="p-card p-3 sm:p-4 p-rise-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <PremiumSelect value={bf} onChange={(e) => setBF(e.target.value)}><option value="all">All billing facilities</option>{BILLING_FACILITIES.map((f) => <option key={f.id} value={f.id}>{f.shortName}</option>)}</PremiumSelect>
            <PremiumSelect value={clinic} onChange={(e) => setClinic(e.target.value)}><option value="all">All clinics</option>{CLINICS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</PremiumSelect>
            <PremiumSelect value={cur} onChange={(e) => setCur(e.target.value)}><option value="all">All currencies</option>{CURRENCIES_LIST.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.code}>{c.code}</option>)}</PremiumSelect>
            <PremiumSelect value={method} onChange={(e) => setMethod(e.target.value)}><option value="all">All methods</option>{PAYMENT_METHODS.filter((m) => m.isActive).map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}</PremiumSelect>
            <PremiumSelect value={fin} onChange={(e) => setFin(e.target.value)}><option value="all">All financial types</option><option value="Cash">Cash</option><option value="Insurance">Insurance</option></PremiumSelect>
          </div>
        </section>

        {/* MIXED CURRENCY BANNER */}
        {data.mixedCount > 0 && (
          <div className="rounded-xl px-4 py-3.5 flex items-start gap-2.5 p-rise-1" style={{ background: 'var(--p-mixed-soft)', border: '1px solid rgba(226, 106, 106, 0.32)' }}>
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#B14242' }} />
            <div className="text-sm flex-1" style={{ color: '#7A2828' }}>
              <span className="font-semibold">Mixed-currency items requiring review:</span> {data.mixedCount}. Each currency is reported separately; no automatic conversion is performed.
            </div>
          </div>
        )}

        {/* PER-CURRENCY KPI ROWS */}
        <section className="space-y-3 p-rise-2">
          <SectionLabel eyebrow="Per currency" title="Invoiced · Collected · Outstanding" description="Each currency stands alone — no combined grand total across currencies." />
          {allCurrencies.length === 0 ? (
            <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No collections data for this filter.</div>
          ) : allCurrencies.map((c) => {
            const inv = data.invoiced[c] || 0
            const col = data.collected[c] || 0
            const out = data.outstanding[c] || 0
            const pct = inv > 0 ? Math.round((col / inv) * 100) : 0
            return (
              <div key={c} className="p-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-lg text-sm font-mono font-bold" style={{ background: 'var(--p-brand-pale)', color: 'var(--p-brand-mid)' }}>{c}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--p-ink-700)' }}>{CURRENCIES_LIST.find((x) => x.code === c)?.name || c}</span>
                  <span className="ms-auto text-[11px] font-semibold" style={{ color: 'var(--p-ink-500)' }}>{pct}% collected</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl p-4" style={{ background: 'var(--p-surface-tint)' }}>
                    <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Invoiced</div>
                    <div className="text-2xl font-bold p-numeric mt-1" style={{ color: 'var(--p-ink-900)' }}>{fmtMoney(inv, c)}</div>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'var(--p-cash-soft)' }}>
                    <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: '#0A8F62' }}>Collected</div>
                    <div className="text-2xl font-bold p-numeric mt-1" style={{ color: '#0A8F62' }}>{fmtMoney(col, c)}</div>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'var(--p-pending-soft)' }}>
                    <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: '#A1672A' }}>Outstanding</div>
                    <div className="text-2xl font-bold p-numeric mt-1" style={{ color: '#A1672A' }}>{fmtMoney(out, c)}</div>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'var(--p-border)' }}>
                  <div className="h-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #0FB5A9 0%, #0A8F87 100%)' }} />
                </div>
              </div>
            )
          })}
        </section>

        {/* PAYMENTS BY METHOD × CURRENCY */}
        <section className="p-card overflow-hidden p-rise-2">
          <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--p-border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--p-insurance-soft)', color: '#0A8F87' }}><CreditCard className="w-4 h-4" /></div>
            <SectionLabel eyebrow="Detail" title="Payments by Method × Currency" description="Each row is one method × currency bucket. No conversion." />
          </div>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
              <tr><th className="text-start px-5 py-2.5">Method</th><th className="text-start px-5 py-2.5">Currency</th><th className="text-end px-5 py-2.5">Collected</th></tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
              {Object.entries(data.byMethodCur).map(([key, val]) => {
                const [m, c] = key.split('::')
                return (
                  <tr key={key}>
                    <td className="px-5 py-3 font-semibold" style={{ color: 'var(--p-ink-700)' }}>{m}</td>
                    <td className="px-5 py-3"><span className="font-mono font-bold" style={{ color: 'var(--p-brand-mid)' }}>{c}</span></td>
                    <td className="px-5 py-3 text-end font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmtMoney(val, c)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* UNPAID / PARTIALLY PAID */}
        <section className="p-card overflow-hidden p-rise-2">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--p-border)' }}>
            <SectionLabel eyebrow="Action required" title="Unpaid / Partially Paid Cases" description="Cases with outstanding balance — operational view only." />
          </div>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
              <tr><th className="text-start px-5 py-2.5">Ref</th><th className="text-start px-5 py-2.5">Patient / Source</th><th className="text-end px-5 py-2.5">Invoice</th><th className="text-end px-5 py-2.5">Paid</th><th className="text-start px-5 py-2.5">Status</th></tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
              {data.unpaid.map((c) => {
                const isRep = !!c.patientName
                const inv = c.invoiceAmount ?? c.invoiceTotal
                const paid = isRep ? c.paidAmount : (c.payments || []).reduce((s, p) => s + p.amount, 0)
                const cur = c.invoiceCurrency || c.currency
                const status = isRep ? c.paymentStatus : (paid === 0 ? 'Not Paid' : 'Partially Paid')
                return (
                  <tr key={c.id || c.ourRef}>
                    <td className="px-5 py-3 font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{c.ourRef}</td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{isRep ? c.patientName : c.patient?.name}</div>
                      <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{isRep ? 'Repatriation' : 'Portal'}</div>
                    </td>
                    <td className="px-5 py-3 text-end font-semibold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmtMoney(inv, cur)}</td>
                    <td className="px-5 py-3 text-end p-numeric" style={{ color: 'var(--p-ink-700)' }}>{fmtMoney(paid, cur)}</td>
                    <td className="px-5 py-3"><StatusPill tone={status === 'Paid' ? 'cash' : status === 'Mixed Currency' ? 'mixed' : 'amber'}>{status}</StatusPill></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* REPATRIATION RECEIPTS */}
        <section className="p-card overflow-hidden p-rise-3">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--p-border)' }}>
            <SectionLabel eyebrow="Repatriation" title="Repatriation Receipts" description="Demo repatriation receipts log." />
          </div>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
              <tr><th className="text-start px-5 py-2.5">Ref · Date</th><th className="text-start px-5 py-2.5">Patient</th><th className="text-start px-5 py-2.5">Facility</th><th className="text-end px-5 py-2.5">Invoice</th><th className="text-end px-5 py-2.5">Paid</th><th className="text-start px-5 py-2.5">Status</th></tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
              {REPATRIATION_ENTRIES.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3">
                    <div className="font-mono text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{r.ourRef}</div>
                    <div className="text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{fmtDate(r.date)}</div>
                  </td>
                  <td className="px-5 py-3 font-semibold" style={{ color: 'var(--p-ink-900)' }}>{r.patientName}</td>
                  <td className="px-5 py-3"><span className="font-mono font-bold uppercase" style={{ color: 'var(--p-brand-mid)' }}>{r.billingFacility}</span></td>
                  <td className="px-5 py-3 text-end font-bold p-numeric">{fmtMoney(r.invoiceAmount, r.invoiceCurrency)}</td>
                  <td className="px-5 py-3 text-end p-numeric">{fmtMoney(r.paidAmount, r.paidCurrency)}</td>
                  <td className="px-5 py-3"><StatusPill tone={r.paymentStatus === 'Paid' ? 'cash' : r.paymentStatus === 'Mixed Currency' ? 'mixed' : r.paymentStatus === 'Partially Paid' ? 'amber' : 'pending'}>{r.paymentStatus}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="rounded-xl px-4 py-3.5 flex items-start gap-2.5" style={{ background: 'var(--p-pending-soft)', border: '1px solid rgba(225, 161, 72, 0.32)' }}>
          <Coins className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#A1672A' }} />
          <div className="text-xs leading-relaxed" style={{ color: '#7A4F1F' }}>
            <span className="font-semibold" style={{ color: '#5C3A12' }}>Scope:</span> operational collection summary only. Real accounting / treasury / bank reconciliation requires a separate approved sprint with finance review. Reports group amounts by original currency; mixed-currency activity is flagged for Admin review.
          </div>
        </div>
      </div>

      <PrintPreviewModal open={preview.open} onClose={preview.onClose} title="Collections & Treasury — Demo" subtitle="Per-currency operational summary">
        <table className="w-full text-sm">
          <thead><tr style={{ background: '#F4F6FB' }}><th className="text-start px-3 py-2 font-bold">Currency</th><th className="text-end px-3 py-2 font-bold">Invoiced</th><th className="text-end px-3 py-2 font-bold">Collected</th><th className="text-end px-3 py-2 font-bold">Outstanding</th></tr></thead>
          <tbody>
            {allCurrencies.map((c) => (
              <tr key={c} style={{ borderTop: '1px solid #E2E8F2' }}>
                <td className="px-3 py-2 font-mono font-bold">{c}</td>
                <td className="px-3 py-2 text-end">{fmtMoney(data.invoiced[c] || 0, c)}</td>
                <td className="px-3 py-2 text-end">{fmtMoney(data.collected[c] || 0, c)}</td>
                <td className="px-3 py-2 text-end">{fmtMoney(data.outstanding[c] || 0, c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintPreviewModal>
    </AdminShell>
  )
}
