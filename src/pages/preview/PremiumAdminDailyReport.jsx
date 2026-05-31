import { useMemo, useState } from 'react'
import {
  FileBarChart2, Calendar, Building2, Wallet, FileText, Clock, ArrowUpRight,
  ArrowDownRight, Banknote, CreditCard, Stethoscope, FlaskConical,
  LayoutDashboard,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import {
  PremiumKpi, PremiumButton, PremiumSelect, StatusPill, MeshCorner,
  SectionLabel,
} from '../../premium/primitives'
import { PrintExportActions, PrintPreviewModal, usePrintPreview } from '../../premium/print'
import {
  BILLING_FACILITIES, CLINICS, INSURANCE_WORKFLOW, REPATRIATION_ENTRIES,
} from '../../data/controlCenter'
import { CASES, aggregateForAdmin, getBranchName } from '../../data/mock'
import { fmtMoney, fmtDate } from '../../lib/format'
import { IS_SUPABASE } from '../../lib/api/config'
import LiveDailyReport from './p2c/live/LiveDailyReport'

function AdminDailyReportLive() {
  return (
    <AdminShell active="reports-daily" searchPlaceholder="Search…">
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6 max-w-[1500px] w-full mx-auto pb-32">
        <div>
          <div className="p-eyebrow" style={{ color: 'var(--p-brand-mid)' }}><FileBarChart2 className="w-3.5 h-3.5" /> Admin Report · Daily</div>
          <h1 className="p-h1 text-2xl sm:text-3xl" style={{ color: 'var(--p-ink-900)' }}>Daily Report</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--p-ink-500)' }}>All clinics &amp; branches · per-currency operational summary · no exchange conversion.</p>
        </div>
        <LiveDailyReport scopeNote="All clinics & branches (admin — full visibility)." />
      </div>
    </AdminShell>
  )
}

