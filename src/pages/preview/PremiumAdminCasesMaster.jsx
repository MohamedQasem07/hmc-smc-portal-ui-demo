import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList, Search, Filter, Eye, ChevronRight, ChevronDown,
  Calendar, Building2, Landmark, Wallet, ArrowLeftRight, ListChecks,
  Download, Plus, FileDown, History, AlertTriangle, Sparkles, CheckCircle2,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import {
  PremiumKpi, PremiumButton, PremiumField, PremiumInput, PremiumSelect,
  StatusPill, MeshCorner, SectionLabel, Avatar,
} from '../../premium/primitives'
import { PrintExportActions, PrintPreviewModal, usePrintPreview } from '../../premium/print'
import { ChangeHistoryDrawer } from '../../premium/governance'
import { useToast } from '../../components/ui/Toast'
import {
  BILLING_FACILITIES, CLINICS, CURRENCIES_LIST, INSURANCE_WORKFLOW,
  REPATRIATION_ENTRIES, LEGACY_REVIEW_ROWS, CHANGE_HISTORY,
} from '../../data/controlCenter'
import { CASES, getBranchName } from '../../data/mock'
import { fmtDate, fmtMoney, fmtRelative } from '../../lib/format'
import { cn } from '../../lib/cn'

const PAYMENT_STATUSES = ['Not Paid', 'Partially Paid', 'Paid', 'Mixed Currency']

// Normalize all sources into one unified case row shape for Cases Master
function buildUnifiedCases() {
  const portalRows = CASES.map((c) => ({
    id: c.id,
    ourRef: c.ourRef,
    source: c.source || 'Portal',
    visitDate: (c.visitDate || '').slice(0, 10),
    patientName: c.patient?.name || '',
    registeredAt: c.branchId,
    billingFacility: c.facilityId,
    financialType: c.financialType,
    route: c.route,
    operationalStatus: c.invoiceReadiness === 'Finalized' || c.caseStatus === 'Closed' ? 'Closed' : 'Open',
    insuranceWorkflow: c.financialType === 'Insurance' ? (c.coverageStatus === 'Confirmed' ? 'GOP Received' : c.coverageStatus === 'Under Review' ? 'GOP Requested' : 'Details Pending') : '',
    invoiceAmount: c.invoiceTotal || c.finalInvoiceAmount || 0,
    paidAmount: c.payments ? c.payments.reduce((s, p) => s + p.amount, 0) : 0,
    currency: c.currency || 'EUR',
    paymentStatus: c.mixedCurrency ? 'Mixed Currency' :
                   c.invoiceTotal && c.payments && c.payments.reduce((s, p) => s + p.amount, 0) >= c.invoiceTotal ? 'Paid' :
                   c.invoiceTotal ? 'Partially Paid' : 'Not Paid',
    lastModified: c.history?.length ? c.history[c.history.length - 1].at : c.visitDate,
  }))
  const repatRows = REPATRIATION_ENTRIES.map((r) => ({
    id: `rep_${r.id}`,
    ourRef: r.ourRef,
    source: 'Repatriation Entry',
    visitDate: r.date,
    patientName: r.patientName,
    registeredAt: '',
    billingFacility: r.billingFacility,
    financialType: 'Cash',
    route: 'Direct',
    operationalStatus: r.paymentStatus === 'Paid' ? 'Closed' : 'Open',
    insuranceWorkflow: '',
    invoiceAmount: r.invoiceAmount,
    paidAmount: r.paidAmount,
    currency: r.invoiceCurrency,
    paymentStatus: r.paymentStatus,
    lastModified: r.date + 'T10:00:00',
  }))
  const legacyRows = LEGACY_REVIEW_ROWS.slice(0, 5).map((l) => ({
    id: `leg_${l.id}`,
    ourRef: l.ourRef,
    source: 'Legacy Master Sheet',
    visitDate: l.date,
    patientName: l.patientName,
    registeredAt: '',
    billingFacility: l.billingFacility,
    financialType: l.financialType,
    route: 'Direct',
    operationalStatus: 'Closed',
    insuranceWorkflow: l.financialType === 'Insurance' ? 'Paid' : '',
    invoiceAmount: l.invoiceAmount,
    paidAmount: l.invoiceAmount,
    currency: l.currency,
    paymentStatus: 'Paid',
    lastModified: l.date + 'T10:00:00',
  }))
  return [...portalRows, ...repatRows, ...legacyRows]
}

