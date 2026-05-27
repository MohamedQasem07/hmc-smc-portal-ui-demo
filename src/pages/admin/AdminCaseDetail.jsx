import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, User, Calendar, Building2, Wallet, FileText, ArrowLeftRight,
  History, FileLock2, CheckCircle2, Lock, AlertTriangle, Save,
  Receipt, ClipboardCheck, Phone, Mail, IdCard, Plane, Hash, Stethoscope,
  ListChecks, BadgeInfo,
} from 'lucide-react'
import { PageHeader, PageBody } from '../../components/layout/PageHeader'
import {
  Card, Button, Badge, EmptyState, Drawer, MetaItem, DocsChecklist,
  TransferTimeline,
} from '../../components/ui'
import { Field, Input, Select, Textarea } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useToast } from '../../components/ui/Toast'
import {
  getCaseById, getBranchName, getBranch, FACILITIES,
  INSURANCE_COMPANIES, ASSISTANCE_COMPANIES, CASE_PROVIDERS,
  COVERAGE_STATUSES, INVOICE_READINESS, CASE_STATUSES,
} from '../../data/mock'
import { fmtDate, fmtMoney, fmtRelative, ageFromDob, CURRENCIES } from '../../lib/format'
import {
  FINANCIAL_TONE, ROUTE_TONE, STATUS_TONE, SOURCE_TONE,
  COVERAGE_TONE, CASE_SOURCE_TONE,
} from '../../components/ui/Badge'

/**
 * Admin Case Detail — P1 full case workspace.
 * Sections A–G stacked vertically with a sticky action bar at the bottom of the main column.
 */
