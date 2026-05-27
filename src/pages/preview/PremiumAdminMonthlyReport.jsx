import { useMemo, useState } from 'react'
import {
  Calendar, Wallet, FileText, Clock, ArrowUpRight, FileDown, Banknote,
  CreditCard, Stethoscope, ListChecks, LayoutDashboard,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import {
  PremiumKpi, PremiumSelect, StatusPill, MeshCorner, SectionLabel, Sparkline,
} from '../../premium/primitives'
import { PrintExportActions, PrintPreviewModal, usePrintPreview } from '../../premium/print'
import {
  BILLING_FACILITIES, CLINICS, INSURANCE_WORKFLOW, PAYMENT_METHODS,
  REPATRIATION_ENTRIES,
} from '../../data/controlCenter'
import { CASES, getBranchName } from '../../data/mock'
import { fmtMoney } from '../../lib/format'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function PremiumAdminMonthlyReport() {
  const preview = usePrintPreview()
  const [month, setMonth] = useState('05')
  const [year, setYear]   = useState('2026')
  const [bf, setBF]       = useState('all')
  const [clinic, setClinic] = useState('all')

  const monthData = useMemo(() => {
    const prefix = `${year}-${month}`
    const list = CASES.filter((c) => (c.visitDate || '').startsWith(prefix))
      .filter((c) => bf === 'all' || c.facilityId === bf)
      .filter((c) => clinic === 'all' || c.branchId === clinic)

    const byFinancial = {
      Cash:      list.filter((c) => c.financialType === 'Cash').length,
      Insurance: list.filter((c) => c.financialType === 'Insurance').length,
      Pending:   list.filter((c) => c.financialType === 'Pending').length,
    }
    const byClinic = {}
    list.forEach((c) => { byClinic[c.branchId] = (byClinic[c.branchId] || 0) + 1 })

    const collections = {}
    list.forEach((c) => { if (c.financialType !== 'Cash') return; collections[c.currency] = (collections[c.currency] || 0) + (c.invoiceTotal || 0) })

    const workflow = {}
    list.forEach((c) => { if (c.financialType !== 'Insurance') return; const k = c.coverageStatus || 'Details Pending'; workflow[k] = (workflow[k] || 0) + 1 })

    const methodTotals = {}
    list.forEach((c) => (c.payments || []).forEach((p) => {
      const k = `${p.method}::${p.currency}`
      methodTotals[k] = (methodTotals[k] || 0) + p.amount
    }))

    const repat = REPATRIATION_ENTRIES.filter((r) => r.date.startsWith(prefix))

    return {
      total: list.length,
      open: list.filter((c) => c.caseStatus !== 'Closed').length,
      closed: list.filter((c) => c.caseStatus === 'Closed').length,
      byFinancial, byClinic, collections, workflow, methodTotals, repat,
    }
  }, [month, year, bf, clinic])

  // 30-day mock trend
  const trendData = useMemo(() => Array.from({ length: 30 }, (_, i) => 2 + Math.round(Math.sin(i / 4) * 3) + (i % 5)), [])

  return (
    <AdminShell active="reports-monthly" searchPlaceholder="Search…">
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6 max-w-[1500px] w-full mx-auto pb-32">

        <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-7 lg:px-10 lg:py-9 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={280} color="#2DD4C7" opacity={0.28} />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-5 lg:justify-between">
            <div>
              <div className="p-eyebrow" style={{ color: '#7FE7DE' }}><Calendar className="w-3.5 h-3.5" /> Admin Report · Monthly</div>
              <h1 className="p-display p-display-light text-[30px] lg:text-[36px] mt-2">{MONTHS[parseInt(month) - 1]} {year} <span style={{ color: '#7FE7DE' }}>summary.</span></h1>
              <p className="text-sm lg:text-base mt-2 max-w-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>30-day operational view across all sources. Currencies separate.</p>
            </div>
            <PrintExportActions onOpenPreview={preview.onOpenPreview} />
          </div>
        </section>

        <section className="p-card p-3 sm:p-4 p-rise-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Month"><PremiumSelect value={month} onChange={(e) => setMonth(e.target.value)}>{MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}</PremiumSelect></Field>
            <Field label="Year"><PremiumSelect value={year} onChange={(e) => setYear(e.target.value)}>{['2026', '2025', '2024'].map((y) => <option key={y} value={y}>{y}</option>)}</PremiumSelect></Field>
            <Field label="Billing Facility"><PremiumSelect value={bf} onChange={(e) => setBF(e.target.value)}><option value="all">All</option>{BILLING_FACILITIES.map((f) => <option key={f.id} value={f.id}>{f.shortName}</option>)}</PremiumSelect></Field>
            <Field label="Clinic"><PremiumSelect value={clinic} onChange={(e) => setClinic(e.target.value)}><option value="all">All</option>{CLINICS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</PremiumSelect></Field>
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-rise-2">
          <PremiumKpi label="Total Cases"  value={monthData.total}             icon={LayoutDashboard} tone="navy" />
          <PremiumKpi label="Cash"         value={monthData.byFinancial.Cash}  icon={Wallet} tone="cash" />
          <PremiumKpi label="Insurance"    value={monthData.byFinancial.Insurance} icon={FileText} tone="teal" />
          <PremiumKpi label="Pending"      value={monthData.byFinancial.Pending} icon={Clock} tone="pending" />
          <PremiumKpi label="Open"         value={monthData.open}              icon={LayoutDashboard} tone="navy" />
          <PremiumKpi label="Closed"       value={monthData.closed}            icon={LayoutDashboard} tone="cash" />
        </section>

        {/* TREND + DISTRIBUTION */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-rise-2">
          <div className="p-card p-5">
            <SectionLabel eyebrow="30-day Trend" title="Cases per day" description="Mock trend — replace with real after backend." />
            <div className="flex items-end justify-center mt-4 px-4">
              <Sparkline data={trendData} color="#0FB5A9" width={500} height={120} />
            </div>
          </div>
          <div className="p-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--p-border)' }}>
              <SectionLabel eyebrow="Per Clinic" title="Cases by Clinic" />
            </div>
            <ul className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
              {Object.entries(monthData.byClinic).map(([id, count]) => (
                <li key={id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{getBranchName(id)}</span>
                  <span className="text-sm font-bold p-numeric">{count}</span>
                </li>
              ))}
              {Object.keys(monthData.byClinic).length === 0 && <li className="px-5 py-6 text-sm text-center" style={{ color: 'var(--p-ink-400)' }}>No data for this month.</li>}
            </ul>
          </div>
        </section>

        {/* COLLECTIONS BY CURRENCY + WORKFLOW + METHODS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 p-rise-3">
          <div className="p-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--p-border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--p-cash-soft)', color: '#0A8F62' }}><Banknote className="w-4 h-4" /></div>
              <SectionLabel eyebrow="Collections" title="By Currency" />
            </div>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}><tr><th className="text-start px-5 py-2.5">CUR</th><th className="text-end px-5 py-2.5">Total</th></tr></thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
                {Object.entries(monthData.collections).length === 0 ? <tr><td colSpan={2} className="px-5 py-6 text-sm text-center" style={{ color: 'var(--p-ink-400)' }}>—</td></tr> : Object.entries(monthData.collections).map(([c, v]) => (
                  <tr key={c}><td className="px-5 py-3"><span className="font-mono font-bold">{c}</span></td><td className="px-5 py-3 text-end font-bold p-numeric">{fmtMoney(v, c)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--p-border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--p-insurance-soft)', color: '#0A8F87' }}><ListChecks className="w-4 h-4" /></div>
              <SectionLabel eyebrow="Insurance" title="Workflow Summary" />
            </div>
            <ul className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
              {Object.entries(monthData.workflow).map(([k, v]) => (
                <li key={k} className="px-5 py-2.5 flex items-center justify-between">
                  <StatusPill tone="teal">{k}</StatusPill>
                  <span className="text-sm font-bold p-numeric">{v}</span>
                </li>
              ))}
              {Object.keys(monthData.workflow).length === 0 && <li className="px-5 py-6 text-sm text-center" style={{ color: 'var(--p-ink-400)' }}>—</li>}
            </ul>
          </div>

          <div className="p-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--p-border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--p-brand-pale)', color: 'var(--p-brand-mid)' }}><CreditCard className="w-4 h-4" /></div>
              <SectionLabel eyebrow="Payments" title="Method × Currency" />
            </div>
            <ul className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
              {Object.entries(monthData.methodTotals).map(([k, v]) => {
                const [m, c] = k.split('::')
                return <li key={k} className="px-5 py-2.5 flex items-center justify-between"><span className="text-sm" style={{ color: 'var(--p-ink-700)' }}>{m} · <span className="font-mono">{c}</span></span><span className="text-sm font-bold p-numeric">{fmtMoney(v, c)}</span></li>
              })}
              {Object.keys(monthData.methodTotals).length === 0 && <li className="px-5 py-6 text-sm text-center" style={{ color: 'var(--p-ink-400)' }}>—</li>}
            </ul>
          </div>
        </section>

        {/* REPATRIATION SUMMARY */}
        <section className="p-card overflow-hidden p-rise-3">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--p-border)' }}>
            <SectionLabel eyebrow="Repatriation" title="Monthly Summary" icon={Stethoscope} />
          </div>
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Entries"     value={monthData.repat.length} />
            <Stat label="Paid"        value={monthData.repat.filter((r) => r.paymentStatus === 'Paid').length} />
            <Stat label="Partial"     value={monthData.repat.filter((r) => r.paymentStatus === 'Partially Paid').length} />
            <Stat label="Not Paid"    value={monthData.repat.filter((r) => r.paymentStatus === 'Not Paid').length} />
          </div>
        </section>
      </div>

      <PrintPreviewModal open={preview.open} onClose={preview.onClose} title={`${MONTHS[parseInt(month) - 1]} ${year} — Monthly Report`} subtitle="Operational summary · demo">
        <div className="text-sm space-y-3">
          <p><strong>Total cases:</strong> {monthData.total}</p>
          <p><strong>By financial type:</strong> Cash {monthData.byFinancial.Cash} · Insurance {monthData.byFinancial.Insurance} · Pending {monthData.byFinancial.Pending}</p>
          <p><strong>Open / Closed:</strong> {monthData.open} / {monthData.closed}</p>
        </div>
      </PrintPreviewModal>
    </AdminShell>
  )
}

function Field({ label, children }) { return <div><div className="text-[10px] uppercase tracking-[0.12em] font-bold mb-1.5" style={{ color: 'var(--p-ink-500)' }}>{label}</div>{children}</div> }
function Stat({ label, value }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--p-surface-tint)' }}>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
      <div className="text-2xl font-bold p-numeric mt-1" style={{ color: 'var(--p-ink-900)' }}>{value}</div>
    </div>
  )
}