export default function PremiumAdminCasesMaster() {
  const { toast } = useToast()
  const preview = usePrintPreview()
  const [historyOpen, setHistoryOpen] = useState(false)
  const all = useMemo(() => buildUnifiedCases(), [])

  const [overrides, setOverrides] = useState({})
  const merged = useMemo(() => all.map((c) => ({ ...c, ...(overrides[c.id] || {}) })), [all, overrides])

  // Filters
  const [q, setQ] = useState('')
  const [source, setSource] = useState('all')
  const [bf, setBF] = useState('all')
  const [clinic, setClinic] = useState('all')
  const [fin, setFin] = useState('all')
  const [route, setRoute] = useState('all')
  const [op, setOp] = useState('all')
  const [iwf, setIwf] = useState('all')
  const [pay, setPay] = useState('all')
  const [cur, setCur] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const list = useMemo(() => merged.filter((c) => {
    if (q) {
      const needle = q.toLowerCase()
      if (!`${c.patientName} ${c.ourRef}`.toLowerCase().includes(needle)) return false
    }
    if (source !== 'all' && c.source !== source) return false
    if (bf !== 'all' && c.billingFacility !== bf) return false
    if (clinic !== 'all' && c.registeredAt !== clinic) return false
    if (fin !== 'all' && c.financialType !== fin) return false
    if (route !== 'all' && c.route !== route) return false
    if (op !== 'all' && c.operationalStatus !== op) return false
    if (iwf !== 'all' && c.insuranceWorkflow !== iwf) return false
    if (pay !== 'all' && c.paymentStatus !== pay) return false
    if (cur !== 'all' && c.currency !== cur) return false
    if (dateFrom && c.visitDate < dateFrom) return false
    if (dateTo && c.visitDate > dateTo) return false
    return true
  }).sort((a, b) => (b.visitDate || '').localeCompare(a.visitDate || '')), [merged, q, source, bf, clinic, fin, route, op, iwf, pay, cur, dateFrom, dateTo])

  function updateField(id, field, value) {
    const prev = merged.find((c) => c.id === id)
    if (!prev || prev[field] === value) return
    setOverrides((o) => ({ ...o, [id]: { ...(o[id] || {}), [field]: value } }))
    toast({ kind: 'success', title: 'Saved — demo only', message: `${prev.ourRef} · ${field}: ${prev[field] || '—'} → ${value}` })
  }

  function clearFilters() {
    setQ(''); setSource('all'); setBF('all'); setClinic('all'); setFin('all'); setRoute('all')
    setOp('all'); setIwf('all'); setPay('all'); setCur('all'); setDateFrom(''); setDateTo('')
  }

  return (
    <AdminShell active="cases" searchPlaceholder="Search patient, Our Ref…">
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6 max-w-[1600px] w-full mx-auto pb-32">

        {/* HERO */}
        <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-7 lg:px-10 lg:py-9 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={280} color="#2DD4C7" opacity={0.28} />
          <MeshCorner position="bl" size={240} color="#1E4180" opacity={0.20} />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-5 lg:justify-between">
            <div className="max-w-2xl">
              <div className="p-eyebrow" style={{ color: '#7FE7DE' }}><ClipboardList className="w-3.5 h-3.5" /> Admin Workspace</div>
              <h1 className="p-display p-display-light text-[30px] lg:text-[36px] mt-2">Cases Master <span style={{ color: '#7FE7DE' }}>— every source.</span></h1>
              <p className="text-sm lg:text-base mt-2 max-w-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Portal · Legacy Master Sheet · Manual Admin Entry · Repatriation. {list.length} of {all.length} records visible.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PremiumButton variant="ghost" size="md" leftIcon={<History className="w-4 h-4" />} onClick={() => setHistoryOpen(true)}>
                Change History
              </PremiumButton>
              <PremiumButton as={Link} to="/admin/new-case" size="md" leftIcon={<Plus className="w-4 h-4" />}>
                New Case
              </PremiumButton>
              <PrintExportActions onOpenPreview={preview.onOpenPreview} />
            </div>
          </div>
        </section>

        {/* FILTERS */}
        <section className="p-card p-3 sm:p-4 p-rise-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <div className="col-span-2 sm:col-span-2 lg:col-span-2"><PremiumInput prefix={<Search className="w-4 h-4" />} placeholder="Search patient or Our Ref" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <PremiumSelect value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="all">All sources</option>
              <option value="Portal">Portal</option>
              <option value="Legacy Master Sheet">Legacy</option>
              <option value="Manual Admin Entry">Manual Admin</option>
              <option value="Repatriation Entry">Repatriation</option>
            </PremiumSelect>
            <PremiumSelect value={bf} onChange={(e) => setBF(e.target.value)}>
              <option value="all">All billing</option>
              {BILLING_FACILITIES.map((f) => <option key={f.id} value={f.id}>{f.shortName}</option>)}
            </PremiumSelect>
            <PremiumSelect value={clinic} onChange={(e) => setClinic(e.target.value)}>
              <option value="all">All clinics</option>
              {CLINICS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </PremiumSelect>
            <PremiumSelect value={fin} onChange={(e) => setFin(e.target.value)}>
              <option value="all">All financial</option>
              <option value="Pending">Pending</option><option value="Cash">Cash</option><option value="Insurance">Insurance</option>
            </PremiumSelect>
            <PremiumSelect value={route} onChange={(e) => setRoute(e.target.value)}>
              <option value="all">All routes</option>
              <option value="Direct">Direct</option>
              <option value="Transferred In">Transfer Received</option>
              <option value="Transferred Out">Transfer Sent</option>
            </PremiumSelect>
            <PremiumSelect value={op} onChange={(e) => setOp(e.target.value)}>
              <option value="all">Open/Closed</option><option value="Open">Open</option><option value="Closed">Closed</option>
            </PremiumSelect>
            <PremiumSelect value={iwf} onChange={(e) => setIwf(e.target.value)}>
              <option value="all">All workflow</option>
              {INSURANCE_WORKFLOW.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </PremiumSelect>
            <PremiumSelect value={pay} onChange={(e) => setPay(e.target.value)}>
              <option value="all">All payments</option>
              {PAYMENT_STATUSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </PremiumSelect>
            <PremiumSelect value={cur} onChange={(e) => setCur(e.target.value)}>
              <option value="all">All currencies</option>
              {CURRENCIES_LIST.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.code}>{c.code}</option>)}
            </PremiumSelect>
            <PremiumInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
            <PremiumInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
            <button onClick={clearFilters} className="p-btn-ghost h-11 px-3 text-xs inline-flex items-center justify-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Reset</button>
          </div>
        </section>

        {/* TABLE */}
        <section className="p-card overflow-hidden p-rise-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.10em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
                <tr>
                  <th className="text-start px-3 py-3">Our Ref</th>
                  <th className="text-start px-3 py-3">Source</th>
                  <th className="text-start px-3 py-3">Date</th>
                  <th className="text-start px-3 py-3">Patient</th>
                  <th className="text-start px-3 py-3">Clinic · Billing</th>
                  <th className="text-start px-3 py-3">Financial</th>
                  <th className="text-start px-3 py-3">Route</th>
                  <th className="text-start px-3 py-3">Status</th>
                  <th className="text-start px-3 py-3">Insurance WF</th>
                  <th className="text-end px-3 py-3">Invoice / Paid</th>
                  <th className="text-start px-3 py-3">Payment</th>
                  <th className="text-start px-3 py-3">Updated</th>
                  <th className="text-end px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
                {list.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[var(--p-surface-tint)]">
                    <td className="px-3 py-3 font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{c.ourRef}</td>
                    <td className="px-3 py-3">
                      <StatusPill tone={c.source === 'Portal' ? 'teal' : c.source === 'Repatriation Entry' ? 'navy' : 'amber'} size="sm">{c.source}</StatusPill>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-600)' }}>{fmtDate(c.visitDate)}</td>
                    <td className="px-3 py-3"><div className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{c.patientName}</div></td>
                    <td className="px-3 py-3">
                      <div className="text-[11px]" style={{ color: 'var(--p-ink-600)' }}>{c.registeredAt ? getBranchName(c.registeredAt) : '—'}</div>
                      <div className="text-[10px] uppercase tracking-wider font-bold mt-0.5" style={{ color: 'var(--p-brand-mid)' }}>{c.billingFacility?.toUpperCase() || '—'}</div>
                    </td>
                    <td className="px-3 py-3"><StatusPill tone={c.financialType === 'Cash' ? 'cash' : c.financialType === 'Insurance' ? 'insurance' : 'pending'}>{c.financialType}</StatusPill></td>
                    <td className="px-3 py-3 text-[11px]" style={{ color: 'var(--p-ink-600)' }}>{c.route}</td>
                    <td className="px-3 py-3">
                      <InlinePill value={c.operationalStatus} options={['Open', 'Closed']} onChange={(v) => updateField(c.id, 'operationalStatus', v)} tone={c.operationalStatus === 'Closed' ? 'ghost' : 'cash'} />
                    </td>
                    <td className="px-3 py-3">
                      {c.financialType === 'Insurance' ? (
                        <InlinePill value={c.insuranceWorkflow || 'Details Pending'} options={INSURANCE_WORKFLOW.filter(s => s.isActive).map(s => s.name)} onChange={(v) => updateField(c.id, 'insuranceWorkflow', v)} tone="teal" />
                      ) : <span style={{ color: 'var(--p-ink-300)' }}>—</span>}
                    </td>
                    <td className="px-3 py-3 text-end whitespace-nowrap">
                      <div className="font-semibold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmtMoney(c.invoiceAmount, c.currency)}</div>
                      <div className="text-[10px] p-numeric" style={{ color: 'var(--p-ink-500)' }}>paid {fmtMoney(c.paidAmount, c.currency)}</div>
                    </td>
                    <td className="px-3 py-3">
                      <InlinePill value={c.paymentStatus} options={PAYMENT_STATUSES} onChange={(v) => updateField(c.id, 'paymentStatus', v)}
                        tone={c.paymentStatus === 'Paid' ? 'cash' : c.paymentStatus === 'Mixed Currency' ? 'mixed' : c.paymentStatus === 'Partially Paid' ? 'amber' : 'pending'} />
                    </td>
                    <td className="px-3 py-3 text-[11px] whitespace-nowrap" style={{ color: 'var(--p-ink-500)' }}>{fmtRelative(c.lastModified)}</td>
                    <td className="px-3 py-3 text-end">
                      <Link to={`/admin/case-detail/${c.id}`} className="p-btn-ghost h-8 px-3 text-xs inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="rounded-xl px-4 py-3.5 flex items-start gap-2.5" style={{ background: 'var(--p-insurance-soft)', border: '1px solid rgba(15,181,169,0.20)' }}>
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#0A8F87' }} />
          <div className="text-xs leading-relaxed" style={{ color: '#0A6E64' }}>
            Inline status edits save to local prototype state only and toast a confirmation. No real audit-log entry or database write happens.
          </div>
        </div>
      </div>

      <ChangeHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} entries={CHANGE_HISTORY} />
      <PrintPreviewModal open={preview.open} onClose={preview.onClose} title="Cases Master — Demo Export" subtitle={`${list.length} cases · all sources`}>
        <table className="w-full text-[11px]">
          <thead><tr style={{ background: '#F4F6FB' }}><th className="text-start px-2 py-1.5 font-bold">Ref</th><th className="text-start px-2 py-1.5 font-bold">Source</th><th className="text-start px-2 py-1.5 font-bold">Patient</th><th className="text-start px-2 py-1.5 font-bold">Fin</th><th className="text-start px-2 py-1.5 font-bold">Status</th><th className="text-end px-2 py-1.5 font-bold">Invoice</th></tr></thead>
          <tbody>
            {list.slice(0, 30).map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #E2E8F2' }}>
                <td className="px-2 py-1 font-mono">{c.ourRef}</td>
                <td className="px-2 py-1">{c.source}</td>
                <td className="px-2 py-1">{c.patientName}</td>
                <td className="px-2 py-1">{c.financialType}</td>
                <td className="px-2 py-1">{c.operationalStatus}</td>
                <td className="px-2 py-1 text-end">{fmtMoney(c.invoiceAmount, c.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintPreviewModal>
    </AdminShell>
  )
}

function InlinePill({ value, options, onChange, tone = 'neutral' }) {
  const toneStyles = {
    cash:    { bg: 'var(--p-cash-soft)',      fg: '#0A8F62', ring: 'rgba(10, 143, 98, 0.30)' },
    teal:    { bg: 'var(--p-insurance-soft)', fg: '#0A8F87', ring: 'rgba(15, 181, 169, 0.30)' },
    amber:   { bg: 'var(--p-pending-soft)',   fg: '#A1672A', ring: 'rgba(225, 161, 72, 0.30)' },
    pending: { bg: 'var(--p-pending-soft)',   fg: '#A1672A', ring: 'rgba(225, 161, 72, 0.30)' },
    mixed:   { bg: 'var(--p-mixed-soft)',     fg: '#B14242', ring: 'rgba(226, 106, 106, 0.30)' },
    ghost:   { bg: 'var(--p-surface-tint)',   fg: 'var(--p-ink-600)', ring: 'var(--p-border)' },
    neutral: { bg: 'var(--p-surface-tint)',   fg: 'var(--p-ink-600)', ring: 'var(--p-border)' },
  }[tone] || { bg: 'var(--p-surface-tint)', fg: 'var(--p-ink-600)', ring: 'var(--p-border)' }
  return (
    <span className="relative inline-flex items-center rounded-full" style={{ background: toneStyles.bg, color: toneStyles.fg, border: `1px solid ${toneStyles.ring}` }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent text-[11px] font-semibold pl-2.5 pr-6 py-0.5 cursor-pointer focus:outline-none whitespace-nowrap">
        {options.map((o) => <option key={o} value={o} className="text-ink-900">{o}</option>)}
      </select>
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] opacity-60 pointer-events-none">▾</span>
    </span>
  )
}
