import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, MapPin, ArrowLeftRight, Wallet, FileText, Clock,
  Plus, Trash2, AlertTriangle, CheckCircle2, ArrowRight, ChevronLeft,
  Building2, Banknote, Hash, Stethoscope, Calendar, Phone, Mail, IdCard,
  Plane, Inbox, Send, Truck, BadgeInfo, ListChecks, Sparkles, Eye,
} from 'lucide-react'
import { PageHeader, PageBody } from '../../components/layout/PageHeader'
import {
  Card, Button, Badge, Stepper, DocsChecklist,
} from '../../components/ui'
import { Field, Input, Select, Textarea } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useToast } from '../../components/ui/Toast'
import {
  BRANCHES, FACILITIES, HOTELS, NATIONALITIES, INSURANCE_COMPANIES,
  ASSISTANCE_COMPANIES, CASE_PROVIDERS, PAYMENT_METHODS, CASE_SOURCES,
  COVERAGE_STATUSES, TRANSPORT_TYPES, DOC_CHECKLIST_DEFS, emptyChecklist,
  getBranchName, getBranch,
} from '../../data/mock'
import { useUserMode } from '../../context/UserModeContext'
import { CURRENCIES } from '../../lib/format'
import { cn } from '../../lib/cn'

const STEPS = [
  { id: 'context',   label: 'Registration', hint: 'Visit context' },
  { id: 'patient',   label: 'Patient',      hint: 'Demographics' },
  { id: 'route',     label: 'Route',        hint: 'Direct / Transfer' },
  { id: 'financial', label: 'Financial',    hint: 'Cash / Insurance' },
  { id: 'docs',      label: 'Documents',    hint: 'Checklist' },
]

const DEFAULT_VISIT_DATE = '2026-05-26'
const DEFAULT_VISIT_TIME = '10:30'

