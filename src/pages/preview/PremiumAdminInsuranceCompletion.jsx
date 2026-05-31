import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, ShieldOff, Lock, FileText, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronRight, Building2, Mail, Phone, ArrowRight, Eye,
  Search, Coins, Percent, ClipboardCheck, X,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import { SectionLabel, StatusPill, MeshCorner } from '../../premium/primitives'
import { FacilityBadge } from '../../premium/p2cPrimitives'
import { useCases, useLocalAssistance, useDemoState } from '../../context/DemoStateContext'
import { fmtDMY, fmtDMYHM, ageFromDob, ageLabel } from '../../lib/displayDate'
import { cn } from '../../lib/cn'

/* =========================================================================
 * PremiumAdminInsuranceCompletion (R3.1)
 * -----------------------------------------------------------------------
 * Stage 2 of the Insurance workflow — Admin completes the billing
 * preparation fields a clinic/reception user never sees:
 *
 *   - Invoice Currency
 *   - Service Charge %
 *   - Egyptian / Local Assistance Company + Ref
 *   - Billing Prep Status (Awaiting / Ready for Claude / Future)
 *   - Admin notes
 *
 * The OUR Ref, Insurance Company, Insurance Ref Number, and Billing
 * Facility (HMC/SMC) come from Stage 1 (intake) and are read-only here.
 * ========================================================================= */

const STATUSES = [
  { value: 'awaiting_admin_completion', label: 'Awaiting Admin Completion', tone: 'pending' },
  { value: 'ready_for_claude',           label: 'Ready for Claude Invoice Preparation', tone: 'cash' },
  { value: 'future_integration',         label: 'Invoice Generated Later — Future Integration', tone: 'transferred' },
]

const CURRENCIES = ['EUR', 'GBP', 'USD', 'EGP']

