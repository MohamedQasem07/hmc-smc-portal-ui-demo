import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, MapPin, ArrowLeftRight, Wallet, FileText, Clock, Plus, Trash2,
  AlertTriangle, CheckCircle2, ArrowRight, ChevronLeft, Building2, Banknote,
  Hash, Stethoscope, Landmark, Sparkles, FlaskConical, ShieldCheck,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import {
  PremiumKpi, PremiumButton, PremiumField, PremiumInput, PremiumSelect,
  StatusPill, MeshCorner, PremiumStepper, SectionLabel, Avatar,
} from '../../premium/primitives'
import { useToast } from '../../components/ui/Toast'
import {
  BILLING_FACILITIES, CLINICS, CURRENCIES_LIST, COMPANIES, PAYMENT_METHODS,
  INSURANCE_WORKFLOW,
} from '../../data/controlCenter'
import { cn } from '../../lib/cn'

const STEPS = [
  { id: 'context',   label: 'Visit' },
  { id: 'patient',   label: 'Patient' },
  { id: 'financial', label: 'Financial' },
  { id: 'review',    label: 'Review & Save' },
]

export default function PremiumAdminNewCase() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [current, setCurrent] = useState('financial') // start on Financial to demo Insurance Opened Under selector
  const [clinic, setClinic] = useState('tropitel')
  const [billingFacility, setBillingFacility] = useState('smc') // example: registered at Tropitel (HMC) but opened under SMC
  const [visitDate, setVisitDate] = useState('2026-05-27')
  const [visitTime, setVisitTime] = useState('10:30')
  const [financial, setFinancial] = useState('Insurance')
  const [patient, setPatient] = useState({ name: 'Hannah Becker (DEMO)', gender: 'Female', nationality: 'German', hotel: 'Coral Bay Resort Demo' })

  // Cash
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceCurrency, setInvoiceCurrency] = useState('EUR')
  const [payments, setPayments] = useState([{ id: 'p1', amount: '', currency: 'EUR', method: 'Cash', ref: '' }])

  // Insurance
  const [insurance, setInsurance] = useState({ company: '', insuranceRef: '', assistance: '', coverageStatus: 'NOC Requested', diagnosis: '' })

  const activeCurrencies = CURRENCIES_LIST.filter((c) => c.inRegistration && c.isActive)
  const insuranceCompanies = COMPANIES.filter((c) => c.type === 'Insurance Company' && c.status === 'Active')

  const { hasMixed, paidByCurrency } = useMemo(() => {
    const paid = {}
    for (const p of payments) {
      const amt = parseFloat(p.amount) || 0
      paid[p.currency] = (paid[p.currency] || 0) + amt
    }
    const used = new Set(Object.keys(paid).filter((c) => paid[c] > 0))
    if (invoiceAmount) used.add(invoiceCurrency)
    return { hasMixed: used.size > 1, paidByCurrency: paid }
  }, [payments, invoiceCurrency, invoiceAmount])

  function go(id) { setCurrent(id); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' })) }

  function handleSave() {
    const seq = String(1 + Math.floor(Math.random() * 9000)).padStart(4, '0')
    const fac = BILLING_FACILITIES.find((f) => f.id === billingFacility)?.shortName || 'HMC'
    const ref = `DEMO-${fac}-${seq}`
    toast({ kind: 'success', title: 'Case registered — demo only', message: `Our Ref ${ref} reserved locally.` })
    navigate('/design-preview/admin/cases-master')
  }

  return (
    <AdminShell active="new-case" searchPlaceholder="Search…">
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6 max-w-[1300px] w-full mx-auto pb-32">

        {/* HERO */}
        <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-7 lg:px-10 lg:py-9 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={280} color="#2DD4C7" opacity={0.28} />
          <MeshCorner position="bl" size={240} color="#1E4180" opacity={0.20} />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-5 lg:justify-between">
            <div className="max-w-2xl">
              <div className="p-eyebrow" style={{ color: '#7FE7DE' }}>
                <Sparkles className="w-3.5 h-3.5" /> Admin · New Case Registration
              </div>
              <h1 className="p-display p-display-light text-[30px] lg:text-[36px] mt-2">
                Register a new case <span style={{ color: '#7FE7DE' }}>as Admin.</span>
              </h1>
              <p className="text-sm lg:text-base mt-2 max-w-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Admin can register cases at any clinic and open insurance cases under HMC or SMC explicitly. All interactions are local mock state.
              </p>
            </div>
            <Link to="/design-preview/admin-dashboard" className="p-btn-ghost h-10 px-4 text-sm inline-flex items-center gap-1.5 self-start lg:self-auto">
              <ChevronLeft className="w-4 h-4" /> Back
            </Link>
          </div>
        </section>

        {/* STEPPER */}
        <div className="p-card px-4 py-3.5 p-rise-1">
          <PremiumStepper steps={STEPS} current={current} onJump={go} />
        </div>

        {/* SECTION A — VISIT CONTEXT */}
        {current === 'context' && (
          <section className="p-hero-card p-6 lg:p-8 p-rise-1 relative">
            <MeshCorner position="tr" size={160} color="#0FB5A9" opacity={0.08} />
            <SectionLabel eyebrow="Section A · Visit" title="Where & when" description="Admin can register a case on behalf of any clinic, on any date." />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <PremiumField label="Registered At Clinic" required>
                <PremiumSelect value={clinic} onChange={(e) => setClinic(e.target.value)}>
                  {CLINICS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </PremiumSelect>
              </PremiumField>
              <PremiumField label="Visit Date" required><PremiumInput type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} /></PremiumField>
              <PremiumField label="Visit Time" required><PremiumInput type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} /></PremiumField>
            </div>
            <FooterNav onNext={() => go('patient')} />
          </section>
        )}

        {/* SECTION B — PATIENT (compact for admin demo) */}
        {current === 'patient' && (
          <section className="p-hero-card p-6 lg:p-8 p-rise-1 relative">
            <SectionLabel eyebrow="Section B · Patient" title="Patient information" description="All standard demographics. Fields shown demo-only." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PremiumField label="Patient Full Name" required><PremiumInput value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} /></PremiumField>
              <PremiumField label="Gender" required>
                <div className="grid grid-cols-2 gap-2">
                  {['Male', 'Female'].map((g) => (
                    <button key={g} type="button" onClick={() => setPatient({ ...patient, gender: g })}
                      className="h-11 rounded-xl text-sm font-semibold transition-all"
                      style={patient.gender === g
                        ? { background: 'var(--p-brand-deep)', color: 'white', border: '1px solid rgba(255,255,255,0.04)' }
                        : { background: 'var(--p-surface)', color: 'var(--p-ink-600)', border: '1px solid var(--p-border-strong)' }}>
                      {g}
                    </button>
                  ))}
                </div>
              </PremiumField>
              <PremiumField label="Nationality">
                <PremiumInput value={patient.nationality} onChange={(e) => setPatient({ ...patient, nationality: e.target.value })} placeholder="Searchable from approved reference catalogue (future)" />
              </PremiumField>
              <PremiumField label="Hotel"><PremiumInput value={patient.hotel} onChange={(e) => setPatient({ ...patient, hotel: e.target.value })} /></PremiumField>
            </div>
            <div className="mt-4 rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: 'var(--p-insurance-soft)', border: '1px solid rgba(15,181,169,0.20)' }}>
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#0A8F87' }} />
              <span className="text-[12px]" style={{ color: '#0A6E64' }}>
                Final implementation connects Nationality to the existing approved world reference list — not managed manually in Admin settings.
              </span>
            </div>
            <FooterNav onPrev={() => go('context')} onNext={() => go('financial')} />
          </section>
        )}

        {/* SECTION C — FINANCIAL */}
        {current === 'financial' && (
          <section className="p-hero-card p-6 lg:p-8 p-rise-1 relative">
            <MeshCorner position="tr" size={180} color="#D9A574" opacity={0.10} />
            <SectionLabel eyebrow="Section C · Financial" title="How will this case be paid?" description="Admin can also leave Pending and update later." />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {['Pending', 'Cash', 'Insurance'].map((f) => (
                <FinancialCard key={f} value={f} active={financial === f} onClick={() => setFinancial(f)} />
              ))}
            </div>

            {/* INSURANCE OPENED UNDER — the key admin selector */}
            {financial === 'Insurance' && (
              <div className="rounded-2xl p-5 mb-5" style={{ background: 'linear-gradient(135deg, #FBF5EC 0%, #FFFFFF 60%, #E0F8F6 100%)', border: '1px solid rgba(217, 165, 116, 0.32)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1E4180 0%, #0A1B3D 100%)', color: 'white', boxShadow: '0 6px 16px rgba(10,27,61,0.20)' }}>
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="p-eyebrow">Admin decision · Required for Insurance</div>
                    <h3 className="p-h2 text-base mt-1">Open Insurance Case Under</h3>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--p-ink-600)' }}>
                      Independent of where the patient was physically registered. Example: registered at Tropitel Clinic, opened under SMC.
                    </p>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {BILLING_FACILITIES.map((f) => (
                        <button key={f.id} type="button" onClick={() => setBillingFacility(f.id)}
                          className="text-start rounded-xl p-4 transition-all"
                          style={billingFacility === f.id
                            ? { background: 'var(--p-brand-deep)', color: 'white', border: '1px solid rgba(15,181,169,0.4)', boxShadow: 'var(--p-shadow-card)' }
                            : { background: 'white', border: '1px solid var(--p-border-strong)' }}>
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-lg flex items-center justify-center"
                                  style={billingFacility === f.id ? { background: 'rgba(15,181,169,0.18)', color: '#7FE7DE' } : { background: 'var(--p-brand-pale)', color: 'var(--p-brand-mid)' }}>
                              <span className="text-[13px] font-bold font-mono">{f.shortName}</span>
                            </span>
                            <div>
                              <div className="text-sm font-bold" style={billingFacility === f.id ? { color: 'white' } : { color: 'var(--p-ink-900)' }}>{f.name}</div>
                              <div className="text-[11px] mt-0.5" style={billingFacility === f.id ? { color: 'rgba(255,255,255,0.65)' } : { color: 'var(--p-ink-500)' }}>{f.usageCount} active cases</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {financial === 'Insurance' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <PremiumField label="Insurance Company" required>
                  <PremiumSelect value={insurance.company} onChange={(e) => setInsurance({ ...insurance, company: e.target.value })}>
                    <option value="">Select…</option>
                    {insuranceCompanies.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </PremiumSelect>
                </PremiumField>
                <PremiumField label="Insurance Reference" required>
                  <PremiumInput prefix={<Hash className="w-3.5 h-3.5" />} value={insurance.insuranceRef} onChange={(e) => setInsurance({ ...insurance, insuranceRef: e.target.value })} />
                </PremiumField>
                <PremiumField label="Insurance Workflow Status">
                  <PremiumSelect value={insurance.coverageStatus} onChange={(e) => setInsurance({ ...insurance, coverageStatus: e.target.value })}>
                    {INSURANCE_WORKFLOW.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </PremiumSelect>
                </PremiumField>
                <PremiumField label="Diagnosis"><PremiumInput prefix={<Stethoscope className="w-3.5 h-3.5" />} value={insurance.diagnosis} onChange={(e) => setInsurance({ ...insurance, diagnosis: e.target.value })} /></PremiumField>
              </div>
            )}

            {financial === 'Cash' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <PremiumField label="Invoice Total" required><PremiumInput type="number" min="0" step="0.01" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} /></PremiumField>
                  <PremiumField label="Currency" required>
                    <PremiumSelect value={invoiceCurrency} onChange={(e) => setInvoiceCurrency(e.target.value)}>
                      {activeCurrencies.map((c) => <option key={c.id} value={c.code}>{c.code} — {c.name}</option>)}
                    </PremiumSelect>
                  </PremiumField>
                </div>

                <div className="rounded-xl bg-[var(--p-surface-tint)] p-4 mb-4 border" style={{ borderColor: 'var(--p-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>Payment Lines</div>
                    <button onClick={() => setPayments([...payments, { id: `p${payments.length+1}`, amount: '', currency: invoiceCurrency, method: 'Cash', ref: '' }])}
                            className="p-btn-ghost h-8 px-3 text-xs inline-flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Add line
                    </button>
                  </div>
                  {payments.map((p, idx) => (
                    <div key={p.id} className="grid grid-cols-12 gap-2 mb-2">
                      <div className="col-span-3"><PremiumInput type="number" min="0" step="0.01" placeholder="Amount" value={p.amount} onChange={(e) => { const v = [...payments]; v[idx].amount = e.target.value; setPayments(v) }} /></div>
                      <div className="col-span-2"><PremiumSelect value={p.currency} onChange={(e) => { const v = [...payments]; v[idx].currency = e.target.value; setPayments(v) }}>{activeCurrencies.map((c) => <option key={c.id} value={c.code}>{c.code}</option>)}</PremiumSelect></div>
                      <div className="col-span-3"><PremiumSelect value={p.method} onChange={(e) => { const v = [...payments]; v[idx].method = e.target.value; setPayments(v) }}>{PAYMENT_METHODS.filter(m => m.isActive).map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}</PremiumSelect></div>
                      <div className="col-span-3"><PremiumInput placeholder="Reference" value={p.ref} onChange={(e) => { const v = [...payments]; v[idx].ref = e.target.value; setPayments(v) }} /></div>
                      <div className="col-span-1 flex items-center justify-end">
                        <button onClick={() => setPayments(payments.filter((_, i) => i !== idx))} disabled={payments.length === 1} className="w-9 h-9 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30" style={{ color: '#B14242' }}>
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {hasMixed && (
                  <div className="rounded-xl p-3.5 flex items-start gap-2.5" style={{ background: 'var(--p-mixed-soft)', border: '1px solid rgba(226, 106, 106, 0.32)' }}>
                    <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#B14242' }} />
                    <div className="text-sm" style={{ color: '#7A2828' }}>
                      <div className="font-semibold">Mixed Currency — Admin Review Required</div>
                      <div className="text-[12px] mt-0.5">No automatic reconciliation. Each currency is reported separately.</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(paidByCurrency).filter(([, v]) => v > 0).map(([cur, v]) => <StatusPill key={cur} tone="mixed">{cur} {v.toFixed(2)}</StatusPill>)}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <FooterNav onPrev={() => go('patient')} onNext={() => go('review')} />
          </section>
        )}

        {/* SECTION D — REVIEW */}
        {current === 'review' && (
          <section className="p-hero-card p-6 lg:p-8 p-rise-1 relative">
            <SectionLabel eyebrow="Section D · Review" title="Review & Save" description="Confirm everything before saving (demo only)." />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <ReviewKv label="Patient" value={patient.name} />
              <ReviewKv label="Visit" value={`${visitDate} · ${visitTime}`} />
              <ReviewKv label="Registered At" value={CLINICS.find((c) => c.id === clinic)?.name} />
              <ReviewKv label="Financial Type" value={financial} />
              {financial === 'Insurance' && <ReviewKv label="Insurance Opened Under" value={BILLING_FACILITIES.find((f) => f.id === billingFacility)?.name} accent />}
              {financial === 'Insurance' && <ReviewKv label="Insurance Company" value={insurance.company || '—'} />}
              {financial === 'Cash' && <ReviewKv label="Invoice" value={invoiceAmount ? `${invoiceAmount} ${invoiceCurrency}` : '—'} />}
            </div>

            <div className="rounded-xl px-4 py-3.5 flex items-start gap-2.5 mb-5" style={{ background: 'var(--p-pending-soft)', border: '1px solid rgba(225, 161, 72, 0.32)' }}>
              <FlaskConical className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#A1672A' }} />
              <span className="text-[12px]" style={{ color: '#7A4F1F' }}>
                Saving generates a demo <span className="font-mono">Our Ref</span> and lands you on the Admin Cases Master. No database write.
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button className="p-btn-ghost h-11 px-4 text-sm inline-flex items-center gap-1.5" onClick={() => go('financial')}>
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <PremiumButton size="lg" leftIcon={<Sparkles className="w-4 h-4" />} onClick={handleSave}>
                Save Case (demo)
              </PremiumButton>
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  )
}

function FinancialCard({ value, active, onClick }) {
  const meta = {
    Pending:   { tone: 'pending',   icon: Clock,    desc: 'Not determined yet.' },
    Cash:      { tone: 'cash',      icon: Banknote, desc: 'Patient pays directly.' },
    Insurance: { tone: 'insurance', icon: FileText, desc: 'Insurance or assistance company covers.' },
  }[value]
  const activeStyles = {
    pending:   { border: '#E1A148', bg: 'var(--p-pending-soft)',   iconBg: '#E1A148' },
    cash:      { border: '#0A8F62', bg: 'var(--p-cash-soft)',      iconBg: '#0A8F62' },
    insurance: { border: '#0FB5A9', bg: 'var(--p-insurance-soft)', iconBg: '#0FB5A9' },
  }[meta.tone]
  return (
    <button type="button" onClick={onClick}
      className="text-start rounded-xl p-4 transition-all"
      style={active
        ? { background: activeStyles.bg, border: `1px solid ${activeStyles.border}`, boxShadow: 'var(--p-shadow-card)' }
        : { background: 'var(--p-surface)', border: '1px solid var(--p-border-strong)' }}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={active ? { background: activeStyles.iconBg, color: 'white' } : { background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
          <meta.icon className="w-5 h-5" />
        </span>
        <div>
          <div className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{value}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{meta.desc}</div>
        </div>
      </div>
    </button>
  )
}

function ReviewKv({ label, value, accent }) {
  return (
    <div className="rounded-xl p-3.5" style={accent
      ? { background: 'var(--p-insurance-soft)', border: '1px solid rgba(15,181,169,0.32)' }
      : { background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: accent ? '#0A6E64' : 'var(--p-ink-500)' }}>{label}</div>
      <div className="text-sm font-bold mt-0.5" style={{ color: accent ? '#0A6E64' : 'var(--p-ink-900)' }}>{value || '—'}</div>
    </div>
  )
}

function FooterNav({ onPrev, onNext }) {
  return (
    <div className="mt-5 flex items-center justify-between gap-2">
      {onPrev ? <button className="p-btn-ghost h-11 px-4 text-sm inline-flex items-center gap-1.5" onClick={onPrev}><ChevronLeft className="w-4 h-4" /> Back</button> : <span />}
      <PremiumButton size="md" rightIcon={<ArrowRight className="w-4 h-4" />} onClick={onNext}>Continue</PremiumButton>
    </div>
  )
}
