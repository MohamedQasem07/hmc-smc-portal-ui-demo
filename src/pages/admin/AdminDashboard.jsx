import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, Wallet, FileText, Clock, ArrowUpRight,
  ArrowDownRight, FileCheck2, AlertTriangle, ChevronRight, Calendar, Printer,
  Banknote, CreditCard, Building2, RefreshCw, ShieldAlert, FilePenLine,
  Stethoscope, Users, BarChart3, Eye,
} from 'lucide-react'
import { PageHeader, PageBody } from '../../components/layout/PageHeader'
import { Card, Button, Badge, EmptyState, KpiCard } from '../../components/ui'
import { Select } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import {
  CASES, BRANCHES, FACILITIES, aggregateForAdmin, getBranchName,
} from '../../data/mock'
import { fmtDate, fmtMoney, fmtRelative } from '../../lib/format'
import { FINANCIAL_TONE, STATUS_TONE, COVERAGE_TONE } from '../../components/ui/Badge'

const DEMO_DATE = '2026-05-26'

export default function AdminDashboard() {
  const [date, setDate]   = useState(DEMO_DATE)
  const [facility, setFacility] = useState('all')
  const [branch, setBranch]   = useState('all')
  const [financial, setFin]   = useState('all')
  const [route, setRoute]     = useState('all')
  const [status, setStatus]   = useState('all')

  const agg = useMemo(() => aggregateForAdmin({
    date, facilityId: facility, branchId: branch, financial, route, status,
  }), [date, facility, branch, financial, route, status])

  // ---- Operational panels ----
  const needsClassification = agg.list
    .filter((c) => c.financialType === 'Pending')
    .slice(0, 6)
  const missingInfo = CASES
    .filter((c) =>
      (c.financialType === 'Insurance' && (!c.insuranceRef || c.coverageStatus === 'Details Pending')) ||
      (c.financialType === 'Cash' && c.mixedCurrency),
    )
    .slice(0, 6)
  const readyQueue = CASES
    .filter((c) => c.invoiceReadiness === 'Ready for Invoice')
    .sort((a, b) => (b.visitDate || '').localeCompare(a.visitDate || ''))
    .slice(0, 6)
  const recentTransfers = CASES
    .filter((c) => c.route !== 'Direct')
    .sort((a, b) => ((b.transferSentAt || b.visitDate || '') > (a.transferSentAt || a.visitDate || '') ? 1 : -1))
    .slice(0, 5)

  const branchesInFacility = facility === 'all' ? BRANCHES : BRANCHES.filter((b) => b.facility === facility)

  return (
    <>
      <PageHeader
        title="Admin Workspace"
        description="Operational command center — filter by date, facility, branch, financial type, route, or status."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Printer className="w-4 h-4" />}>Print summary</Button>
            <Button as={Link} to="/admin/daily-report" leftIcon={<BarChart3 className="w-4 h-4" />}>Daily Report</Button>
          </div>
        }
      >
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <Filter label="Date" icon={Calendar}>
            <Select value={date} onChange={(e) => setDate(e.target.value)}>
              <option value="2026-05-26">Today · 26 May 2026</option>
              <option value="2026-05-25">25 May 2026</option>
              <option value="2026-05-24">24 May 2026</option>
              <option value="2026-05-23">23 May 2026</option>
              <option value="all">All recent</option>
            </Select>
          </Filter>
          <Filter label="Facility" icon={Building2}>
            <Select value={facility} onChange={(e) => { setFacility(e.target.value); setBranch('all') }}>
              <option value="all">All facilities</option>
              {FACILITIES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Filter>
          <Filter label="Branch" icon={Users}>
            <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="all">All branches</option>
              {branchesInFacility.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Filter>
          <Filter label="Financial" icon={Wallet}>
            <Select value={financial} onChange={(e) => setFin(e.target.value)}>
              <option value="all">All</option>
              <option value="Pending">Pending</option>
              <option value="Cash">Cash</option>
              <option value="Insurance">Insurance</option>
            </Select>
          </Filter>
          <Filter label="Route" icon={ArrowUpRight}>
            <Select value={route} onChange={(e) => setRoute(e.target.value)}>
              <option value="all">All routes</option>
              <option value="Direct">Direct</option>
              <option value="Transferred In">Transferred In</option>
              <option value="Transferred Out">Transferred Out</option>
            </Select>
          </Filter>
          <Filter label="Case Status" icon={ClipboardList}>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="Open">Open</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Closed">Closed</option>
            </Select>
          </Filter>
        </div>
      </PageHeader>

      <PageBody>
        {/* KPI cards — 9 metrics across 3×3 on desktop, 2-col on mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-3 sm:gap-4">
          <KpiCard label="Total Cases"            value={agg.totals.total}             icon={LayoutDashboard} tone="navy" />
          <KpiCard label="Cash"                   value={agg.totals.cash}              icon={Wallet}          tone="emerald" />
          <KpiCard label="Insurance"              value={agg.totals.insurance}         icon={FileText}        tone="sky" />
          <KpiCard label="Pending Classification" value={agg.totals.pending}           icon={Clock}           tone="amber" />
          <KpiCard label="Transfers Sent"         value={agg.totals.transfersOut}      icon={ArrowUpRight}    tone="violet" />
          <KpiCard label="Transfers Received"     value={agg.totals.transfersIn}       icon={ArrowDownRight}  tone="violet" />
          <KpiCard label="Ready for Invoice"      value={agg.totals.ready}             icon={FileCheck2}      tone="sky" />
          <KpiCard label="Invoice Generated"      value={agg.totals.invoiced}          icon={FileCheck2}      tone="emerald" />
          <KpiCard label="Needs Admin Review"     value={agg.totals.needsAdminReview}  icon={ShieldAlert}     tone="rose" />
        </div>

        {/* Operational row 1: cash summary (wide) + needs classification */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <CashSummaryCard agg={agg} className="xl:col-span-2" />
          <DashPanel
            title="Cases Needing Classification"
            description="Open cases without a financial type."
            tone="amber"
            icon={Clock}
            empty="All cases classified."
            items={needsClassification}
            renderItem={(c) => <CaseRow c={c} />}
            seeAllTo="/admin/cases?financial=Pending"
          />
        </div>

        {/* Operational row 2: branch comparison (wide) + ready queue */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <BranchComparisonCard agg={agg} className="xl:col-span-2" />
          <DashPanel
            title="Ready for Invoice"
            description="Cleared for invoicing via Claude / Manager."
            tone="emerald"
            icon={FileCheck2}
            empty="No cases ready for invoice."
            items={readyQueue}
            renderItem={(c) => <CaseRow c={c} />}
            seeAllTo="/admin/cases?readiness=Ready+for+Invoice"
          />
        </div>

        {/* Operational row 3: missing info + recent transfers */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <DashPanel
            title="Cases Missing Required Information"
            description="Mixed-currency cash or insurance without complete reference."
            tone="rose"
            icon={AlertTriangle}
            empty="No cases missing information."
            items={missingInfo}
            renderItem={(c) => (
              <Link to={`/admin/cases/${c.id}`} className="block px-4 py-3 hover:bg-subtle">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink-900 text-sm truncate">{c.patient.name}</div>
                    <div className="text-[11px] text-ink-400 font-mono">{c.ourRef}</div>
                  </div>
                  {c.financialType === 'Cash'
                    ? <Badge tone="mixed" size="sm">Mixed Currency</Badge>
                    : <Badge tone={COVERAGE_TONE[c.coverageStatus] || 'cov-pending'} size="sm">{c.coverageStatus || 'Details Pending'}</Badge>}
                </div>
              </Link>
            )}
            seeAllTo="/admin/cases"
          />
          <DashPanel
            title="Recent Transfer Movement"
            description="Movement between clinics — last few."
            tone="violet"
            icon={ArrowUpRight}
            empty="No recent transfers."
            items={recentTransfers}
            renderItem={(c) => (
              <Link to={`/admin/cases/${c.id}`} className="block px-4 py-3 hover:bg-subtle">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink-900 text-sm truncate">{c.patient.name}</div>
                    <div className="text-[11px] text-ink-400 font-mono">{c.ourRef}</div>
                  </div>
                  <Badge tone="transferred" size="sm">{c.route}</Badge>
                </div>
                <div className="text-[11px] text-ink-500 mt-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" />
                  {c.transferFromName || getBranchName(c.branchId)}
                  <span className="text-ink-400">→</span>
                  {c.transferToName || getBranchName(c.branchId)}
                  <span className="mx-1 text-ink-300">·</span>
                  <Clock className="w-3 h-3" /> {fmtRelative(c.transferSentAt || c.visitDate)}
                </div>
              </Link>
            )}
            seeAllTo="/admin/cases?route=Transferred"
          />
        </div>
      </PageBody>
    </>
  )
}

// --------------------------------------------------------------------
function Filter({ label, icon: Icon, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
      {children}
    </div>
  )
}

function CashSummaryCard({ agg, className }) {
  const cashKeys = Object.keys(agg.cashInvoiceByCurrency)
  const collectionKeys = Object.keys(agg.collections)
  return (
    <Card padding="none" className={`overflow-hidden ${className || ''}`}>
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Banknote className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Cash Collection Summary</h3>
            <p className="text-xs text-ink-500">By original currency — no conversion applied.</p>
          </div>
        </div>
        <Button as={Link} to="/admin/daily-report" variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>Full report</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="p-4 sm:p-5">
          <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold">Cash Invoice Totals</div>
          <div className="mt-3 space-y-2">
            {cashKeys.length === 0 ? <div className="text-sm text-ink-400">No cash invoices for this filter.</div>
              : cashKeys.map((cur) => <Row key={cur} left={<><Wallet className="w-4 h-4 text-emerald-600" /> Invoice currency · {cur}</>} right={<span className="font-semibold tabular-nums">{fmtMoney(agg.cashInvoiceByCurrency[cur], cur)}</span>} />)}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold">Collected Payments</div>
          <div className="mt-3 space-y-2">
            {collectionKeys.length === 0 ? <div className="text-sm text-ink-400">No collections for this filter.</div>
              : collectionKeys.map((key) => {
                const [method, cur] = key.split('::')
                const icon = method === 'Cash' ? <Banknote className="w-4 h-4 text-emerald-600" /> : <CreditCard className="w-4 h-4 text-sky-600" />
                return <Row key={key} left={<>{icon} {method} · {cur}</>} right={<span className="font-semibold tabular-nums">{fmtMoney(agg.collections[key], cur)}</span>} />
              })}
          </div>
        </div>
      </div>
      <div className="p-3 border-t border-border bg-amber-50/60 text-[11px] text-amber-900 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
        Mixed-currency cases need Admin review. No exchange-rate conversion is performed by the Portal.
      </div>
    </Card>
  )
}

function BranchComparisonCard({ agg, className }) {
  return (
    <Card padding="none" className={`overflow-hidden ${className || ''}`}>
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Branch Activity Comparison</h3>
            <p className="text-xs text-ink-500">Click a branch to open its dedicated report.</p>
          </div>
        </div>
      </div>
      {agg.branchComparison.length === 0 ? (
        <div className="p-4"><EmptyState title="No branch activity for this filter" /></div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-subtle/60 text-ink-500 text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-start font-semibold px-4 py-2.5">Branch</th>
              <th className="text-end font-semibold px-4 py-2.5">Total</th>
              <th className="text-end font-semibold px-4 py-2.5">Cash</th>
              <th className="text-end font-semibold px-4 py-2.5">Insurance</th>
              <th className="text-end font-semibold px-4 py-2.5">Pending</th>
              <th className="text-end font-semibold px-4 py-2.5">In</th>
              <th className="text-end font-semibold px-4 py-2.5">Out</th>
              <th className="text-end font-semibold px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agg.branchComparison.map((b) => (
              <tr key={b.branchId} className="row-hover">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink-900">{b.branchName}</div>
                  <div className="text-[11px] text-ink-400 uppercase">{b.facilityId}</div>
                </td>
                <td className="px-4 py-3 text-end font-semibold tabular-nums">{b.total}</td>
                <td className="px-4 py-3 text-end tabular-nums">{b.cash}</td>
                <td className="px-4 py-3 text-end tabular-nums">{b.insurance}</td>
                <td className="px-4 py-3 text-end tabular-nums">{b.pending}</td>
                <td className="px-4 py-3 text-end tabular-nums text-violet-700">{b.transfersIn}</td>
                <td className="px-4 py-3 text-end tabular-nums text-violet-700">{b.transfersOut}</td>
                <td className="px-4 py-3 text-end">
                  <Button as={Link} to={`/admin/branches/${b.branchId}`} variant="ghost" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>Open</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function Row({ left, right }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-2 text-sm text-ink-700">{left}</div>
      <div className="text-sm">{right}</div>
    </div>
  )
}

function DashPanel({ title, description, tone = 'navy', icon: Icon, items, renderItem, empty, seeAllTo }) {
  const toneBg = {
    navy: 'bg-navy-50 text-navy-700',
    sky: 'bg-sky-50 text-sky-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    rose: 'bg-rose-50 text-rose-700',
  }[tone] || 'bg-navy-50 text-navy-700'
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneBg}`}>
            {Icon && <Icon className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
            <p className="text-xs text-ink-500">{description}</p>
          </div>
        </div>
        <Badge tone="neutral" size="sm">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <div className="p-3"><EmptyState title={empty} /></div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((c) => <li key={c.id}>{renderItem(c)}</li>)}
        </ul>
      )}
      {items.length > 0 && seeAllTo && (
        <div className="border-t border-border p-3 bg-subtle/50 flex justify-end">
          <Button as={Link} to={seeAllTo} variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>View all</Button>
        </div>
      )}
    </Card>
  )
}

function CaseRow({ c }) {
  return (
    <Link to={`/admin/cases/${c.id}`} className="block px-4 py-3 hover:bg-subtle">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-ink-900 text-sm truncate">{c.patient.name}</div>
          <div className="text-[11px] text-ink-400 font-mono">{c.ourRef}</div>
        </div>
        <Badge tone={FINANCIAL_TONE[c.financialType] || 'neutral'} size="sm">{c.financialType}</Badge>
      </div>
      <div className="text-[11px] text-ink-500 mt-1.5 flex items-center gap-2">
        <Building2 className="w-3 h-3" /> {getBranchName(c.branchId)}
        <span className="text-ink-300">·</span>
        <Badge tone={STATUS_TONE[c.invoiceReadiness] || 'neutral'} size="sm">{c.invoiceReadiness}</Badge>
        <span className="ms-auto text-ink-400">{fmtDate(c.visitDate)}</span>
      </div>
    </Link>
  )
}
