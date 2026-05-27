import { useMemo, useState } from 'react'
import {
  ArrowLeftRight, Building2, Clock, ChevronRight, CheckCircle2,
  Inbox, Hash, Stethoscope, FileText, Banknote, Truck, Send, MapPin,
} from 'lucide-react'
import { PageHeader, PageBody } from '../../components/layout/PageHeader'
import { Card, Button, Badge, EmptyState, Modal, Tabs, TransferTimeline } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import { Field, Input, Select } from '../../components/ui/Input'
import {
  CASES, INSURANCE_COMPANIES, COVERAGE_STATUSES, ASSISTANCE_COMPANIES, PAYMENT_METHODS,
  getBranchName, getBranch,
} from '../../data/mock'
import { useUserMode } from '../../context/UserModeContext'
import { fmtDate, fmtRelative, CURRENCIES } from '../../lib/format'
import { FINANCIAL_TONE, TRANSPORT_TONE } from '../../components/ui/Badge'

/**
 * IncomingTransfers — P1 upgrade.
 * States (computed):
 *   1. Sent / Awaiting Receipt
 *   2. Received → Classification Pending
 *   3. Received → Cash
 *   4. Received → Insurance
 *
 * The Receive modal walks the user through:
 *   - Confirm receipt (records `transferReceivedAt`)
 *   - Then prompts Financial Classification
 *   - Then captures Cash payment / Insurance fields
 *
 * Everything is local React state — no backend writes.
 */