export default function PremiumAdminInsuranceCompletion() {
  const cases = useCases()
  const insuranceCases = useMemo(() => cases.filter((c) => c.financialType === 'Insurance'), [cases])
  const [filter, setFilter] = useState('all')   // 'all' | 'awaiting' | 'ready'
  const [query, setQuery]   = useState('')

  const shown = useMemo(() => {
    let list = insuranceCases
    if (filter === 'awaiting') list = list.filter((c) => (c.insuranceCompletion?.billingPrepStatus || 'awaiting_admin_completion') === 'awaiting_admin_completion')
    if (filter === 'ready')    list = list.filter((c) => c.insuranceCompletion?.billingPrepStatus === 'ready_for_claude')
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((c) =>
        c.ourRef?.toLowerCase().includes(q) ||
        c.patient?.name?.toLowerCase().includes(q) ||
        c.insurance?.company?.toLowerCase().includes(q) ||
        c.insurance?.ref?.toLowerCase().includes(q)
      )
    }
    return list
  }, [insuranceCases, filter, query])

  const counts = useMemo(() => ({
    all: insuranceCases.length,
    awaiting: insuranceCases.filter((c) => (c.insuranceCompletion?.billingPrepStatus || 'awaiting_admin_completion') === 'awaiting_admin_completion').length,
    ready: insuranceCases.filter((c) => c.insuranceCompletion?.billingPrepStatus === 'ready_for_claude').length,
  }), [insuranceCases])

  const [openCaseId, setOpenCaseId] = useState(null)
  const openCase = useMemo(() => shown.find((c) => c.id === openCaseId) || null, [shown, openCaseId])

  return (
    <AdminShell active="insurance-completion" searchPlaceholder="Search by OUR Ref, patient, insurer…">
      <div className="px-6 lg:px-10 py-7 lg:py-9 space-y-7 max-w-[1500px] w-full mx-auto">

        {/* Hero */}
        <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-7 lg:px-10 lg:py-8 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={260} color="#2DD4C7" opacity={0.28} />
          <MeshCorner position="bl" size={200} color="#1E4180" opacity={0.20} />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-6 lg:justify-between">
            <div className="max-w-2xl">
              <div className="p-eyebrow" style={{ color: '#7FE7DE' }}>
                <ShieldCheck className="w-3.5 h-3.5" /> Admin · Insurance Billing Preparation
              </div>
              <h1 className="p-display p-display-light text-[28px] lg:text-[36px] mt-2">
                Insurance Completion <span style={{ color: '#7FE7DE' }}>Workspace.</span>
              </h1>
              <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.78)' }}>
                Stage 2 of the insurance workflow. Clinic/reception users opened the case with the insurer's contact and reference. You complete the billing preparation fields here so Claude Code can later generate the invoice.
              </p>
              <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <Lock className="w-3 h-3" />
                Protected from regular clinic users. Service Charge, Invoice Currency, Local Assistance and Billing Prep Status are admin-only.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <KpiTile label="Total" value={counts.all} />
              <KpiTile label="Awaiting" value={counts.awaiting} tone="pending" />
              <KpiTile label="Ready for Claude" value={counts.ready} tone="cash" />
            </div>
          </div>
        </section>

        {/* Filter bar */}
        <div className="p-card p-3 flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all',      label: 'All',      count: counts.all },
              { id: 'awaiting', label: 'Awaiting', count: counts.awaiting },
              { id: 'ready',    label: 'Ready',    count: counts.ready },
            ].map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border-2 transition-colors"
                style={{
                  background: filter === f.id ? 'var(--p-teal)' : 'white',
                  color: filter === f.id ? 'white' : 'var(--p-ink-700)',
                  borderColor: filter === f.id ? 'var(--p-teal)' : 'var(--p-border)',
                }}>
                {f.label}
                <span className={cn('ml-0.5 h-4 px-1.5 rounded-full text-[10px] inline-flex items-center', filter === f.id ? 'bg-white/20' : 'bg-[var(--p-surface-tint)]')}
                  style={filter === f.id ? { color: 'white' } : { color: 'var(--p-ink-500)' }}>{f.count}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--p-ink-400)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search OUR Ref / patient / insurer / ref…"
              className="p-input pl-9 h-9" />
          </div>
        </div>

        {/* Cases table */}
        <section className="p-card overflow-hidden">
          {shown.length === 0 ? (
            <div className="p-10 text-center text-sm" style={{ color: 'var(--p-ink-500)' }}>
              No insurance cases match this filter. Load the UAT dataset from the Demo Roles page to populate this view.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] min-w-[920px]">
                <thead>
                  <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
                    {['OUR Ref', 'Patient', 'Source', 'Facility', 'Insurer', 'Insurance Ref', 'Billing Prep Status', 'Completion'].map((h) =>
                      <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((c) => {
                    const status = c.insuranceCompletion?.billingPrepStatus || 'awaiting_admin_completion'
                    const tone = STATUSES.find((s) => s.value === status)?.tone || 'pending'
                    const label = STATUSES.find((s) => s.value === status)?.label || status
                    return (
                      <tr key={c.id} style={{ borderTop: '1px solid var(--p-border)', cursor: 'pointer' }}
                          onClick={() => setOpenCaseId(c.id)}>
                        <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{c.ourRef}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold" style={{ color: 'var(--p-ink-900)' }}>{c.patient?.name}</div>
                          <div className="text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{c.patient?.nationality} · {c.patient?.dob ? `Age ${ageLabel(ageFromDob(c.patient.dob, c.visitDate))}` : '—'}</div>
                          {c.insuranceCompletion?.missingDataNote && (
                            <div className="text-[10px] inline-flex items-center gap-1 mt-0.5 font-semibold" style={{ color: '#B87514' }} title={c.insuranceCompletion.missingDataNote}>
                              <AlertTriangle className="w-3 h-3" /> Missing data flagged
                            </div>
                          )}
                          {c.insuranceCompletion?.onedriveFolderPath && (
                            <div className="text-[10px] inline-flex items-center gap-1 mt-0.5" style={{ color: 'var(--p-ink-400)' }} title={c.insuranceCompletion.onedriveFolderPath}>
                              <FileText className="w-3 h-3" /> Folder linked
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-700)' }}>{c.registeredAtName}</td>
                        <td className="px-3 py-2.5">{c.billingFacility && <FacilityBadge code={c.billingFacility} size="sm" />}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-700)' }}>{c.insurance?.company || '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{c.insurance?.ref || '—'}</td>
                        <td className="px-3 py-2.5">
                          <StatusPill tone={tone}>{label}</StatusPill>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-[11px] font-bold p-btn-ghost">
                            Open <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Completion drawer */}
        {openCase && <CompletionDrawer caseData={openCase} onClose={() => setOpenCaseId(null)} />}
      </div>
    </AdminShell>
  )
}

function KpiTile({ label, value, tone = 'navy' }) {
  const tones = {
    navy:    { bg: 'rgba(255,255,255,0.08)',  fg: 'white' },
    cash:    { bg: 'rgba(15,181,169,0.18)',   fg: '#7FE7DE' },
    pending: { bg: 'rgba(217,165,116,0.22)',  fg: '#FAE2BD' },
  }
  const t = tones[tone] || tones.navy
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: t.bg, border: '1px solid rgba(255,255,255,0.10)' }}>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</div>
      <div className="text-2xl font-bold p-numeric leading-none mt-1" style={{ color: t.fg }}>{value}</div>
    </div>
  )
}

