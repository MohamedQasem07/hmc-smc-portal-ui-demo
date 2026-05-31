import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, User, Calendar, Building2, Landmark, Wallet, FileText,
  ArrowLeftRight, History, FileLock2, CheckCircle2, Lock, AlertTriangle,
  Save, Receipt, Phone, Mail, IdCard, Plane, Hash, Stethoscope, Plus, Trash2,
  Sparkles, FlaskConical, Banknote,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import {
  PremiumButton, PremiumField, PremiumInput, PremiumSelect, StatusPill,
  MeshCorner, SectionLabel, Avatar,
} from '../../premium/primitives'
import { PrintExportActions, PrintPreviewModal, usePrintPreview } from '../../premium/print'
import { ChangeHistoryDrawer } from '../../premium/governance'
import { useToast } from '../../components/ui/Toast'
import {
  BILLING_FACILITIES, CLINICS, CURRENCIES_LIST, COMPANIES, PAYMENT_METHODS,
  INSURANCE_WORKFLOW, CHANGE_HISTORY,
} from '../../data/controlCenter'
import { CASES, getBranchName } from '../../data/mock'
import { fmtDate, fmtMoney, fmtRelative, ageFromDob } from '../../lib/format'
import { IS_SUPABASE } from '../../lib/api/config'
import LiveCaseWorkspace from './p2c/live/LiveCaseWorkspace'