export default function IncomingTransfers() {
  const { user } = useUserMode()
  const { toast } = useToast()
  const branch = getBranch(user.branchId)

  // Local overrides on top of mock data — keeps state during the demo session.
  const [overrides, setOverrides] = useState({})
  const merged = useMemo(
    () => CASES.map((c) => ({ ...c, ...(overrides[c.id] || {}) })),
    [overrides],
  )

  const incoming = useMemo(
    () => merged.filter((c) => c.route === 'Transferred In' && c.branchId === user.branchId),
    [merged, user.branchId],
  )

  const [tab, setTab] = useState('all')
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState('confirm')  // confirm → classify → cash → insurance → done
  const [classification, setClassification] = useState('Pending')
  const [cash, setCash] = useState({ total: '', currency: 'EUR', payments: [{ amount: '', currency: 'EUR', method: 'Cash', ref: '', note: '' }] })
  const [ins, setIns]   = useState({ company: '', assistance: '', ref: '', policy: '', coverage: 'Details Pending', diagnosis: '' })

  // ---- Computed buckets ----
  const buckets = useMemo(() => {
    const groups = { awaiting: [], pending: [], cash: [], insurance: [] }
    for (const c of incoming) {
      if (!c.transferReceivedAt) groups.awaiting.push(c)
      else if (c.financialType === 'Cash')      groups.cash.push(c)
      else if (c.financialType === 'Insurance') groups.insurance.push(c)
      else                                       groups.pending.push(c)
    }
    return groups
  }, [incoming])

  const TABS = [
    { id: 'all',       label: 'All',                 count: incoming.length },
    { id: 'awaiting',  label: 'Awaiting Receipt',    count: buckets.awaiting.length },
    { id: 'pending',   label: 'Classification Pending', count: buckets.pending.length },
    { id: 'cash',      label: 'Cash',                count: buckets.cash.length },
    { id: 'insurance', label: 'Insurance',           count: buckets.insurance.length },
  ]
  const list = tab === 'all' ? incoming : buckets[tab]

  function openCase(c) {
    setSelected(c)
    setStep(c.transferReceivedAt ? 'classify' : 'confirm')
    setClassification(c.financialType || 'Pending')
    setCash({ total: '', currency: 'EUR', payments: [{ amount: '', currency: 'EUR', method: 'Cash', ref: '', note: '' }] })
    setIns({ company: c.insuranceCompany || '', assistance: c.assistanceCompany || '', ref: c.insuranceRef || '', policy: c.policyNumber || '', coverage: c.coverageStatus || 'Details Pending', diagnosis: c.diagnosis || '' })
  }

  function confirmReceipt() {
    setOverrides((o) => ({
      ...o,
      [selected.id]: { ...(o[selected.id] || {}), transferReceivedAt: new Date().toISOString() },
    }))
    setStep('classify')
    toast({ kind: 'success', title: 'Patient received — demo only', message: `${selected.patient.name} now active at ${branch?.name}. Same Our Ref ${selected.ourRef} continues.` })
  }

  function applyClassification() {
    if (classification === 'Cash') {
      setStep('cash')
      return
    }
    if (classification === 'Insurance') {
      setStep('insurance')
      return
    }
    setOverrides((o) => ({
      ...o,
      [selected.id]: { ...(o[selected.id] || {}), financialType: 'Pending' },
    }))
    toast({ kind: 'info', title: 'Left as Pending', message: 'Update once classification is known.' })
    setSelected(null)
  }

  function saveCash() {
    setOverrides((o) => ({
      ...o,
      [selected.id]: {
        ...(o[selected.id] || {}),
        financialType: 'Cash',
        currency: cash.currency,
        invoiceTotal: parseFloat(cash.total) || 0,
        payments: cash.payments.filter((p) => p.amount).map((p, i) => ({
          id: `recv${i + 1}`,
          amount: parseFloat(p.amount) || 0,
          currency: p.currency, method: p.method, ref: p.ref, note: p.note,
        })),
      },
    }))
    toast({ kind: 'success', title: 'Cash classification recorded — demo only' })
    setSelected(null)
  }

  function saveInsurance() {
    setOverrides((o) => ({
      ...o,
      [selected.id]: {
        ...(o[selected.id] || {}),
        financialType: 'Insurance',
        insuranceCompany: ins.company, assistanceCompany: ins.assistance,
        insuranceRef: ins.ref, policyNumber: ins.policy,
        coverageStatus: ins.coverage, diagnosis: ins.diagnosis,
      },
    }))
    toast({ kind: 'success', title: 'Insurance classification recorded — demo only' })
    setSelected(null)
  }

  return (
    <>
      <PageHeader
        title="Incoming Transfers"
        description="Patients sent to this branch from other locations. The Our Ref always continues — no new case is created."
      />
      <PageBody>
        <Tabs value={tab} onChange={setTab} items={TABS} />

        {list.length === 0 ? (
          <Card><EmptyState icon={ArrowLeftRight} title="No transfers in this bucket" message="When another branch sends a patient here, they'll appear in this list." /></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {list.map((c) => <TransferCard key={c.id} c={c} branchName={branch?.name} onOpen={() => openCase(c)} />)}
          </div>
        )}
      </PageBody>

      {/* Receive workflow modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        size="xl"
        title={selected ? `Receive ${selected.patient.name}` : ''}
        subtitle={selected ? `${selected.ourRef} · From ${selected.transferFromName}` : ''}
      >
        {selected && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-1">
              <TransferTimeline caseData={selected} currentBranchName={branch?.name} />
            </div>
            <div className="lg:col-span-2 space-y-4">
              {step === 'confirm' && (
                <>
                  <div className="rounded-lg bg-sky-50 border border-sky-100 p-3 text-xs text-sky-900 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-sky-700" />
                    The same case continues. <span className="font-semibold">Our Ref {selected.ourRef}</span> is preserved.
                  </div>
                  <PatientSummary c={selected} />
                  <div className="border-t border-border pt-4 flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
                    <Button onClick={confirmReceipt} leftIcon={<Inbox className="w-4 h-4" />}>Confirm Receipt</Button>
                  </div>
                </>
              )}

              {step === 'classify' && (
                <>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-900 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-700" />
                    Patient received. Choose a financial classification now or leave Pending and update later.
                  </div>
                  <Field label="Financial Classification" required>
                    <Select value={classification} onChange={(e) => setClassification(e.target.value)}>
                      <option value="Pending">Pending / Not Determined Yet</option>
                      <option value="Cash">Cash</option>
                      <option value="Insurance">Insurance</option>
                    </Select>
                  </Field>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
                    <Button onClick={applyClassification} rightIcon={<ChevronRight className="w-4 h-4" />}>
                      {classification === 'Pending' ? 'Save as Pending' : 'Continue'}
                    </Button>
                  </div>
                </>
              )}

              {step === 'cash' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Invoice Total" required><Input type="number" min="0" step="0.01" value={cash.total} onChange={(e) => setCash((x) => ({ ...x, total: e.target.value }))} placeholder="0.00" /></Field>
                    <Field label="Currency"><Select value={cash.currency} onChange={(e) => setCash((x) => ({ ...x, currency: e.target.value }))}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
                  </div>
                  <div className="rounded-xl border border-border bg-subtle/40 p-3">
                    <div className="text-sm font-semibold text-ink-900 mb-2">Payment Lines</div>
                    {cash.payments.map((p, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                        <div className="col-span-3"><Input type="number" min="0" step="0.01" value={p.amount} onChange={(e) => { const v = [...cash.payments]; v[idx] = { ...v[idx], amount: e.target.value }; setCash((x) => ({ ...x, payments: v })) }} placeholder="Amount" /></div>
                        <div className="col-span-2"><Select value={p.currency} onChange={(e) => { const v = [...cash.payments]; v[idx] = { ...v[idx], currency: e.target.value }; setCash((x) => ({ ...x, payments: v })) }}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></div>
                        <div className="col-span-3"><Select value={p.method} onChange={(e) => { const v = [...cash.payments]; v[idx] = { ...v[idx], method: e.target.value }; setCash((x) => ({ ...x, payments: v })) }}>{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</Select></div>
                        <div className="col-span-4"><Input value={p.note} onChange={(e) => { const v = [...cash.payments]; v[idx] = { ...v[idx], note: e.target.value }; setCash((x) => ({ ...x, payments: v })) }} placeholder="Note" /></div>
                      </div>
                    ))}
                    <Button variant="secondary" size="sm" leftIcon={<Banknote className="w-4 h-4" />} onClick={() => setCash((x) => ({ ...x, payments: [...x.payments, { amount: '', currency: x.currency, method: 'Cash', ref: '', note: '' }] }))}>
                      Add Payment Line
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setStep('classify')} leftIcon={<ChevronRight className="w-4 h-4 rotate-180" />}>Back</Button>
                    <Button onClick={saveCash} leftIcon={<CheckCircle2 className="w-4 h-4" />}>Save Cash Classification</Button>
                  </div>
                </>
              )}

              {step === 'insurance' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Insurance Company" required>
                      <Select value={ins.company} onChange={(e) => setIns((x) => ({ ...x, company: e.target.value }))}>
                        <option value="">Select…</option>
                        {INSURANCE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </Select>
                    </Field>
                    <Field label="Insurance Ref" required>
                      <Input prefix={<Hash className="w-3.5 h-3.5" />} value={ins.ref} onChange={(e) => setIns((x) => ({ ...x, ref: e.target.value }))} />
                    </Field>
                    <Field label="Assistance">
                      <Select value={ins.assistance} onChange={(e) => setIns((x) => ({ ...x, assistance: e.target.value }))}>
                        <option value="">Select…</option>
                        {ASSISTANCE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </Select>
                    </Field>
                    <Field label="Policy Number"><Input value={ins.policy} onChange={(e) => setIns((x) => ({ ...x, policy: e.target.value }))} /></Field>
                    <Field label="Coverage Status">
                      <Select value={ins.coverage} onChange={(e) => setIns((x) => ({ ...x, coverage: e.target.value }))}>
                        {COVERAGE_STATUSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </Select>
                    </Field>
                    <Field label="Diagnosis"><Input prefix={<Stethoscope className="w-3.5 h-3.5" />} value={ins.diagnosis} onChange={(e) => setIns((x) => ({ ...x, diagnosis: e.target.value }))} /></Field>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setStep('classify')} leftIcon={<ChevronRight className="w-4 h-4 rotate-180" />}>Back</Button>
                    <Button onClick={saveInsurance} leftIcon={<CheckCircle2 className="w-4 h-4" />}>Save Insurance Classification</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

// --------------------------------------------------------------------
function TransferCard({ c, branchName, onOpen }) {
  const state = !c.transferReceivedAt
    ? { tone: 'warning', label: 'Awaiting Receipt' }
    : c.financialType === 'Pending' ? { tone: 'pending', label: 'Classification Pending' }
    : c.financialType === 'Cash'    ? { tone: 'cash',    label: 'Received · Cash' }
    : c.financialType === 'Insurance'? { tone: 'insurance', label: 'Received · Insurance' }
    : { tone: 'success', label: 'Received' }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-ink-500 font-mono">{c.ourRef}</div>
            <div className="text-base font-semibold text-ink-900 truncate mt-0.5">{c.patient.name}</div>
            <div className="text-xs text-ink-500 mt-0.5">{c.patient.nationality} · {c.patient.gender}</div>
          </div>
          <Badge tone="transferred">From {c.transferFromName?.replace(' Clinic','')}</Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <Kv label="Hotel"      value={<><Building2 className="w-3 h-3 text-ink-400" /> {c.hotel}</>} />
          <Kv label="Sent"       value={<><Clock className="w-3 h-3 text-ink-400" /> {fmtRelative(c.transferSentAt)}</>} />
          <Kv label="Visit Date" value={fmtDate(c.visitDate)} />
          <Kv label="Transport"  value={c.transportType ? <Badge tone={TRANSPORT_TONE[c.transportType] || 'neutral'} size="sm">{c.transportType}</Badge> : '—'} />
        </div>

        {c.transferNote && (
          <div className="mt-3 rounded-lg bg-violet-50 border border-violet-100 p-3 text-xs text-violet-900 italic">
            “{c.transferNote}”
          </div>
        )}
      </div>
      <div className="border-t border-border bg-subtle/40 px-4 py-3 flex items-center justify-between">
        <Badge tone={state.tone} dot>{state.label}</Badge>
        <Button variant={c.transferReceivedAt ? 'secondary' : 'primary'} size="sm" onClick={onOpen} rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
          {c.transferReceivedAt ? 'Open & Classify' : 'Receive'}
        </Button>
      </div>
    </Card>
  )
}

function Kv({ label, value }) {
  return (
    <div>
      <div className="text-ink-400 uppercase tracking-wider text-[10px]">{label}</div>
      <div className="font-medium text-ink-700 flex items-center gap-1 mt-0.5">{value}</div>
    </div>
  )
}

function PatientSummary({ c }) {
  return (
    <div className="rounded-xl border border-border bg-subtle/30 p-4 grid grid-cols-2 gap-3 text-sm">
      <Kv label="Patient"     value={c.patient.name} />
      <Kv label="Gender / DOB" value={`${c.patient.gender} · ${c.patient.dob}`} />
      <Kv label="Nationality" value={c.patient.nationality} />
      <Kv label="Hotel"       value={c.hotel} />
      <Kv label="Visit Date"  value={fmtDate(c.visitDate, { withTime: true })} />
      <Kv label="Sent"        value={fmtDate(c.transferSentAt, { withTime: true })} />
      {c.transferNote && (
        <div className="col-span-2">
          <Kv label="Transfer Note" value={<span className="italic">“{c.transferNote}”</span>} />
        </div>
      )}
    </div>
  )
}