export default function AdminCaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const baseCase = getCaseById(id)

  const [draft, setDraft] = useState(() => baseCase ? structuredClone(baseCase) : null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const history = useMemo(() => {
    if (!draft) return []
    return [...(draft.history || [])].sort((a, b) => (b.at || '').localeCompare(a.at || ''))
  }, [draft])

  if (!baseCase || !draft) {
    return <PageBody><Card><EmptyState title="Case not found" message="No mock case exists for this ID." /></Card></PageBody>
  }

  const branch = getBranch(draft.branchId)
  const facility = FACILITIES.find((f) => f.id === draft.facilityId)

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

  function save() { toast({ kind: 'success', title: 'Admin review saved — demo only', message: `${draft.ourRef} · changes captured in prototype state.` }) }
  function markReady() {
    setField('invoiceReadiness', 'Ready for Invoice')
    toast({ kind: 'success', title: 'Marked Ready for Invoice — demo only', message: `${draft.ourRef} · queued.` })
  }
  function markGenerated() {
    setField('invoiceReadiness', 'Invoice Generated')
    toast({ kind: 'success', title: 'Marked Invoice Generated — demo only', message: `${draft.ourRef} · admin record only — no PDF generated here.` })
  }
  function finalize() {
    setField('invoiceReadiness', 'Finalized')
    setField('caseStatus', 'Closed')
    toast({ kind: 'success', title: 'Case finalized — demo only', message: `${draft.ourRef} closed.` })
  }

  return (
    <>
      <PageHeader
        title={draft.patient.name}
        description={
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-mono text-ink-600">{draft.ourRef}</span>
            <span className="text-ink-300">·</span>
            <Badge tone={SOURCE_TONE[draft.source] || 'neutral'} size="sm">{draft.source}</Badge>
            <span className="text-ink-300">·</span>
            <span>{facility?.name} · {branch?.name} · {draft.hotel}</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />}>Back</Button>
            <Button onClick={() => setHistoryOpen(true)} variant="secondary" size="sm" leftIcon={<History className="w-4 h-4" />}>Change History · {history.length}</Button>
          </div>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={ROUTE_TONE[draft.route] || 'neutral'}>{draft.route}</Badge>
          <Badge tone={FINANCIAL_TONE[draft.financialType] || 'neutral'}>{draft.financialType}</Badge>
          {draft.financialType === 'Insurance' && (
            <Badge tone={COVERAGE_TONE[draft.coverageStatus]}>Coverage · {draft.coverageStatus || 'Details Pending'}</Badge>
          )}
          <Badge tone={STATUS_TONE[draft.caseStatus] || 'neutral'}>Case · {draft.caseStatus}</Badge>
          <Badge tone={STATUS_TONE[draft.invoiceReadiness] || 'neutral'}>Invoice · {draft.invoiceReadiness}</Badge>
          <Badge tone={CASE_SOURCE_TONE[draft.caseSource] || 'neutral'} size="sm">{draft.caseSource}</Badge>
        </div>
      </PageHeader>

      <PageBody>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* B — Patient & Visit */}
            <Card>
              <SectionHeader icon={User} title="Patient & Visit Information" description="Demographics, contact, and visit context." />
              <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                <MetaItem label="Name"        value={draft.patient.name} />
                <MetaItem label="Gender"      value={draft.patient.gender} />
                <MetaItem label="DOB"         value={fmtDate(draft.patient.dob)} />
                <MetaItem label="Age"         value={`${ageFromDob(draft.patient.dob)} yrs`} />
                <MetaItem label="Nationality" value={draft.patient.nationality} />
                <MetaItem label="Hotel"       value={draft.hotel} icon={Building2} />
                <MetaItem label="Room"        value={draft.patient.room} />
                <MetaItem label="Postal"      value={draft.patient.postalCode} />
                <MetaItem label="Phone"       value={draft.patient.phone} icon={Phone} />
                <MetaItem label="Email"       value={draft.patient.email} icon={Mail} />
                <MetaItem label="Passport"    value={draft.patient.passport} icon={IdCard} mono />
                <MetaItem label="Visit"       value={fmtDate(draft.visitDate, { withTime: true })} icon={Calendar} />
                <MetaItem label="Visit Time"  value={draft.visitTime} />
                <MetaItem label="Arrival"     value={fmtDate(draft.patient.arrivalDate)} icon={Plane} />
                <MetaItem label="Departure"   value={fmtDate(draft.patient.departureDate)} icon={Plane} />
                <MetaItem label="Case Source" value={draft.caseSource} />
              </dl>
              {draft.patient.note && (
                <div className="mt-3 rounded-lg bg-subtle/60 border border-border p-3 text-xs text-ink-700">
                  <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold block mb-1">Patient Note</span>
                  {draft.patient.note}
                </div>
              )}
            </Card>

            {/* C — Transfer Journey */}
            <Card>
              <SectionHeader icon={ArrowLeftRight} title="Transfer Journey" description="Visual movement between branches — same Our Ref preserved." />
              <TransferTimeline caseData={draft} currentBranchName={branch?.name} />
            </Card>

            {/* D — Financial Classification */}
            <Card>
              <SectionHeader icon={Wallet} title="Financial Classification" description="Type, currency, payment lines or insurance details." />
              {draft.financialType === 'Cash' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <MetaItem label="Invoice Total" value={fmtMoney(draft.invoiceTotal, draft.currency)} />
                    <MetaItem label="Settlement"    value={<Badge tone={draft.mixedCurrency ? 'mixed' : 'finalized'} size="sm">{draft.settlementStatus || '—'}</Badge>} />
                    <MetaItem label="Service Charge %" value={`${draft.serviceChargePct ?? 0}%`} />
                  </div>
                  <div className="mt-3 rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-subtle/60 text-ink-500 text-[11px] uppercase tracking-wide">
                        <tr>
                          <th className="text-start font-semibold px-3 py-2">Amount</th>
                          <th className="text-start font-semibold px-3 py-2">Method</th>
                          <th className="text-start font-semibold px-3 py-2">Reference</th>
                          <th className="text-start font-semibold px-3 py-2">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(draft.payments || []).map((p) => (
                          <tr key={p.id}>
                            <td className="px-3 py-2 font-medium text-ink-900">{fmtMoney(p.amount, p.currency)}</td>
                            <td className="px-3 py-2 text-ink-600">{p.method}</td>
                            <td className="px-3 py-2 text-ink-500 font-mono text-[11px]">{p.ref || '—'}</td>
                            <td className="px-3 py-2 text-ink-500">{p.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {draft.mixedCurrency && (
                    <div className="mt-3 rounded-lg bg-orange-50 border border-orange-200 p-3 flex items-start gap-2 text-xs text-orange-900">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-orange-700" />
                      Mixed currency — admin review required. No auto-reconciliation without an approved exchange rate.
                    </div>
                  )}
                </>
              )}

              {draft.financialType === 'Insurance' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Insurance Company"><Select value={draft.insuranceCompany || ''} onChange={(e) => setField('insuranceCompany', e.target.value)}><option value="">—</option>{INSURANCE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
                  <Field label="Insurance Reference"><Input value={draft.insuranceRef || ''} onChange={(e) => setField('insuranceRef', e.target.value)} /></Field>
                  <Field label="Assistance Company"><Select value={draft.assistanceCompany || ''} onChange={(e) => setField('assistanceCompany', e.target.value)}><option value="">—</option>{ASSISTANCE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
                  <Field label="Policy Number"><Input value={draft.policyNumber || ''} onChange={(e) => setField('policyNumber', e.target.value)} /></Field>
                  <Field label="Case Provider"><Select value={draft.caseProvider || ''} onChange={(e) => setField('caseProvider', e.target.value)}><option value="">—</option>{CASE_PROVIDERS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
                  <Field label="Coverage Status"><Select value={draft.coverageStatus || 'Details Pending'} onChange={(e) => setField('coverageStatus', e.target.value)}>{COVERAGE_STATUSES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
                  <Field label="Currency"><Select value={draft.currency || 'EUR'} onChange={(e) => setField('currency', e.target.value)}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
                  <Field label="Service Charge %" hint="0% outpatient · 15-20% inpatient depending on insurance."><Input type="number" min="0" max="50" value={draft.serviceChargePct ?? 0} onChange={(e) => setField('serviceChargePct', parseInt(e.target.value || '0', 10))} /></Field>
                  <Field label="Diagnosis" className="sm:col-span-2"><Input value={draft.diagnosis || ''} onChange={(e) => setField('diagnosis', e.target.value)} /></Field>
                </div>
              )}

              {draft.financialType === 'Pending' && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
                  Financial type not yet determined. Convert to Cash or Insurance once the branch confirms.
                </div>
              )}
            </Card>

            {/* Documents Checklist */}
            <Card>
              <SectionHeader icon={ListChecks} title="Documentation Checklist" description="Status of supporting documents — concept only." />
              <DocsChecklist value={draft.docsChecklist || {}} readOnly />
            </Card>

            {/* E — Admin Invoice Result Registration */}
            <Card>
              <SectionHeader
                icon={Receipt}
                title="Admin Invoice Result Registration — Manual Only"
                description="Record the result of invoicing performed externally via Claude / Manager."
                action={<Badge tone="neutral" size="sm"><Lock className="w-3 h-3" /> No Generate button</Badge>}
              />
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4 text-xs text-amber-900 flex items-start gap-2">
                <BadgeInfo className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
                <span>
                  Invoice generation remains <span className="font-semibold">outside Portal in the protected Claude / Invoice Manager workflow</span>. This section records the approved result only — no PDF, no billing-engine execution.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Invoice Workflow Status">
                  <Select value={draft.invoiceReadiness} onChange={(e) => setField('invoiceReadiness', e.target.value)}>
                    {INVOICE_READINESS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </Field>
                <Field label="Case Status">
                  <Select value={draft.caseStatus} onChange={(e) => setField('caseStatus', e.target.value)}>
                    {CASE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Field>
                <Field label="Final Currency">
                  <Select value={draft.finalCurrency || draft.currency || 'EUR'} onChange={(e) => setField('finalCurrency', e.target.value)}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Final Invoice Amount"><Input type="number" min="0" step="0.01" value={draft.finalInvoiceAmount ?? ''} onChange={(e) => setField('finalInvoiceAmount', parseFloat(e.target.value) || 0)} /></Field>
                <Field label="Invoice Generated Date"><Input type="date" value={(draft.invoiceGeneratedAt || '').slice(0, 10)} onChange={(e) => setField('invoiceGeneratedAt', e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
                <Field label="External Billing Note"><Input value={draft.externalBillingNote || ''} onChange={(e) => setField('externalBillingNote', e.target.value)} placeholder="e.g. Generated via Claude/Manager" /></Field>
                <div className="sm:col-span-3">
                  <Field label="Admin Internal Note"><Textarea rows={2} value={draft.adminNotes || ''} onChange={(e) => setField('adminNotes', e.target.value)} placeholder="Internal-only note. Not visible to clinic users." /></Field>
                </div>
              </div>
            </Card>

            {/* G — Sticky action bar */}
            <div className="sticky bottom-20 lg:bottom-4 z-10">
              <Card className="bg-navy-50/60 border-navy-200">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="text-xs text-ink-600">
                    All actions below are local prototype state only — no backend writes.
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                    <Button variant="secondary" leftIcon={<Save className="w-4 h-4" />} onClick={save}>Save Review</Button>
                    <Button variant="secondary" leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={markReady}>Mark Ready</Button>
                    <Button variant="secondary" leftIcon={<Receipt className="w-4 h-4" />} onClick={markGenerated}>Mark Generated</Button>
                    <Button variant="success"  leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={finalize}>Finalize</Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Side rail */}
          <div className="space-y-4 sm:space-y-6">
            <Card variant="subtle">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <FileLock2 className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-ink-700">
                  <div className="font-semibold text-ink-900 mb-1">No PDF generation here</div>
                  Invoices are produced by the owner in Claude / Manager outside the Portal. This screen is only the admin record of what was generated.
                  <Link to="/admin/invoice-manager" className="block mt-1 text-sky-700 hover:underline">View protected Invoice Manager placeholder →</Link>
                </div>
              </div>
            </Card>

            <Card padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink-900">Recent Changes</h3>
                    <p className="text-xs text-ink-500">Latest 3 audit entries.</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>View all</Button>
              </div>
              {history.length === 0 ? (
                <div className="p-4"><EmptyState title="No change history yet" /></div>
              ) : (
                <ul className="divide-y divide-border">
                  {history.slice(0, 3).map((h, i) => <li key={i}><HistoryRow h={h} /></li>)}
                </ul>
              )}
            </Card>

            <Card padding="sm" variant="subtle">
              <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold mb-1.5">Quick Patient Info</div>
              <div className="space-y-1 text-xs text-ink-700">
                <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-ink-400" /> {draft.patient.phone || '—'}</div>
                <div className="flex items-center gap-1.5"><Mail  className="w-3 h-3 text-ink-400" /> {draft.patient.email || '—'}</div>
                <div className="flex items-center gap-1.5"><IdCard className="w-3 h-3 text-ink-400" /> <span className="font-mono">{draft.patient.passport || '—'}</span></div>
                <div className="flex items-center gap-1.5"><Plane className="w-3 h-3 text-ink-400" /> {fmtDate(draft.patient.arrivalDate)} → {fmtDate(draft.patient.departureDate)}</div>
              </div>
            </Card>
          </div>
        </div>
      </PageBody>

      <Drawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Change History"
        subtitle={`${draft.ourRef} · ${draft.patient.name}`}
        width="lg"
      >
        {history.length === 0 ? (
          <EmptyState title="No change history yet" message="When fields are edited, entries appear here." />
        ) : (
          <ol className="space-y-3">
            {history.map((h, i) => (
              <li key={i} className="relative ps-6">
                <span className="absolute left-1.5 top-1.5 w-2 h-2 rounded-full bg-sky-500 ring-4 ring-sky-100" />
                <div className="rounded-lg border border-border bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-ink-500">{fmtDate(h.at, { withTime: true })}</div>
                    <Badge tone="neutral" size="sm">{h.field}</Badge>
                  </div>
                  <div className="mt-1 text-sm font-medium text-ink-900">{h.by}</div>
                  <div className="mt-1 text-xs text-ink-600">
                    {h.from
                      ? <><span className="text-ink-400 line-through">{h.from}</span> <span className="text-ink-400">→</span> <span className="font-semibold">{h.to}</span></>
                      : <span className="font-semibold">{h.to}</span>}
                  </div>
                  {h.reason && <div className="mt-1.5 text-[11px] text-ink-500 italic">“{h.reason}”</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-6 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-900">
          Audit log shown is a UI concept based on mock data. The production audit-log design must be approved before backend implementation.
        </div>
      </Drawer>
    </>
  )
}

function HistoryRow({ h }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-ink-500">{fmtRelative(h.at)}</div>
        <Badge tone="neutral" size="sm">{h.field}</Badge>
      </div>
      <div className="text-sm font-medium text-ink-900 mt-1">{h.by}</div>
      <div className="text-xs text-ink-600 mt-0.5">
        {h.from
          ? <><span className="line-through text-ink-400">{h.from}</span> → <span className="font-semibold">{h.to}</span></>
          : <span className="font-semibold">{h.to}</span>}
      </div>
    </div>
  )
}