export default function PremiumAdminDailyReport() {
  if (IS_SUPABASE) return <AdminDailyReportLive />
  const preview = usePrintPreview()
  const [date, setDate] = useState('2026-05-26')
  const [bf, setBF] = useState('all')
  const [clinic, setClinic] = useState('all')

  const agg = useMemo(() => aggregateForAdmin({ date, facilityId: bf, branchId: clinic }), [date, bf, clinic])
  const repatToday = useMemo(() => REPATRIATION_ENTRIES.filter((r) => r.date === date), [date])

  const open = agg.list.filter((c) => c.caseStatus !== 'Closed').length
  const closed = agg.list.length - open

  return (
    <AdminShell active="reports-daily" searchPlaceholder="Search…">
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6 max-w-[1500px] w-full mx-auto pb-32">

        <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-7 lg:px-10 lg:py-9 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={280} color="#2DD4C7" opacity={0.28} />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-5 lg:justify-between">
            <div>
              <div className="p-eyebrow" style={{ color: '#7FE7DE' }}><FileBarChart2 className="w-3.5 h-3.5" /> Admin Report · Daily</div>
              <h1 className="p-display p-display-light text-[30px] lg:text-[36px] mt-2">Daily Report <span style={{ color: '#7FE7DE' }}>·</span> {fmtDate(date)}</h1>
              <p className="text-sm lg:text-base mt-2 max-w-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>Per-currency operational summary. No exchange conversion.</p>
            </div>
            <PrintExportActions onOpenPreview={preview.onOpenPreview} />
          </div>
        </section>

        {/* FILTERS */}
        <section className="p-card p-3 sm:p-4 p-rise-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Date"><PremiumSelect value={date} onChange={(e) => setDate(e.target.value)}>
              {['2026-05-26', '2026-05-25', '2026-05-24', '2026-05-23'].map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}
            </PremiumSelect></Field>
            <Field label="Billing Facility"><PremiumSelect value={bf} onChange={(e) => setBF(e.target.value)}><option value="all">All</option>{BILLING_FACILITIES.map((f) => <option key={f.id} value={f.id}>{f.shortName}</option>)}</PremiumSelect></Field>
            <Field label="Clinic"><PremiumSelect value={clinic} onChange={(e) => setClinic(e.target.value)}><option value="all">All</option>{CLINICS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</PremiumSelect></Field>
          </div>
        </section>

        {/* KPI ROW */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 p-rise-2">
          <PremiumKpi label="Total Cases" value={agg.totals.total} icon={LayoutDashboard} tone="navy" />
          <PremiumKpi label="Cash"        value={agg.totals.cash}  icon={Wallet}         tone="cash" />
          <PremiumKpi label="Insurance"   value={agg.totals.insurance} icon={FileText}   tone="teal" />
          <PremiumKpi label="Pending"     value={agg.totals.pending}   icon={Clock}      tone="pending" />
          <PremiumKpi label="Transfers"   value={agg.totals.transfersIn + agg.totals.transfersOut} icon={ArrowUpRight} tone="transfer" />
          <PremiumKpi label="Open"        value={open}             icon={LayoutDashboard} tone="navy" />
          <PremiumKpi label="Closed"      value={closed}           icon={LayoutDashboard} tone="cash" />
        </section>

        {/* COLLECTIONS BY CURRENCY */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-rise-2">
          <div className="p-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--p-border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--p-cash-soft)', color: '#0A8F62' }}><Banknote className="w-4 h-4" /></div>
              <div><div className="p-eyebrow">Cash Invoices</div><h3 className="p-h2 text-base">Invoiced by Original Currency</h3></div>
            </div>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}><tr><th className="text-start px-5 py-2.5">Currency</th><th className="text-end px-5 py-2.5">Total</th></tr></thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
                {Object.entries(agg.cashInvoiceByCurrency).map(([c, v]) => (
                  <tr key={c}><td className="px-5 py-3"><span className="font-mono font-bold" style={{ color: 'var(--p-brand-mid)' }}>{c}</span></td><td className="px-5 py-3 text-end font-bold p-numeric">{fmtMoney(v, c)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--p-border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--p-insurance-soft)', color: '#0A8F87' }}><CreditCard className="w-4 h-4" /></div>
              <div><div className="p-eyebrow">Payments</div><h3 className="p-h2 text-base">Method × Currency</h3></div>
            </div>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}><tr><th className="text-start px-5 py-2.5">Method · Currency</th><th className="text-end px-5 py-2.5">Total</th></tr></thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
                {Object.entries(agg.collections).map(([key, v]) => {
                  const [m, c] = key.split('::')
                  return <tr key={key}><td className="px-5 py-3">{m} · <span className="font-mono">{c}</span></td><td className="px-5 py-3 text-end font-bold p-numeric">{fmtMoney(v, c)}</td></tr>
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* INSURANCE WORKFLOW + REPATRIATION */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-rise-3">
          <div className="p-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--p-border)' }}>
              <SectionLabel eyebrow="Insurance" title="Cases & Workflow Status" />
            </div>
            <ul className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
              {agg.insuranceCasesToday.length === 0 ? (
                <li className="px-5 py-6 text-sm text-center" style={{ color: 'var(--p-ink-400)' }}>No insurance cases for this date.</li>
              ) : agg.insuranceCasesToday.map((c) => (
                <li key={c.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
                    <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{c.ourRef} · {c.insuranceCompany}</div>
                  </div>
                  <StatusPill tone="teal">{c.coverageStatus || 'Details Pending'}</StatusPill>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--p-border)' }}>
              <SectionLabel eyebrow="Repatriation" title="Today's Entries" icon={Stethoscope} />
            </div>
            <ul className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
              {repatToday.length === 0 ? (
                <li className="px-5 py-6 text-sm text-center" style={{ color: 'var(--p-ink-400)' }}>No repatriation entries today.</li>
              ) : repatToday.map((r) => (
                <li key={r.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{r.patientName}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{r.ourRef} · <span className="font-mono uppercase">{r.billingFacility}</span> · {fmtMoney(r.invoiceAmount, r.invoiceCurrency)}</div>
                  </div>
                  <StatusPill tone={r.paymentStatus === 'Paid' ? 'cash' : r.paymentStatus === 'Mixed Currency' ? 'mixed' : 'amber'}>{r.paymentStatus}</StatusPill>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* PER-CLINIC BREAKDOWN */}
        <section className="p-card overflow-hidden p-rise-3">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--p-border)' }}>
            <SectionLabel eyebrow="Per Clinic" title="Activity by Operational Clinic" description="Click into a clinic for its dedicated daily view." />
          </div>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
              <tr><th className="text-start px-5 py-2.5">Clinic</th><th className="text-end px-5 py-2.5">Total</th><th className="text-end px-5 py-2.5">Cash</th><th className="text-end px-5 py-2.5">Insurance</th><th className="text-end px-5 py-2.5">Pending</th><th className="text-end px-5 py-2.5">Transfers</th></tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
              {agg.branchComparison.slice(0, 8).map((b) => (
                <tr key={b.branchId}>
                  <td className="px-5 py-3 font-semibold" style={{ color: 'var(--p-ink-900)' }}>{b.branchName}</td>
                  <td className="px-5 py-3 text-end font-bold p-numeric">{b.total}</td>
                  <td className="px-5 py-3 text-end p-numeric">{b.cash}</td>
                  <td className="px-5 py-3 text-end p-numeric">{b.insurance}</td>
                  <td className="px-5 py-3 text-end p-numeric">{b.pending}</td>
                  <td className="px-5 py-3 text-end p-numeric">{b.transfersIn + b.transfersOut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <PrintPreviewModal open={preview.open} onClose={preview.onClose} title={`Daily Report — ${fmtDate(date)}`} subtitle="Operational summary · demo">
        <div className="text-sm space-y-3">
          <p><strong>Total cases:</strong> {agg.totals.total} · Open: {open} · Closed: {closed}</p>
          <p><strong>Cash invoices by currency:</strong></p>
          <ul className="ms-4 list-disc">
            {Object.entries(agg.cashInvoiceByCurrency).map(([c, v]) => <li key={c}><strong>{c}:</strong> {fmtMoney(v, c)}</li>)}
          </ul>
        </div>
      </PrintPreviewModal>
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
