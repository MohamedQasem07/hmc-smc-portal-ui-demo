import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, User, Calendar, Building2, Wallet, FileText, ArrowLeftRight,
  Phone, Mail, IdCard, Plane, Hash, Stethoscope, ListChecks, Lock, BadgeInfo,
} from 'lucide-react'
import { PageHeader, PageBody } from '../../components/layout/PageHeader'
import {
  Card, Button, Badge, EmptyState, MetaItem, DocsChecklist, TransferTimeline,
} from '../../components/ui'
import { getCaseById, getBranchName, getBranch, FACILITIES } from '../../data/mock'
import { fmtDate, fmtMoney, ageFromDob } from '../../lib/format'
import { FINANCIAL_TONE, ROUTE_TONE, STATUS_TONE, COVERAGE_TONE, CASE_SOURCE_TONE } from '../../components/ui/Badge'
import { SectionHeader } from '../../components/ui/SectionHeader'

/**
 * Clinic Case Detail — operational view for the assigned branch.
 *
 * SHOWS:  patient, visit, transfer journey, basic classification, payment lines,
 *         basic insurance entered by clinic, docs checklist.
 * HIDES:  final invoice amount (admin), service charge, invoice readiness,
 *         Manager controls, admin notes.
 */
export default function ClinicCaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const c = getCaseById(id)

  if (!c) {
    return (
      <PageBody>
        <Card><EmptyState title="Case not found" message="This case may have been removed or never existed in the demo dataset." /></Card>
      </PageBody>
    )
  }

  const branch = getBranch(c.branchId)
  const facility = FACILITIES.find((f) => f.id === c.facilityId)

  return (
    <>
      <PageHeader
        title={c.patient.name}
        description={<>Our Ref <span className="font-mono">{c.ourRef}</span> · {facility?.name} · {branch?.name}</>}
        actions={
          <Button onClick={() => navigate(-1)} variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />}>
            Back
          </Button>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={ROUTE_TONE[c.route] || 'neutral'}>{c.route}</Badge>
          <Badge tone={FINANCIAL_TONE[c.financialType] || 'neutral'}>{c.financialType}</Badge>
          {c.financialType === 'Insurance' && c.coverageStatus && (
            <Badge tone={COVERAGE_TONE[c.coverageStatus]}>Coverage · {c.coverageStatus}</Badge>
          )}
          <Badge tone={CASE_SOURCE_TONE[c.caseSource] || 'neutral'}>{c.caseSource}</Badge>
        </div>
      </PageHeader>

      <PageBody>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card>
              <SectionHeader icon={User} title="Patient & Visit" />
              <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                <MetaItem label="Name"        value={c.patient.name} />
                <MetaItem label="Gender"      value={c.patient.gender} />
                <MetaItem label="DOB"         value={fmtDate(c.patient.dob)} />
                <MetaItem label="Age"         value={`${ageFromDob(c.patient.dob)} yrs`} />
                <MetaItem label="Nationality" value={c.patient.nationality} />
                <MetaItem label="Hotel"       value={c.hotel} icon={Building2} />
                <MetaItem label="Room"        value={c.patient.room} />
                <MetaItem label="Postal Code" value={c.patient.postalCode} />
                <MetaItem label="Phone"       value={c.patient.phone} icon={Phone} />
                <MetaItem label="Email"       value={c.patient.email} icon={Mail} />
                <MetaItem label="Passport"    value={c.patient.passport} icon={IdCard} mono />
                <MetaItem label="Visit Date"  value={fmtDate(c.visitDate, { withTime: true })} icon={Calendar} />
                <MetaItem label="Arrival"     value={fmtDate(c.patient.arrivalDate)} icon={Plane} />
                <MetaItem label="Departure"   value={fmtDate(c.patient.departureDate)} icon={Plane} />
              </dl>
              {c.patient.note && (
                <div className="mt-3 rounded-lg bg-subtle/60 border border-border p-3 text-xs text-ink-700">
                  <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold block mb-1">Note</span>
                  {c.patient.note}
                </div>
              )}
            </Card>

            {(c.route === 'Transferred In' || c.route === 'Transferred Out') && (
              <Card>
                <SectionHeader icon={ArrowLeftRight} title="Transfer Journey" description="Same Our Ref preserved throughout." />
                <TransferTimeline caseData={c} currentBranchName={branch?.name} />
              </Card>
            )}

            {c.financialType === 'Cash' && (
              <Card>
                <SectionHeader icon={Wallet} title="Cash Classification" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <MetaItem label="Invoice Total" value={fmtMoney(c.invoiceTotal, c.currency)} />
                  <MetaItem label="Settlement"    value={<Badge tone={c.mixedCurrency ? 'mixed' : 'finalized'} size="sm">{c.settlementStatus || '—'}</Badge>} />
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
                      {(c.payments || []).map((p) => (
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
              </Card>
            )}

            {c.financialType === 'Insurance' && (
              <Card>
                <SectionHeader icon={FileText} title="Insurance Classification (Branch View)" />
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <MetaItem label="Insurance Company" value={c.insuranceCompany} />
                  <MetaItem label="Insurance Ref"     value={c.insuranceRef} mono icon={Hash} />
                  <MetaItem label="Policy Number"     value={c.policyNumber} mono />
                  <MetaItem label="Assistance"        value={c.assistanceCompany || '—'} />
                  <MetaItem label="Case Provider"     value={c.caseProvider || '—'} />
                  <MetaItem label="Coverage Status"   value={<Badge tone={COVERAGE_TONE[c.coverageStatus]} size="sm">{c.coverageStatus || 'Details Pending'}</Badge>} />
                  <MetaItem label="Diagnosis"         value={c.diagnosis || '—'} icon={Stethoscope} className="col-span-2 sm:col-span-3" />
                </dl>
              </Card>
            )}

            <Card>
              <SectionHeader icon={ListChecks} title="Documentation Checklist" />
              <DocsChecklist value={c.docsChecklist || {}} readOnly />
            </Card>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <Card>
              <SectionHeader title="Quick Actions" />
              <div className="space-y-2">
                <Button fullWidth variant="secondary" disabled>Edit Financial Classification</Button>
                <Button fullWidth variant="secondary" disabled>Forward to Another Branch</Button>
                <div className="text-[11px] text-ink-400 text-center">Demo — interactions disabled.</div>
              </div>
            </Card>

            <Card variant="subtle">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-xs text-ink-700 leading-relaxed">
                  <div className="font-semibold text-ink-900 mb-1">Clinic-only view</div>
                  Service charge, final invoice amount, invoice readiness workflow, admin notes, and the Invoice Manager are <span className="font-semibold">admin-only</span> and hidden here.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  )
}