export default function AddNewCase() {
  const navigate = useNavigate()
  const { user } = useUserMode()
  const { toast } = useToast()
  const branch = getBranch(user.branchId)
  const facility = FACILITIES.find((f) => f.id === user.facilityId) || FACILITIES[0]

  // ---- Step pointer ----
  const [current, setCurrent] = useState('context')

  // ---- Registration context ----
  const [visitDate, setVisitDate] = useState(DEFAULT_VISIT_DATE)
  const [visitTime, setVisitTime] = useState(DEFAULT_VISIT_TIME)
  const [caseSource, setCaseSource] = useState('Walk-in')

  // ---- Patient ----
  const [patient, setPatient] = useState({
    name: '', gender: '', dob: '', nationality: '',
    hotel: '', room: '', postalCode: '', phone: '', email: '',
    arrivalDate: '', departureDate: '', passport: '', note: '',
  })
  const setP = (k, v) => setPatient((p) => ({ ...p, [k]: v }))

  // ---- Route ----
  const [route, setRoute] = useState('Direct')
  const [transfer, setTransfer] = useState({
    receivingFacility: '', receivingBranchId: '',
    transferDate: '', transferTime: '',
    note: '', transportType: 'Ambulance',
  })
  const setT = (k, v) => setTransfer((t) => ({ ...t, [k]: v }))
  const [received, setReceived] = useState({
    fromFacility: '', fromBranchId: '', originalRef: '',
    sentAt: '', receiveAt: '', receiveNote: '', confirmed: false,
  })
  const setR = (k, v) => setReceived((r) => ({ ...r, [k]: v }))

  // ---- Financial ----
  const [financial, setFinancial] = useState('Pending')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceCurrency, setInvoiceCurrency] = useState('EUR')
  const [payments, setPayments] = useState([
    { id: 'p1', amount: '', currency: 'EUR', method: 'Cash', ref: '', note: '' },
  ])
  const [insurance, setInsurance] = useState({
    company: '', assistance: '', ref: '', policyNumber: '',
    caseProvider: '', coverageStatus: 'Details Pending',
    diagnosis: '',
  })
  const setI = (k, v) => setInsurance((i) => ({ ...i, [k]: v }))

  // ---- Documents ----
  const [docs, setDocs] = useState(emptyChecklist())
  const toggleDoc = (k, v) => setDocs((d) => ({ ...d, [k]: v }))

  // ---- Submission ----
  const [submitted, setSubmitted] = useState(false)
  const [demoRef, setDemoRef] = useState('')

  // ---- Derived ----
  const otherBranches = BRANCHES.filter((b) => b.id !== user.branchId)

  const { hasMixed, paidByCurrency } = useMemo(() => {
    const paid = {}
    for (const p of payments) {
      const amt = parseFloat(p.amount) || 0
      paid[p.currency] = (paid[p.currency] || 0) + amt
    }
    const currencies = new Set(Object.keys(paid).filter((c) => paid[c] > 0))
    if (invoiceAmount) currencies.add(invoiceCurrency)
    return { hasMixed: currencies.size > 1, paidByCurrency: paid }
  }, [payments, invoiceCurrency, invoiceAmount])

  const settlement = useMemo(() => {
    if (financial !== 'Cash' || !invoiceAmount) return null
    if (hasMixed) return { tone: 'mixed', label: 'Mixed Currency — Admin Review Required' }
    const paid = paidByCurrency[invoiceCurrency] || 0
    const total = parseFloat(invoiceAmount) || 0
    if (paid >= total && total > 0) return { tone: 'finalized', label: 'Balanced — Paid in Full' }
    if (paid > 0 && paid < total) return { tone: 'pending', label: `Partially Paid · ${paid.toFixed(2)} / ${total.toFixed(2)} ${invoiceCurrency}` }
    return { tone: 'warning', label: 'Not Yet Paid' }
  }, [financial, invoiceAmount, invoiceCurrency, paidByCurrency, hasMixed])

  const visitTooEarly = patient.arrivalDate && visitDate && patient.arrivalDate > visitDate
  const visitTooLate  = patient.departureDate && visitDate && patient.departureDate < visitDate

  function addPayment() {
    setPayments((arr) => [...arr, { id: `p${arr.length + 1}_${Math.random().toString(36).slice(2, 6)}`, amount: '', currency: invoiceCurrency, method: 'Cash', ref: '', note: '' }])
  }
  function updatePayment(idx, key, val) {
    setPayments((arr) => arr.map((p, i) => (i === idx ? { ...p, [key]: val } : p)))
  }
  function removePayment(idx) {
    setPayments((arr) => arr.filter((_, i) => i !== idx))
  }

  function go(stepId) {
    setCurrent(stepId)
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }
  function next() {
    const idx = STEPS.findIndex((s) => s.id === current)
    if (idx < STEPS.length - 1) go(STEPS[idx + 1].id)
  }
  function prev() {
    const idx = STEPS.findIndex((s) => s.id === current)
    if (idx > 0) go(STEPS[idx - 1].id)
  }

  function handleSave() {
    if (!patient.name.trim() || !patient.gender || !visitDate) {
      toast({ kind: 'warning', title: 'Missing details', message: 'Patient name, gender, and visit date are required.' })
      return
    }
    const seq = String(1 + Math.floor(Math.random() * 9000)).padStart(4, '0')
    const ref = `DEMO-${facility.name}-${seq}`
    setDemoRef(ref)
    setSubmitted(true)
    toast({ kind: 'success', title: 'Case registered — demo only', message: `Our Ref ${ref} reserved locally.` })
  }

  if (submitted) {
    return (
      <SuccessState
        ourRef={demoRef}
        patient={patient}
        branchName={branch?.name}
        facility={facility.name}
        financial={financial}
        route={route}
        navigate={navigate}
      />
    )
  }

  const stepIdx = STEPS.findIndex((s) => s.id === current)

  return (
    <>
      <PageHeader
        title="Register New Case"
        description="Capture patient, route, financial classification, and documentation — in under a minute on mobile."
        actions={
          <Button onClick={() => navigate(-1)} variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />}>
            Back
          </Button>
        }
      >
        <div className="mt-4">
          <Stepper steps={STEPS} current={current} onJump={go} />
        </div>
      </PageHeader>

      <PageBody>
        {/* SECTION A — REGISTRATION CONTEXT */}
        {current === 'context' && (
          <Card className="animate-fade-in">
            <SectionHeader
              icon={BadgeInfo}
              title="Registration Context"
              description="Where, when, and how this visit is being recorded."
              action={
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-ink-500 bg-subtle border border-border rounded-md px-2.5 py-1">
                  <Building2 className="w-3.5 h-3.5 text-ink-400" />
                  Registered at <span className="font-semibold text-ink-700">{facility.name} · {branch?.name}</span>
                </div>
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Facility">
                <Input value={`${facility.name} — ${facility.longName}`} disabled />
              </Field>
              <Field label="Registered at Branch">
                <Input value={branch?.name || ''} disabled />
              </Field>
              <Field label="Registered By">
                <Input value={`${user.name} (${user.title})`} disabled />
              </Field>
              <Field label="Visit Date" required>
                <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              </Field>
              <Field label="Visit Time" required>
                <Input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} />
              </Field>
              <Field label="Case Source" required>
                <Select value={caseSource} onChange={(e) => setCaseSource(e.target.value)}>
                  {CASE_SOURCES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>

            <div className="mt-4 rounded-lg bg-sky-50 border border-sky-100 p-3 flex items-start gap-2 text-xs text-sky-900">
              <BadgeInfo className="w-4 h-4 mt-0.5 shrink-0 text-sky-700" />
              <span>The system will generate a demo <span className="font-semibold">Our Ref</span> only after Save. Real ref generation will be handled by the production backend.</span>
            </div>

            <FooterNav stepIdx={stepIdx} onNext={next} />
          </Card>
        )}

        {/* SECTION B — PATIENT */}
        {current === 'patient' && (
          <Card className="animate-fade-in">
            <SectionHeader icon={User} title="Patient Information" description="Demographic and contact details for this encounter." />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Patient Full Name" required className="sm:col-span-2 lg:col-span-2">
                <Input value={patient.name} onChange={(e) => setP('name', e.target.value)} placeholder="e.g. Anna Müller" />
              </Field>
              <Field label="Gender" required>
                <div className="grid grid-cols-2 gap-2">
                  {['Male', 'Female'].map((g) => (
                    <button key={g} type="button" onClick={() => setP('gender', g)}
                      className={cn(
                        'h-11 rounded-lg border text-sm font-medium transition-colors',
                        patient.gender === g ? 'bg-navy-50 border-navy-300 text-navy-900' : 'bg-white border-border-strong text-ink-600 hover:bg-subtle',
                      )}>
                      {g}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Date of Birth"><Input type="date" value={patient.dob} onChange={(e) => setP('dob', e.target.value)} /></Field>
              <Field label="Nationality">
                <Select value={patient.nationality} onChange={(e) => setP('nationality', e.target.value)}>
                  <option value="">Select nationality…</option>
                  {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </Field>
              <Field label="Hotel / Accommodation">
                <Select value={patient.hotel} onChange={(e) => setP('hotel', e.target.value)}>
                  <option value="">Select hotel…</option>
                  {HOTELS.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
              </Field>
              <Field label="Room Number"><Input value={patient.room} onChange={(e) => setP('room', e.target.value)} placeholder="e.g. 214" /></Field>
              <Field label="Postal Code"><Input value={patient.postalCode} onChange={(e) => setP('postalCode', e.target.value)} placeholder="optional" /></Field>
              <Field label="Phone Number"><Input prefix={<Phone className="w-3.5 h-3.5" />} value={patient.phone} onChange={(e) => setP('phone', e.target.value)} placeholder="+30 210 …" /></Field>
              <Field label="Email Address"><Input prefix={<Mail className="w-3.5 h-3.5" />} type="email" value={patient.email} onChange={(e) => setP('email', e.target.value)} placeholder="optional" /></Field>
              <Field label="Passport Number"><Input prefix={<IdCard className="w-3.5 h-3.5" />} value={patient.passport} onChange={(e) => setP('passport', e.target.value)} placeholder="optional" /></Field>
              <Field label="Arrival Date to Egypt" hint="Optional — used to sanity-check the visit date.">
                <Input type="date" value={patient.arrivalDate} onChange={(e) => setP('arrivalDate', e.target.value)} />
              </Field>
              <Field label="Departure Date from Egypt">
                <Input type="date" value={patient.departureDate} onChange={(e) => setP('departureDate', e.target.value)} />
              </Field>
              <Field label="Basic Clinical / Registration Note" className="sm:col-span-2 lg:col-span-3">
                <Textarea rows={2} value={patient.note} onChange={(e) => setP('note', e.target.value)} placeholder="Optional — chief complaint, language preference, anything useful for the next staff member." />
              </Field>
            </div>

            {(visitTooEarly || visitTooLate) && (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <div>
                  {visitTooEarly && <div>Visit date is <span className="font-semibold">before</span> the patient's arrival date — please double-check.</div>}
                  {visitTooLate  && <div>Visit date is <span className="font-semibold">after</span> the patient's departure date — please double-check.</div>}
                  <div className="mt-1 text-amber-700/90">This is a visual hint — no backend validation runs here.</div>
                </div>
              </div>
            )}

            <FooterNav stepIdx={stepIdx} onPrev={prev} onNext={next} />
          </Card>
        )}

        {/* SECTION C — ROUTE */}
        {current === 'route' && (
          <Card className="animate-fade-in">
            <SectionHeader icon={ArrowLeftRight} title="Route / Movement" description="Is this patient being seen here, sent to another branch, or received from another branch?" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <RouteCard active={route === 'Direct'}             onClick={() => setRoute('Direct')}             icon={MapPin}  title="Direct Case at This Branch" description="Patient is being assessed and treated here." />
              <RouteCard active={route === 'Transferred Out'}    onClick={() => setRoute('Transferred Out')}    icon={Send}    title="Transfer to Another Branch"  description="Same case + same Our Ref continue at the receiving branch." />
              <RouteCard active={route === 'Transferred In'}     onClick={() => setRoute('Transferred In')}     icon={Inbox}   title="Received Transfer"            description="Continue an existing case originated at another branch." />
            </div>

            {route === 'Transferred Out' && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up">
                <Field label="Receiving Facility" required>
                  <Select value={transfer.receivingFacility} onChange={(e) => { setT('receivingFacility', e.target.value); setT('receivingBranchId', '') }}>
                    <option value="">Select facility…</option>
                    {FACILITIES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </Select>
                </Field>
                <Field label="Receiving Branch" required>
                  <Select value={transfer.receivingBranchId} onChange={(e) => setT('receivingBranchId', e.target.value)}>
                    <option value="">Select branch…</option>
                    {otherBranches
                      .filter((b) => !transfer.receivingFacility || b.facility === transfer.receivingFacility)
                      .map((b) => <option key={b.id} value={b.id}>{b.name} · {b.city}</option>)}
                  </Select>
                </Field>
                <Field label="Transfer Date" required><Input type="date" value={transfer.transferDate} onChange={(e) => setT('transferDate', e.target.value)} /></Field>
                <Field label="Transfer Time" required><Input type="time" value={transfer.transferTime} onChange={(e) => setT('transferTime', e.target.value)} /></Field>
                <Field label="Transport Type" required>
                  <Select value={transfer.transportType} onChange={(e) => setT('transportType', e.target.value)}>
                    {TRANSPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </Field>
                <Field label="Transfer Reason / Note" hint="Visible to the receiving branch."><Textarea rows={2} value={transfer.note} onChange={(e) => setT('note', e.target.value)} placeholder="e.g. Suspected fracture — sent for imaging." /></Field>
                <div className="sm:col-span-2 rounded-lg bg-sky-50 border border-sky-100 p-3 text-xs text-sky-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-sky-700" />
                  The <span className="font-semibold">same patient case and same Our Ref</span> continue after transfer. Do not create a new case at the receiving branch reception.
                </div>
              </div>
            )}

            {route === 'Transferred In' && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up">
                <Field label="From Facility" required>
                  <Select value={received.fromFacility} onChange={(e) => { setR('fromFacility', e.target.value); setR('fromBranchId', '') }}>
                    <option value="">Select facility…</option>
                    {FACILITIES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </Select>
                </Field>
                <Field label="From Branch" required>
                  <Select value={received.fromBranchId} onChange={(e) => setR('fromBranchId', e.target.value)}>
                    <option value="">Select branch…</option>
                    {otherBranches
                      .filter((b) => !received.fromFacility || b.facility === received.fromFacility)
                      .map((b) => <option key={b.id} value={b.id}>{b.name} · {b.city}</option>)}
                  </Select>
                </Field>
                <Field label="Original Our Ref" required><Input prefix={<Hash className="w-3.5 h-3.5" />} value={received.originalRef} onChange={(e) => setR('originalRef', e.target.value)} placeholder="DEMO-PORTAL-…" /></Field>
                <Field label="Sent Date / Time"><Input type="datetime-local" value={received.sentAt} onChange={(e) => setR('sentAt', e.target.value)} /></Field>
                <Field label="Receive Date / Time"><Input type="datetime-local" value={received.receiveAt} onChange={(e) => setR('receiveAt', e.target.value)} /></Field>
                <Field label="Receiving Note"><Textarea rows={2} value={received.receiveNote} onChange={(e) => setR('receiveNote', e.target.value)} placeholder="Optional" /></Field>
                <label className="sm:col-span-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-subtle/60 cursor-pointer">
                  <input type="checkbox" checked={received.confirmed} onChange={(e) => setR('confirmed', e.target.checked)} className="rounded border-border-strong text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm text-ink-700">I confirm the patient has physically arrived and is now being assessed here.</span>
                </label>
              </div>
            )}

            <FooterNav stepIdx={stepIdx} onPrev={prev} onNext={next} />
          </Card>
        )}

        {/* SECTION D — FINANCIAL */}
        {current === 'financial' && (
          <Card className="animate-fade-in">
            <SectionHeader icon={Wallet} title="Financial Classification" description="How is this visit being paid for? You can leave Pending and update later." />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FinancialCard active={financial === 'Pending'}   onClick={() => setFinancial('Pending')}   tone="pending"   icon={Clock}    title="Pending"   description="Not determined yet." />
              <FinancialCard active={financial === 'Cash'}      onClick={() => setFinancial('Cash')}      tone="cash"      icon={Banknote} title="Cash"      description="Patient pays directly at the branch." />
              <FinancialCard active={financial === 'Insurance'} onClick={() => setFinancial('Insurance')} tone="insurance" icon={FileText} title="Insurance" description="Covered by an insurance / assistance company." />
            </div>

            <div className="mt-3 text-[11px] text-ink-400 flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-ink-200" />
              Future option: <span className="font-medium text-ink-500">Free / Charity</span> — disabled, requires owner approval before adding.
            </div>

            {financial === 'Cash' && (
              <div className="mt-5 animate-slide-up space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Invoice Total Amount" required>
                    <Input type="number" inputMode="decimal" min="0" step="0.01" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Invoice Currency" required>
                    <Select value={invoiceCurrency} onChange={(e) => setInvoiceCurrency(e.target.value)}>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </Field>
                  {settlement && (
                    <div className="flex items-end">
                      <div className="w-full">
                        <div className="text-xs font-medium text-ink-600 mb-1.5">Settlement</div>
                        <div className="h-11 inline-flex items-center px-3 rounded-lg border border-border bg-subtle/50 w-full">
                          <Badge tone={settlement.tone}>{settlement.label}</Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-subtle/40">
                  <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
                    <div>
                      <div className="text-sm font-semibold text-ink-900">Payment Lines</div>
                      <div className="text-xs text-ink-500">Each row is one payment received from the patient.</div>
                    </div>
                    <Button type="button" onClick={addPayment} variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>Add Payment Line</Button>
                  </div>
                  <div className="divide-y divide-border">
                    {payments.map((p, idx) => (
                      <div key={p.id} className="grid grid-cols-12 gap-2 sm:gap-3 p-3 sm:p-4 items-end bg-white">
                        <div className="col-span-12 sm:col-span-2"><Field label="Amount"><Input type="number" inputMode="decimal" min="0" step="0.01" value={p.amount} onChange={(e) => updatePayment(idx, 'amount', e.target.value)} placeholder="0.00" /></Field></div>
                        <div className="col-span-6  sm:col-span-2"><Field label="Currency"><Select value={p.currency} onChange={(e) => updatePayment(idx, 'currency', e.target.value)}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field></div>
                        <div className="col-span-6  sm:col-span-2"><Field label="Method"><Select value={p.method} onChange={(e) => updatePayment(idx, 'method', e.target.value)}>{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</Select></Field></div>
                        <div className="col-span-12 sm:col-span-2"><Field label="Reference"><Input value={p.ref} onChange={(e) => updatePayment(idx, 'ref', e.target.value)} placeholder="Auth / receipt #" /></Field></div>
                        <div className="col-span-10 sm:col-span-3"><Field label="Note"><Input value={p.note} onChange={(e) => updatePayment(idx, 'note', e.target.value)} placeholder="Optional note" /></Field></div>
                        <div className="col-span-2  sm:col-span-1 flex justify-end">
                          <button type="button" onClick={() => removePayment(idx)} disabled={payments.length === 1} aria-label="Remove payment line"
                            className="h-11 w-11 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-400 flex items-center justify-center">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {hasMixed && (
                  <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 flex items-start gap-2 animate-slide-up">
                    <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-semibold text-orange-900">Mixed Currency Collections — Admin Review Required</div>
                      <div className="text-xs text-orange-800/90 mt-0.5">No automatic reconciliation before an approved exchange-rate policy exists. Each currency is reported separately.</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(paidByCurrency).filter(([, v]) => v > 0).map(([cur, v]) => <Badge key={cur} tone="mixed">{cur} {v.toFixed(2)}</Badge>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {financial === 'Insurance' && (
              <div className="mt-5 animate-slide-up grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Insured By / Insurance Company" required>
                  <Select value={insurance.company} onChange={(e) => setI('company', e.target.value)}>
                    <option value="">Select insurance company…</option>
                    {INSURANCE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Insurance Reference" required>
                  <Input prefix={<Hash className="w-3.5 h-3.5" />} value={insurance.ref} onChange={(e) => setI('ref', e.target.value)} placeholder="e.g. AXA-2026-58712" />
                </Field>
                <Field label="Assistance Company">
                  <Select value={insurance.assistance} onChange={(e) => setI('assistance', e.target.value)}>
                    <option value="">Select assistance…</option>
                    {ASSISTANCE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Policy Number"><Input value={insurance.policyNumber} onChange={(e) => setI('policyNumber', e.target.value)} placeholder="optional" /></Field>
                <Field label="Case Provider">
                  <Select value={insurance.caseProvider} onChange={(e) => setI('caseProvider', e.target.value)}>
                    <option value="">Select provider…</option>
                    {CASE_PROVIDERS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Coverage Status" required>
                  <Select value={insurance.coverageStatus} onChange={(e) => setI('coverageStatus', e.target.value)}>
                    {COVERAGE_STATUSES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Initial Diagnosis" className="sm:col-span-2">
                  <Input prefix={<Stethoscope className="w-3.5 h-3.5" />} value={insurance.diagnosis} onChange={(e) => setI('diagnosis', e.target.value)} placeholder="Optional — short clinical impression" />
                </Field>
                <div className="sm:col-span-2 rounded-lg bg-sky-50 border border-sky-100 p-3 text-xs text-sky-900 flex items-start gap-2">
                  <BadgeInfo className="w-4 h-4 mt-0.5 shrink-0 text-sky-700" />
                  Clinic staff enter only these basic insurance details. <span className="font-semibold">Final invoice amount, service charge, and Manager actions are admin-only and not visible here.</span>
                </div>
              </div>
            )}

            <FooterNav stepIdx={stepIdx} onPrev={prev} onNext={next} />
          </Card>
        )}

        {/* SECTION E — DOCUMENTS */}
        {current === 'docs' && (
          <Card className="animate-fade-in">
            <SectionHeader icon={ListChecks} title="Documentation Checklist" description="Mark which paperwork has been collected — concept only, no file upload in this prototype." />
            <DocsChecklist value={docs} onToggle={toggleDoc} />

            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <span>This checklist is a UI concept. No real files are stored. Real document upload + retention will be designed in a later approved sprint.</span>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-[11px] text-ink-500 inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Saving generates a demo <span className="font-mono">Our Ref</span> and shows it on the success screen. No database writes.
              </div>
              <div className="flex items-center gap-2 sm:ms-auto">
                <Button variant="ghost" onClick={prev}>Back</Button>
                <Button onClick={handleSave} size="lg" leftIcon={<Sparkles className="w-4 h-4" />}>Save Case</Button>
              </div>
            </div>
          </Card>
        )}
      </PageBody>
    </>
  )
}

// --------------------------------------------------------------------
// Reusable sub-components
// --------------------------------------------------------------------
function FooterNav({ stepIdx, onPrev, onNext }) {
  return (
    <div className="mt-5 flex items-center justify-between gap-2">
      {stepIdx > 0 ? (
        <Button variant="ghost" onClick={onPrev} leftIcon={<ChevronLeft className="w-4 h-4" />}>Back</Button>
      ) : <span />}
      <Button onClick={onNext} rightIcon={<ArrowRight className="w-4 h-4" />}>Continue</Button>
    </div>
  )
}

function RouteCard({ active, onClick, icon: Icon, title, description }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'text-start rounded-xl border p-4 transition-all',
        active ? 'border-navy-300 bg-navy-50 shadow-card' : 'border-border-strong bg-white hover:bg-subtle',
      )}>
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', active ? 'bg-navy-700 text-white' : 'bg-subtle text-ink-500')}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-ink-900">{title}</div>
          <div className="text-xs text-ink-500 mt-0.5">{description}</div>
        </div>
        <div className="ms-auto">
          <span className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
            active ? 'border-navy-700 bg-navy-700 text-white' : 'border-border-strong',
          )}>
            {active && <CheckCircle2 className="w-3 h-3" />}
          </span>
        </div>
      </div>
    </button>
  )
}

function FinancialCard({ active, onClick, icon: Icon, title, description, tone }) {
  const activeStyles = {
    pending:   'border-amber-300 bg-amber-50',
    cash:      'border-emerald-300 bg-emerald-50',
    insurance: 'border-sky-300 bg-sky-50',
  }[tone] || 'border-navy-300 bg-navy-50'
  const iconActive = {
    pending:   'bg-amber-600 text-white',
    cash:      'bg-emerald-600 text-white',
    insurance: 'bg-sky-600 text-white',
  }[tone] || 'bg-navy-700 text-white'

  return (
    <button type="button" onClick={onClick}
      className={cn(
        'text-start rounded-xl border p-4 transition-all',
        active ? cn(activeStyles, 'shadow-card') : 'border-border-strong bg-white hover:bg-subtle',
      )}>
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', active ? iconActive : 'bg-subtle text-ink-500')}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-ink-900">{title}</div>
          <div className="text-xs text-ink-500 mt-0.5">{description}</div>
        </div>
      </div>
    </button>
  )
}

function SuccessState({ ourRef, patient, branchName, facility, financial, route, navigate }) {
  return (
    <PageBody>
      <div className="max-w-2xl mx-auto mt-6 sm:mt-12">
        <Card padding="lg" className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-ink-900">Case Registered Successfully</h2>
          <p className="text-sm text-ink-500 mt-1">Demo only — no real database write was performed.</p>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-start">
            <SuccessCell label="Our Ref"        value={<span className="font-mono">{ourRef}</span>} highlight />
            <SuccessCell label="Patient"        value={patient.name || '—'} />
            <SuccessCell label="Branch"         value={`${facility} · ${branchName}`} />
            <SuccessCell label="Financial Type" value={financial} />
            <SuccessCell label="Route"          value={route} className="col-span-2 sm:col-span-4" />
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
            <Button as={Link} to="/clinic/cases" variant="secondary" size="lg" leftIcon={<Eye className="w-4 h-4" />}>View My Cases</Button>
            <Button onClick={() => navigate('/clinic/dashboard')} variant="secondary" size="lg">Back to Dashboard</Button>
            <Button onClick={() => window.location.reload()} size="lg" leftIcon={<Plus className="w-4 h-4" />}>Register Another</Button>
          </div>
        </Card>
      </div>
    </PageBody>
  )
}

function SuccessCell({ label, value, highlight, className }) {
  return (
    <div className={cn(
      'rounded-lg border p-3',
      highlight ? 'bg-navy-50 border-navy-100' : 'bg-subtle/50 border-border',
      className,
    )}>
      <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{label}</div>
      <div className={cn('text-sm font-semibold mt-0.5 truncate', highlight ? 'text-navy-900' : 'text-ink-900')}>{value}</div>
    </div>
  )
}