export default function PremiumAdminCaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const preview = usePrintPreview()
  const [historyOpen, setHistoryOpen] = useState(false)

  // Find the case in the source data — id may be 'c001', 'rep_xxx', or 'leg_xxx'
  const baseCase = CASES.find((c) => c.id === id) || CASES[0]
  const [draft, setDraft] = useState(() => structuredClone(baseCase))
  const [billingFacility, setBillingFacility] = useState(draft.facilityId === 'hmc' ? 'smc' : 'hmc') // example: Tropitel (HMC) opened under SMC
  const [opStatus, setOpStatus] = useState('Open')
  const [iwStatus, setIwStatus] = useState(draft.coverageStatus === 'Confirmed' ? 'GOP Received' : 'Details Pending')

  // Supabase mode: the live active-case workspace replaces this mock detail
  // (mock preserved verbatim below for npm run dev / 5173).
  if (IS_SUPABASE) {
    return (
      <AdminShell active="cases" searchPlaceholder="Search…">
        <LiveCaseWorkspace caseId={id} backTo="/admin/p2c-cases" backLabel="All Cases" />
      </AdminShell>
    )
  }

  const activeCurrencies = CURRENCIES_LIST.filter((c) => c.isActive)

  function setField(path, value) {
    setDraft((d) => {
      const next = { ...d }
      const segs = path.split('.')
      let obj = next
      for (let i = 0; i < segs.length - 1; i++) {
        obj[segs[i]] = { ...obj[segs[i]] }
        obj = obj[segs[i]]
      }
      obj[segs[segs.length - 1]] = value
      return next
    })
  }

  function save()      { toast({ kind: 'success', title: 'Saved — demo only',         message: `${draft.ourRef} updated locally.` }) }
  function markOpen()  { setOpStatus('Open');   toast({ kind: 'info',    title: 'Case marked Open — demo only' }) }
  function markClosed(){ setOpStatus('Closed'); toast({ kind: 'success', title: 'Case closed — demo only' }) }
  function recordPay() { toast({ kind: 'success', title: 'Payment recorded — demo only', message: 'Payment line added to mock state.' }) }

  const mixedCurrency = draft.mixedCurrency

  return (
    <AdminShell active="cases" searchPlaceholder="Search…">
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6 max-w-[1500px] w-full mx-auto pb-32">

        {/* HERO */}
        <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-7 lg:px-10 lg:py-8 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={240} color="#2DD4C7" opacity={0.25} />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-4 lg:justify-between">
            <div className="max-w-3xl">
              <Link to="/admin/cases-master" className="p-eyebrow inline-flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <ChevronLeft className="w-3.5 h-3.5" /> Cases Master
              </Link>
              <h1 className="p-display p-display-light text-[28px] lg:text-[34px] mt-1">
                {draft.patient.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="font-mono px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.10)', color: 'white' }}>{draft.ourRef}</span>
                <StatusPill tone="ghost">{draft.source || 'Portal'}</StatusPill>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{getBranchName(draft.branchId)}</span>
                <span style={{ color: 'rgba(255,255,255,0.30)' }}>·</span>
                <span className="font-mono font-bold uppercase" style={{ color: '#7FE7DE' }}>{billingFacility}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill tone={draft.financialType === 'Cash' ? 'cash' : draft.financialType === 'Insurance' ? 'insurance' : 'pending'}>{draft.financialType}</StatusPill>
                <StatusPill tone="ghost">{draft.route}</StatusPill>
                <StatusPill tone={opStatus === 'Open' ? 'cash' : 'ghost'}>{opStatus}</StatusPill>
                {draft.financialType === 'Insurance' && <StatusPill tone="teal">{iwStatus}</StatusPill>}
                {mixedCurrency && <StatusPill tone="mixed">Mixed Currency</StatusPill>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PremiumButton variant="ghost" size="md" leftIcon={<History className="w-4 h-4" />} onClick={() => setHistoryOpen(true)}>
                History · {(draft.history || []).length}
              </PremiumButton>
              <PrintExportActions onOpenPreview={preview.onOpenPreview} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* MAIN COLUMN */}
          <div className="space-y-5 p-rise-1">
            {/* Section: Patient & Visit */}
            <section className="p-card p-6">
              <SectionLabel eyebrow="Section 2" title="Patient & Visit" icon={User} />
              <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                <Kv label="Name"        value={draft.patient.name} />
                <Kv label="Gender"      value={draft.patient.gender} />
                <Kv label="DOB · Age"   value={`${fmtDate(draft.patient.dob)} · ${ageFromDob(draft.patient.dob)} yrs`} />
                <Kv label="Nationality" value={draft.patient.nationality} />
                <Kv label="Hotel"       value={draft.hotel} icon={Building2} />
                <Kv label="Phone"       value={draft.patient.phone} icon={Phone} />
                <Kv label="Email"       value={draft.patient.email} icon={Mail} />
                <Kv label="Passport"    value={draft.patient.passport} icon={IdCard} mono />
                <Kv label="Arrival"     value={fmtDate(draft.patient.arrivalDate)} icon={Plane} />
                <Kv label="Departure"   value={fmtDate(draft.patient.departureDate)} icon={Plane} />
                <Kv label="Visit Date"  value={fmtDate(draft.visitDate, { withTime: true })} icon={Calendar} />
                <Kv label="Registered At" value={getBranchName(draft.branchId)} />
              </dl>
            </section>

            {/* Transfer Journey */}
            {(draft.route === 'Transferred In' || draft.route === 'Transferred Out') && (
              <section className="p-card p-6">
                <SectionLabel eyebrow="Section 3" title="Transfer Journey" icon={ArrowLeftRight} />
                <div className="rounded-xl p-4" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <span className="px-3 py-1.5 rounded-lg bg-white border" style={{ borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }}>{draft.transferFromName || getBranchName(draft.branchId)}</span>
                    <span style={{ color: 'var(--p-ink-400)' }}>→</span>
                    <span className="px-3 py-1.5 rounded-lg bg-white border" style={{ borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }}>{draft.transferToName || getBranchName(draft.branchId)}</span>
                  </div>
                  {draft.transferNote && (
                    <div className="mt-3 text-xs italic px-3 py-2 rounded-lg" style={{ background: 'var(--p-transfer-soft)', color: '#5443A8' }}>“{draft.transferNote}”</div>
                  )}
                </div>
              </section>
            )}

            {/* Insurance Details */}
            {draft.financialType === 'Insurance' && (
              <section className="p-card p-6">
                <SectionLabel eyebrow="Section 4 · Insurance" title="Insurance Details" icon={FileText} />

                <div className="rounded-2xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, #FBF5EC 0%, #FFFFFF 60%, #E0F8F6 100%)', border: '1px solid rgba(217,165,116,0.32)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1E4180 0%, #0A1B3D 100%)', color: 'white' }}>
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="p-eyebrow">Admin decision</div>
                      <h3 className="p-h2 text-sm mt-0.5">Insurance Opened Under</h3>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--p-ink-600)' }}>
                        Independent of where the patient was physically registered.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {BILLING_FACILITIES.map((f) => (
                          <button key={f.id} onClick={() => setBillingFacility(f.id)}
                            className="text-start rounded-xl p-3 transition-all"
                            style={billingFacility === f.id
                              ? { background: 'var(--p-brand-deep)', color: 'white', border: '1px solid rgba(15,181,169,0.4)' }
                              : { background: 'white', border: '1px solid var(--p-border-strong)' }}>
                            <div className="flex items-center gap-2.5">
                              <span className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono"
                                    style={billingFacility === f.id ? { background: 'rgba(15,181,169,0.18)', color: '#7FE7DE' } : { background: 'var(--p-brand-pale)', color: 'var(--p-brand-mid)' }}>{f.shortName}</span>
                              <div>
                                <div className="text-[13px] font-bold" style={billingFacility === f.id ? { color: 'white' } : { color: 'var(--p-ink-900)' }}>{f.name}</div>
                                <div className="text-[10px]" style={billingFacility === f.id ? { color: 'rgba(255,255,255,0.65)' } : { color: 'var(--p-ink-500)' }}>{f.usageCount} cases</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <PremiumField label="Insurance Company">
                    <PremiumSelect value={draft.insuranceCompany || ''} onChange={(e) => setField('insuranceCompany', e.target.value)}>
                      <option value="">—</option>
                      {COMPANIES.filter((c) => c.type === 'Insurance Company').map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </PremiumSelect>
                  </PremiumField>
                  <PremiumField label="Assistance Company">
                    <PremiumSelect value={draft.assistanceCompany || ''} onChange={(e) => setField('assistanceCompany', e.target.value)}>
                      <option value="">—</option>
                      {COMPANIES.filter((c) => c.type === 'Assistance Company').map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </PremiumSelect>
                  </PremiumField>
                  <PremiumField label="Insurance Ref">
                    <PremiumInput prefix={<Hash className="w-3.5 h-3.5" />} value={draft.insuranceRef || ''} onChange={(e) => setField('insuranceRef', e.target.value)} />
                  </PremiumField>
                  <PremiumField label="Insurance Workflow Status">
                    <PremiumSelect value={iwStatus} onChange={(e) => setIwStatus(e.target.value)}>
                      {INSURANCE_WORKFLOW.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </PremiumSelect>
                  </PremiumField>
                  <PremiumField label="Diagnosis" className="sm:col-span-2">
                    <PremiumInput prefix={<Stethoscope className="w-3.5 h-3.5" />} value={draft.diagnosis || ''} onChange={(e) => setField('diagnosis', e.target.value)} />
                  </PremiumField>
                </div>
              </section>
            )}

            {/* Cash / Settlement Details */}
            {(draft.financialType === 'Cash' || draft.payments) && (
              <section className="p-card p-6">
                <SectionLabel eyebrow="Section 5 · Settlement" title="Cash / Settlement Details" icon={Wallet} />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <Kv label="Invoice Amount" value={fmtMoney(draft.invoiceTotal, draft.currency)} />
                  <Kv label="Paid"           value={fmtMoney((draft.payments || []).reduce((s, p) => s + p.amount, 0), draft.currency)} />
                  <Kv label="Settlement"     value={<StatusPill tone={mixedCurrency ? 'mixed' : 'cash'}>{mixedCurrency ? 'Mixed Currency · Review' : draft.settlementStatus || 'Paid in Full'}</StatusPill>} />
                </div>

                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--p-border)' }}>
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
                      <tr><th className="text-start px-3 py-2">Amount</th><th className="text-start px-3 py-2">Method</th><th className="text-start px-3 py-2">Reference</th><th className="text-start px-3 py-2">Note</th></tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
                      {(draft.payments || []).map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 font-semibold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmtMoney(p.amount, p.currency)}</td>
                          <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--p-ink-700)' }}>{p.method}</td>
                          <td className="px-3 py-2 text-[11px] font-mono" style={{ color: 'var(--p-ink-500)' }}>{p.ref || '—'}</td>
                          <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{p.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {mixedCurrency && (
                  <div className="mt-4 rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: 'var(--p-mixed-soft)', border: '1px solid rgba(226,106,106,0.32)' }}>
                    <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#B14242' }} />
                    <div className="text-sm" style={{ color: '#7A2828' }}>
                      <div className="font-semibold">Mixed Currency — Admin Review Required</div>
                      <div className="text-[12px] mt-0.5">No automatic conversion. Each currency reported separately.</div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-end">
                  <button onClick={recordPay} className="p-btn-ghost h-9 px-3 text-xs inline-flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Record New Payment
                  </button>
                </div>
              </section>
            )}

            {/* External Invoice Result Recording */}
            <section className="p-card p-6">
              <SectionLabel
                eyebrow="Section 6 · External"
                title="Invoice Result Recording — Admin Only"
                description="Invoice generation remains outside Portal in the protected Claude / Manager workflow. Record only the result here."
                icon={Receipt}
              />
              <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5" style={{ background: 'var(--p-pending-soft)', border: '1px solid rgba(225,161,72,0.32)' }}>
                <Lock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#A1672A' }} />
                <div className="text-[12px]" style={{ color: '#7A4F1F' }}>
                  <span className="font-semibold">No Generate Invoice button.</span> No Open Manager button. The Portal records the result; the Manager remains protected.
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PremiumField label="Workflow Status">
                  <PremiumSelect defaultValue={draft.invoiceReadiness || 'Pending Information'}>
                    {['Pending Information', 'Ready for Invoice', 'Invoice Generated', 'Reviewed', 'Finalized'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </PremiumSelect>
                </PremiumField>
                <PremiumField label="Final Amount">
                  <PremiumInput type="number" defaultValue={draft.finalInvoiceAmount || ''} />
                </PremiumField>
                <PremiumField label="Final Currency">
                  <PremiumSelect defaultValue={draft.finalCurrency || draft.currency || 'EUR'}>
                    {activeCurrencies.map((c) => <option key={c.id} value={c.code}>{c.code}</option>)}
                  </PremiumSelect>
                </PremiumField>
                <PremiumField label="Generated Date">
                  <PremiumInput type="date" defaultValue={(draft.invoiceGeneratedAt || '').slice(0, 10)} />
                </PremiumField>
                <PremiumField label="External Billing Note" className="sm:col-span-2">
                  <PremiumInput defaultValue={draft.externalBillingNote || ''} placeholder="e.g. Generated via Claude / Manager" />
                </PremiumField>
              </div>
            </section>
          </div>

          {/* SIDE COLUMN — Actions */}
          <aside className="space-y-4 lg:sticky lg:top-20 self-start">
            <section className="p-card p-5">
              <SectionLabel eyebrow="Section 8" title="Actions" />
              <div className="space-y-2">
                <PremiumButton fullWidth size="md" leftIcon={<Save className="w-4 h-4" />} onClick={save}>Save Changes</PremiumButton>
                {opStatus === 'Open' ? (
                  <button onClick={markClosed} className="p-btn-ghost h-11 w-full text-sm inline-flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Mark Closed
                  </button>
                ) : (
                  <button onClick={markOpen} className="p-btn-ghost h-11 w-full text-sm inline-flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Re-open Case
                  </button>
                )}
                <button onClick={recordPay} className="p-btn-ghost h-11 w-full text-sm inline-flex items-center justify-center gap-1.5">
                  <Banknote className="w-4 h-4" /> Record Payment
                </button>
              </div>
            </section>

            <section className="p-card p-5" style={{ background: 'linear-gradient(180deg, #FBF5EC 0%, #FFFFFF 100%)', border: '1px solid rgba(217,165,116,0.32)' }}>
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(217,165,116,0.18)', color: '#9A6E36' }}>
                  <FileLock2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: '#9A6E36' }}>Protected</div>
                  <div className="text-sm font-bold mt-0.5" style={{ color: 'var(--p-ink-900)' }}>Manager untouched</div>
                  <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: 'var(--p-ink-600)' }}>
                    No Generate Invoice. No Open Manager. PDF generation happens externally.
                  </p>
                </div>
              </div>
            </section>

            <section className="p-card p-5">
              <SectionLabel eyebrow="Section 7" title="Change History" icon={History} action={<button onClick={() => setHistoryOpen(true)} className="text-[11px] font-semibold" style={{ color: 'var(--p-teal)' }}>Open</button>} />
              <ul className="space-y-2">
                {(draft.history || []).slice(0, 3).map((h, i) => (
                  <li key={i} className="text-[11px]">
                    <div style={{ color: 'var(--p-ink-500)' }}>{fmtRelative(h.at)} · {h.by}</div>
                    <div className="font-medium mt-0.5" style={{ color: 'var(--p-ink-800)' }}>{h.field}: <span className="line-through opacity-60">{h.from || '—'}</span> → <span className="font-bold">{h.to}</span></div>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>

      <ChangeHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} entries={draft.history || CHANGE_HISTORY} />
      <PrintPreviewModal open={preview.open} onClose={preview.onClose} title={`Case ${draft.ourRef} — Demo`} subtitle={`${draft.patient.name} · ${draft.financialType}`}>
        <div className="space-y-4 text-sm">
          <div><strong>Patient:</strong> {draft.patient.name} · {draft.patient.nationality} · DOB {fmtDate(draft.patient.dob)}</div>
          <div><strong>Visit:</strong> {fmtDate(draft.visitDate, { withTime: true })} at {getBranchName(draft.branchId)}</div>
          {draft.financialType === 'Insurance' && (
            <div><strong>Insurance Opened Under:</strong> <span className="font-mono uppercase">{billingFacility}</span> · {draft.insuranceCompany} · ref {draft.insuranceRef}</div>
          )}
          {draft.financialType === 'Cash' && draft.invoiceTotal && (
            <div><strong>Invoice:</strong> {fmtMoney(draft.invoiceTotal, draft.currency)} · {(draft.payments || []).length} payment line(s)</div>
          )}
        </div>
      </PrintPreviewModal>
    </AdminShell>
  )
}

function Kv({ label, value, icon: Icon, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-400)' }}>{label}</div>
      <div className={`text-sm font-medium mt-0.5 flex items-center gap-1.5 ${mono ? 'font-mono text-[12px]' : ''}`} style={{ color: 'var(--p-ink-900)' }}>
        {Icon && <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--p-ink-400)' }} />}
        {value || <span style={{ color: 'var(--p-ink-300)' }}>—</span>}
      </div>
    </div>
  )
}