// =====================================================================
function CompletionDrawer({ caseData, onClose }) {
  const { actions } = useDemoState()
  const localAssistance = useLocalAssistance()
  const completion = caseData.insuranceCompletion || {}
  const [form, setForm] = useState({
    invoiceCurrency:    completion.invoiceCurrency || '',
    serviceChargePct:   completion.serviceChargePct ?? '',
    transportationFee:  completion.transportationFee ?? '',
    patientExcess:      completion.patientExcess ?? '',
    localAssistanceId:  completion.localAssistanceId || '',
    localAssistanceRef: completion.localAssistanceRef || '',
    onedriveFolderPath: completion.onedriveFolderPath || '',
    missingDataNote:    completion.missingDataNote || '',
    billingPrepStatus:  completion.billingPrepStatus || 'awaiting_admin_completion',
    adminNotes:         completion.adminNotes || '',
  })

  function fieldsFrom(status) {
    return {
      invoiceCurrency:    form.invoiceCurrency || null,
      serviceChargePct:   form.serviceChargePct === '' ? null : Number(form.serviceChargePct),
      transportationFee:  form.transportationFee === '' ? null : Number(form.transportationFee),
      patientExcess:      form.patientExcess === '' ? null : Number(form.patientExcess),
      localAssistanceId:  form.localAssistanceId || null,
      localAssistanceRef: form.localAssistanceRef || null,
      onedriveFolderPath: form.onedriveFolderPath.trim() || null,
      missingDataNote:    form.missingDataNote.trim() || '',
      billingPrepStatus:  status || form.billingPrepStatus,
      adminNotes:         form.adminNotes || '',
    }
  }

  function save() {
    actions.completeInsurance({ caseId: caseData.id, fields: fieldsFrom() })
    onClose?.()
  }

  // One-click: send straight to the Claude billing queue (saves immediately).
  function markReady() {
    actions.completeInsurance({ caseId: caseData.id, fields: fieldsFrom('ready_for_claude') })
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" style={{ background: 'rgba(8,16,32,0.45)' }}>
      <div className="w-full max-w-[720px] h-full overflow-y-auto" style={{ background: 'white', boxShadow: '-12px 0 32px rgba(8,16,32,0.18)' }}>
        <div className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between gap-4"
             style={{ background: 'white', borderBottom: '1px solid var(--p-border)' }}>
          <div>
            <div className="p-eyebrow" style={{ color: 'var(--p-brand-mid)' }}>Insurance Completion (Stage 2)</div>
            <h2 className="text-lg font-bold mt-0.5" style={{ color: 'var(--p-ink-900)' }}>{caseData.patient?.name}</h2>
            <div className="text-[11px] mt-1 flex items-center gap-2 flex-wrap" style={{ color: 'var(--p-ink-500)' }}>
              <span className="font-mono">{caseData.ourRef}</span>
              {caseData.billingFacility && <FacilityBadge code={caseData.billingFacility} size="sm" />}
              <span>· {caseData.registeredAtName}</span>
              <span>· Visit {fmtDMY(caseData.visitDate)}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full inline-flex items-center justify-center p-btn-ghost"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Stage 1 — read-only */}
          <section>
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold mb-2" style={{ color: 'var(--p-ink-500)' }}>Stage 1 — Operational intake (entered by clinic/reception, read-only)</div>
            <div className="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
                 style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
              <RoLine label="Insurance Company" value={caseData.insurance?.company || '—'} icon={Building2} />
              <RoLine label="Insurance Reference" value={caseData.insurance?.ref || '—'} mono />
              <RoLine label="Insurer Email" value={caseData.insurance?.email || '—'} icon={Mail} />
              <RoLine label="Insurer Phone" value={caseData.insurance?.phone || '—'} icon={Phone} />
            </div>
          </section>

          {/* Stage 2 — admin completion */}
          <section>
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--p-brand-mid)' }}>
              <Lock className="w-3 h-3" /> Stage 2 — Admin completion (protected from clinic/reception users)
            </div>
            <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DrawerField label="Invoice Currency *" icon={Coins}>
                  <div className="relative">
                    <select value={form.invoiceCurrency} onChange={(e) => setForm((p) => ({ ...p, invoiceCurrency: e.target.value }))}
                      className="p-input appearance-none w-full pr-8">
                      <option value="">Select…</option>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
                  </div>
                </DrawerField>

                <DrawerField label="Service Charge % *" icon={Percent}>
                  <input type="number" min="0" max="100" step="0.1"
                    value={form.serviceChargePct}
                    onChange={(e) => setForm((p) => ({ ...p, serviceChargePct: e.target.value }))}
                    placeholder="e.g. 15 or 20" className="p-input" />
                </DrawerField>

                <DrawerField label="Egyptian / Local Assistance Company">
                  <div className="relative">
                    <select value={form.localAssistanceId} onChange={(e) => setForm((p) => ({ ...p, localAssistanceId: e.target.value }))}
                      className="p-input appearance-none w-full pr-8">
                      <option value="">None / Not applicable</option>
                      {localAssistance.map((la) => <option key={la.id} value={la.id}>{la.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
                  </div>
                </DrawerField>

                <DrawerField label="Local Assistance Reference">
                  <input value={form.localAssistanceRef}
                    onChange={(e) => setForm((p) => ({ ...p, localAssistanceRef: e.target.value }))}
                    placeholder="e.g. EGY-AID-12345" className="p-input" />
                </DrawerField>

                <DrawerField label="Transportation / Transfer Charge" icon={Coins} hint="Only if the report documents ambulance/transfer. In invoice currency.">
                  <input type="number" min="0" step="0.01" value={form.transportationFee}
                    onChange={(e) => setForm((p) => ({ ...p, transportationFee: e.target.value }))}
                    placeholder="0.00" className="p-input" />
                </DrawerField>

                <DrawerField label="Patient Excess" icon={Coins} hint="Patient-paid excess / deductible. In invoice currency.">
                  <input type="number" min="0" step="0.01" value={form.patientExcess}
                    onChange={(e) => setForm((p) => ({ ...p, patientExcess: e.target.value }))}
                    placeholder="0.00" className="p-input" />
                </DrawerField>
              </div>

              <DrawerField label="OneDrive Patient Folder / Evidence Path" icon={FileText} hint="Path or link to the case folder (medical report + labs) Claude reads to generate the invoice.">
                <input value={form.onedriveFolderPath}
                  onChange={(e) => setForm((p) => ({ ...p, onedriveFolderPath: e.target.value }))}
                  placeholder="e.g. C:\Users\moham\OneDrive\2026\Sahl Hasheesh Clinics\May\27\Patient Name"
                  className="p-input font-mono text-[11px]" />
              </DrawerField>

              <DrawerField label="Admin Notes (for billing preparation)">
                <textarea rows={3} value={form.adminNotes}
                  onChange={(e) => setForm((p) => ({ ...p, adminNotes: e.target.value }))}
                  placeholder="Any operational note for the billing team"
                  className="p-input resize-y w-full" style={{ minHeight: 70 }} />
              </DrawerField>

              <DrawerField label="Missing-Data Note (does NOT block a draft)" icon={AlertTriangle} hint="Flag anything still missing (e.g. labs not uploaded). Claude can still draft; this is surfaced for follow-up.">
                <textarea rows={2} value={form.missingDataNote}
                  onChange={(e) => setForm((p) => ({ ...p, missingDataNote: e.target.value }))}
                  placeholder="e.g. Labs PDF not yet attached; awaiting discharge summary"
                  className="p-input resize-y w-full" style={{ minHeight: 56 }} />
              </DrawerField>

              <DrawerField label="Billing Prep Status">
                <div className="flex flex-col gap-1.5">
                  {STATUSES.map((s) => (
                    <label key={s.value} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer"
                           style={{
                             background: form.billingPrepStatus === s.value ? 'white' : 'transparent',
                             border: '1px solid ' + (form.billingPrepStatus === s.value ? 'var(--p-brand-mid)' : 'var(--p-border)'),
                           }}>
                      <input type="radio" name="billing_status" value={s.value}
                        checked={form.billingPrepStatus === s.value}
                        onChange={() => setForm((p) => ({ ...p, billingPrepStatus: s.value }))} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--p-ink-900)' }}>{s.label}</span>
                    </label>
                  ))}
                </div>
              </DrawerField>

              <div className="rounded-xl p-3 flex items-start gap-2 text-[11px]"
                   style={{ background: 'var(--p-gold-soft)', color: '#7A4F1F', border: '1px solid #F1E2C9' }}>
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>Invoice Value:</strong> To be generated/linked later through the Claude Code / Invoice Manager workflow.
                  This portal does not generate insurance invoices at this stage.
                </span>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="h-10 px-4 rounded-full text-xs font-semibold p-btn-ghost">Cancel</button>
            <button onClick={markReady}
              className="h-10 px-4 rounded-full text-xs font-bold p-btn-ghost inline-flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5" /> Mark Ready for Claude
            </button>
            <button onClick={save}
              className="h-10 px-5 rounded-full text-xs font-bold p-btn-primary inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Save Completion
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoLine({ label, value, icon: Icon, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
      <div className="mt-1 text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--p-ink-900)' }}>
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color: 'var(--p-ink-400)' }} />}
        <span className={mono ? 'font-mono text-xs' : ''}>{value}</span>
      </div>
    </div>
  )
}

function DrawerField({ label, hint, icon: Icon, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] uppercase tracking-[0.12em] font-bold flex items-center gap-1.5" style={{ color: 'var(--p-brand-mid)' }}>
        {Icon && <Icon className="w-3 h-3" />} {label}
      </label>
      {children}
      {hint && <span className="text-[10px]" style={{ color: 'var(--p-ink-400)' }}>{hint}</span>}
    </div>
  )
}

// Local Info import (lucide-react) — avoid circular by re-exposing inline
function Info(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
}
