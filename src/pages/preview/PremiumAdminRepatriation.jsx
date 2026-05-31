import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Stethoscope, Sparkles, Plus, AlertTriangle, ChevronLeft, FileDown,
  Banknote, FlaskConical, Wallet,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import {
  PremiumButton, PremiumField, PremiumInput, PremiumSelect, PremiumKpi,
  StatusPill, MeshCorner, SectionLabel,
} from '../../premium/primitives'
import { PrintExportActions, PrintPreviewModal, usePrintPreview } from '../../premium/print'
import { useToast } from '../../components/ui/Toast'
import {
  BILLING_FACILITIES, CURRENCIES_LIST, PAYMENT_METHODS, REPATRIATION_ENTRIES,
} from '../../data/controlCenter'
import { fmtMoney, fmtDate } from '../../lib/format'

export default function PremiumAdminRepatriation() {
  const { toast } = useToast()
  const preview = usePrintPreview()

  const [form, setForm] = useState({
    patientName: '', date: '2026-05-27',
    billingFacility: 'hmc',
    invoiceAmount: '', invoiceCurrency: 'EUR',
    paidAmount: '',    paidCurrency: 'EUR',
    paymentMethod: 'Bank Transfer',
    note: '',
  })

  const activeCurrencies = CURRENCIES_LIST.filter((c) => c.inRegistration && c.isActive)

  const totals = useMemo(() => {
    const byCurrency = {}
    REPATRIATION_ENTRIES.forEach((r) => {
      byCurrency[r.invoiceCurrency] = (byCurrency[r.invoiceCurrency] || 0) + r.invoiceAmount
    })
    const paidByCurrency = {}
    REPATRIATION_ENTRIES.forEach((r) => {
      paidByCurrency[r.paidCurrency] = (paidByCurrency[r.paidCurrency] || 0) + r.paidAmount
    })
    return {
      total: REPATRIATION_ENTRIES.length,
      paid: REPATRIATION_ENTRIES.filter((r) => r.paymentStatus === 'Paid').length,
      partial: REPATRIATION_ENTRIES.filter((r) => r.paymentStatus === 'Partially Paid').length,
      mixed: REPATRIATION_ENTRIES.filter((r) => r.paymentStatus === 'Mixed Currency').length,
      notPaid: REPATRIATION_ENTRIES.filter((r) => r.paymentStatus === 'Not Paid').length,
      byCurrency, paidByCurrency,
    }
  }, [])

  function paymentStatusFromForm() {
    if (!form.invoiceAmount) return null
    const inv = parseFloat(form.invoiceAmount) || 0
    const paid = parseFloat(form.paidAmount) || 0
    if (form.invoiceCurrency !== form.paidCurrency && paid > 0) return { tone: 'mixed', label: 'Mixed Currency — Admin Review Required' }
    if (paid <= 0) return { tone: 'pending', label: 'Not Paid' }
    if (paid < inv) return { tone: 'amber', label: `Partially Paid · ${paid} / ${inv} ${form.invoiceCurrency}` }
    return { tone: 'cash', label: 'Paid' }
  }
  const stat = paymentStatusFromForm()

  function handleSave() {
    if (!form.patientName.trim() || !form.invoiceAmount) {
      toast({ kind: 'warning', title: 'Missing details', message: 'Patient name and invoice amount are required.' })
      return
    }
    toast({ kind: 'success', title: 'Repatriation entry saved — demo only', message: 'Recorded locally.' })
  }

  return (
    <AdminShell active="repatriation" searchPlaceholder="Search repatriation entries…">
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6 max-w-[1300px] w-full mx-auto pb-32">

        <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-7 lg:px-10 lg:py-9 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={260} color="#D9A574" opacity={0.30} />
          <MeshCorner position="bl" size={240} color="#1E4180" opacity={0.20} />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-5 lg:justify-between">
            <div className="max-w-2xl">
              <div className="p-eyebrow" style={{ color: '#E0C291' }}>
                <Stethoscope className="w-3.5 h-3.5" /> Admin Only · Repatriation
              </div>
              <h1 className="p-display p-display-light text-[30px] lg:text-[36px] mt-2">
                Repatriation <span style={{ color: '#E0C291' }}>entry & log.</span>
              </h1>
              <p className="text-sm lg:text-base mt-2 max-w-xl" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Record a repatriation case without the full clinic workflow. No clinical workflow, no Manager integration, no PDF generation here.
              </p>
            </div>
            <PrintExportActions onOpenPreview={preview.onOpenPreview} />
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-rise-1">
          <PremiumKpi label="Total Entries"  value={totals.total}   icon={Stethoscope} tone="navy" />
          <PremiumKpi label="Paid"           value={totals.paid}    icon={Banknote}    tone="cash" />
          <PremiumKpi label="Partially Paid" value={totals.partial} icon={Wallet}      tone="pending" />
          <PremiumKpi label="Mixed Currency" value={totals.mixed}   icon={AlertTriangle} tone="mixed" />
          <PremiumKpi label="Not Paid"       value={totals.notPaid} icon={Wallet}      tone="navy" />
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-6 p-rise-2">
          {/* FORM */}
          <section className="p-hero-card p-6 lg:p-7 relative">
            <SectionLabel eyebrow="New Entry" title="Record a repatriation case" description="Currency is captured alongside invoice + paid amount. Mixed-currency triggers Admin Review." />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PremiumField label="Case / Patient Name" required className="sm:col-span-2">
                <PremiumInput value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} placeholder="e.g. Patient (DEMO)" />
              </PremiumField>
              <PremiumField label="Date" required><PremiumInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></PremiumField>
              <PremiumField label="Billing Facility" required>
                <PremiumSelect value={form.billingFacility} onChange={(e) => setForm({ ...form, billingFacility: e.target.value })}>
                  {BILLING_FACILITIES.map((f) => <option key={f.id} value={f.id}>{f.shortName} — {f.name}</option>)}
                </PremiumSelect>
              </PremiumField>
              <PremiumField label="Invoice Amount" required>
                <PremiumInput type="number" min="0" step="0.01" value={form.invoiceAmount} onChange={(e) => setForm({ ...form, invoiceAmount: e.target.value })} />
              </PremiumField>
              <PremiumField label="Invoice Currency" required>
                <PremiumSelect value={form.invoiceCurrency} onChange={(e) => setForm({ ...form, invoiceCurrency: e.target.value })}>
                  {activeCurrencies.map((c) => <option key={c.id} value={c.code}>{c.code}</option>)}
                </PremiumSelect>
              </PremiumField>
              <PremiumField label="Amount Paid">
                <PremiumInput type="number" min="0" step="0.01" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} />
              </PremiumField>
              <PremiumField label="Paid Currency">
                <PremiumSelect value={form.paidCurrency} onChange={(e) => setForm({ ...form, paidCurrency: e.target.value })}>
                  {activeCurrencies.map((c) => <option key={c.id} value={c.code}>{c.code}</option>)}
                </PremiumSelect>
              </PremiumField>
              <PremiumField label="Payment Method" className="sm:col-span-2">
                <PremiumSelect value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {PAYMENT_METHODS.filter(m => m.isActive).map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                </PremiumSelect>
              </PremiumField>
              <PremiumField label="Note" className="sm:col-span-2">
                <PremiumInput value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional" />
              </PremiumField>
            </div>

            {stat && (
              <div className="mt-4 rounded-xl px-4 py-3 flex items-center justify-between"
                   style={stat.tone === 'mixed' ? { background: 'var(--p-mixed-soft)', border: '1px solid rgba(226, 106, 106, 0.32)' } : { background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                <span className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Payment Status</span>
                <StatusPill tone={stat.tone === 'mixed' ? 'mixed' : stat.tone === 'cash' ? 'cash' : stat.tone === 'amber' ? 'amber' : 'pending'}>
                  {stat.label}
                </StatusPill>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <Link to="/admin-dashboard" className="p-btn-ghost h-11 px-4 text-sm inline-flex items-center gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Cancel
              </Link>
              <PremiumButton size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={handleSave}>
                Save Repatriation Entry
              </PremiumButton>
            </div>
          </section>

          {/* RECENT ENTRIES */}
          <section className="p-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--p-border)' }}>
              <SectionLabel eyebrow="Recent" title="Repatriation Entries" description="Last few demo entries — admin-only." />
            </div>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
                <tr>
                  <th className="text-start px-4 py-2.5">Ref · Patient</th>
                  <th className="text-start px-4 py-2.5">Date · Facility</th>
                  <th className="text-end px-4 py-2.5">Invoice</th>
                  <th className="text-end px-4 py-2.5">Paid</th>
                  <th className="text-start px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
                {REPATRIATION_ENTRIES.map((r) => {
                  const tone = r.paymentStatus === 'Paid' ? 'cash' :
                               r.paymentStatus === 'Mixed Currency' ? 'mixed' :
                               r.paymentStatus === 'Partially Paid' ? 'amber' : 'pending'
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{r.ourRef}</div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{r.patientName}</div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--p-ink-600)' }}>
                        {fmtDate(r.date)}<br />
                        <span className="font-bold font-mono uppercase">{r.billingFacility}</span>
                      </td>
                      <td className="px-4 py-3 text-end font-semibold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmtMoney(r.invoiceAmount, r.invoiceCurrency)}</td>
                      <td className="px-4 py-3 text-end p-numeric" style={{ color: 'var(--p-ink-800)' }}>{fmtMoney(r.paidAmount, r.paidCurrency)}</td>
                      <td className="px-4 py-3"><StatusPill tone={tone}>{r.paymentStatus}</StatusPill></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="px-5 py-3 border-t flex items-start gap-2 text-[11px]" style={{ borderColor: 'var(--p-border)', background: 'var(--p-pending-soft)', color: '#7A4F1F' }}>
              <FlaskConical className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              All entries above are DEMO. Admin-only — never visible to clinic users. No PDF generation, no Manager integration.
            </div>
          </section>
        </div>
      </div>

      <PrintPreviewModal open={preview.open} onClose={preview.onClose} title="Repatriation Entries — Demo" subtitle="Admin-only repatriation log">
        <table className="w-full text-sm">
          <thead><tr style={{ background: '#F4F6FB' }}><th className="text-start px-3 py-2 font-bold">Ref</th><th className="text-start px-3 py-2 font-bold">Patient</th><th className="text-start px-3 py-2 font-bold">Facility</th><th className="text-end px-3 py-2 font-bold">Invoice</th><th className="text-end px-3 py-2 font-bold">Paid</th><th className="text-start px-3 py-2 font-bold">Status</th></tr></thead>
          <tbody>
            {REPATRIATION_ENTRIES.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #E2E8F2' }}>
                <td className="px-3 py-2 font-mono text-[11px]">{r.ourRef}</td>
                <td className="px-3 py-2">{r.patientName}</td>
                <td className="px-3 py-2 uppercase font-bold">{r.billingFacility}</td>
                <td className="px-3 py-2 text-end">{fmtMoney(r.invoiceAmount, r.invoiceCurrency)}</td>
                <td className="px-3 py-2 text-end">{fmtMoney(r.paidAmount, r.paidCurrency)}</td>
                <td className="px-3 py-2">{r.paymentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintPreviewModal>
    </AdminShell>
  )
}
