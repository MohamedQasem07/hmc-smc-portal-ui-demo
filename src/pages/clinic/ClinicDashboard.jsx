import { Link } from 'react-router-dom'
import {
  Plus, ArrowLeftRight, Wallet, FileText, ClipboardList, Clock, Building2,
  ArrowUpRight, ArrowDownRight, ChevronRight, Inbox, FileBarChart2,
  MapPin, Stethoscope, AlertCircle,
} from 'lucide-react'
import { PageHeader, PageBody } from '../../components/layout/PageHeader'
import { KpiCard, Card, Button, Badge, EmptyState } from '../../components/ui'
import { CASES, FACILITIES, getBranchName, getBranch, DEMO_TODAY, DEMO_TODAY_LABEL } from '../../data/mock'
import { useUserMode } from '../../context/UserModeContext'
import { fmtDate, fmtRelative } from '../../lib/format'
import { FINANCIAL_TONE, ROUTE_TONE, STATUS_TONE } from '../../components/ui/Badge'

export default function ClinicDashboard() {
  const { user } = useUserMode()
  const branch = getBranch(user.branchId)
  const facility = FACILITIES.find((f) => f.id === user.facilityId)
  const branchCases = CASES.filter((c) => c.branchId === user.branchId)

  const todayCases     = branchCases.filter((c) => (c.visitDate || '').slice(0, 10) === DEMO_TODAY)
  const directToday    = todayCases.filter((c) => c.route === 'Direct').length
  const cashToday      = todayCases.filter((c) => c.financialType === 'Cash').length
  const insToday       = todayCases.filter((c) => c.financialType === 'Insurance').length
  const pendingToday   = todayCases.filter((c) => c.financialType === 'Pending').length
  const transfersOut   = todayCases.filter((c) => c.route === 'Transferred Out').length
  const incomingPending = branchCases.filter((c) => c.route === 'Transferred In' && !c.transferReceivedAt)

  const sortByVisit = (a, b) => (b.visitDate || '').localeCompare(a.visitDate || '')
  const todayList     = [...todayCases].sort(sortByVisit).slice(0, 5)
  const awaitingClass = branchCases.filter((c) => c.financialType === 'Pending').slice(0, 5)
  const recentMoves   = branchCases.filter((c) => c.route !== 'Direct').sort(sortByVisit).slice(0, 5)

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center flex-wrap gap-2">
            Branch Dashboard
            <Badge tone="navy" size="sm"><Building2 className="w-3 h-3" /> {facility?.name || 'HMC'} · {branch?.name}</Badge>
          </span>
        }
        description={
          <span>
            Welcome, <span className="font-medium text-ink-700">{user.name}</span> · {user.title} · {DEMO_TODAY_LABEL}
          </span>
        }
        actions={
          <div className="hidden sm:flex items-center gap-2">
            <Button as={Link} to="/clinic/daily-report" variant="secondary" leftIcon={<FileBarChart2 className="w-4 h-4" />}>
              Daily Report
            </Button>
            <Button as={Link} to="/clinic/transfers" variant="secondary" leftIcon={<Inbox className="w-4 h-4" />}>
              Receive Transfer
              {incomingPending.length > 0 && <Badge tone="warning" size="sm" className="ms-1">{incomingPending.length}</Badge>}
            </Button>
            <Button as={Link} to="/clinic/new-case" size="lg" leftIcon={<Plus className="w-4 h-4" />}>
              Register New Case
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* Mobile primary actions */}
        <div className="sm:hidden grid grid-cols-3 gap-2">
          <Button as={Link} to="/clinic/new-case"      fullWidth leftIcon={<Plus className="w-4 h-4" />}>New Case</Button>
          <Button as={Link} to="/clinic/transfers"     variant="secondary" fullWidth leftIcon={<Inbox className="w-4 h-4" />}>Receive</Button>
          <Button as={Link} to="/clinic/daily-report"  variant="secondary" fullWidth leftIcon={<FileBarChart2 className="w-4 h-4" />}>Report</Button>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4">
          <KpiCard label="Cases Today"        value={todayCases.length} icon={ClipboardList} tone="navy" />
          <KpiCard label="Direct"             value={directToday}       icon={MapPin}        tone="navy" />
          <KpiCard label="Transfers Sent"     value={transfersOut}      icon={ArrowUpRight}  tone="violet" />
          <KpiCard label="Incoming Transfers" value={incomingPending.length} icon={ArrowDownRight} tone="violet" />
          <KpiCard label="Cash"               value={cashToday}         icon={Wallet}        tone="emerald" />
          <KpiCard label="Insurance"          value={insToday}          icon={FileText}      tone="sky" />
          <KpiCard label="Pending"            value={pendingToday}      icon={Clock}         tone="amber" />
        </div>

        {/* Two-column layout — wider area for cases registered today */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <BranchPanel
            title="Cases Registered Today"
            description="Walk-in, hotel referral, and transfers received."
            icon={ClipboardList}
            tone="navy"
            seeAllTo="/clinic/cases"
            seeAllLabel="View all"
            items={todayList}
            renderItem={(c) => <CaseListRow c={c} />}
            empty="No cases registered yet today."
            className="xl:col-span-2"
          />

          <BranchPanel
            title="Incoming Transfers"
            description="Awaiting receipt at this branch."
            icon={ArrowLeftRight}
            tone="violet"
            badge={incomingPending.length > 0 ? `${incomingPending.length} pending` : null}
            badgeTone="warning"
            seeAllTo="/clinic/transfers"
            seeAllLabel="Open"
            items={incomingPending.slice(0, 5)}
            renderItem={(t) => (
              <Link to="/clinic/transfers" className="block p-3.5 hover:bg-subtle">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink-900 text-sm truncate">{t.patient.name}</div>
                    <div className="text-[11px] text-ink-400 font-mono">{t.ourRef}</div>
                  </div>
                  <Badge tone="transferred" size="sm">From {t.transferFromName?.replace(' Clinic','')}</Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-500">
                  <Building2 className="w-3 h-3" /> {t.hotel}
                  <span className="mx-0.5 text-ink-300">·</span>
                  <Clock className="w-3 h-3" /> {fmtRelative(t.transferSentAt)}
                </div>
                {t.transferNote && (
                  <div className="mt-1.5 text-xs text-violet-900 bg-violet-50 border border-violet-100 rounded p-1.5 italic">
                    “{t.transferNote}”
                  </div>
                )}
              </Link>
            )}
            empty="No transfers awaiting receipt."
          />
        </div>

        {/* Second row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <BranchPanel
            title="Cases Awaiting Financial Classification"
            description="Convert to Cash or Insurance once the branch confirms."
            icon={AlertCircle}
            tone="amber"
            items={awaitingClass}
            seeAllTo="/clinic/cases"
            renderItem={(c) => (
              <Link to={`/clinic/cases/${c.id}`} className="flex items-center justify-between gap-2 p-3.5 hover:bg-subtle">
                <div className="min-w-0 flex items-center gap-3">
                  <Avatar name={c.patient.name} />
                  <div className="min-w-0">
                    <div className="font-semibold text-ink-900 text-sm truncate">{c.patient.name}</div>
                    <div className="text-[11px] text-ink-400 font-mono">{c.ourRef}</div>
                  </div>
                </div>
                <Badge tone="pending" size="sm">{c.financialType}</Badge>
              </Link>
            )}
            empty="All cases classified."
          />

          <BranchPanel
            title="Recent Transfer Movement"
            description="Sent or received by this branch."
            icon={ArrowLeftRight}
            tone="violet"
            items={recentMoves}
            seeAllTo="/clinic/transfers"
            renderItem={(c) => (
              <Link to={`/clinic/cases/${c.id}`} className="block p-3.5 hover:bg-subtle">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-ink-900 text-sm truncate">{c.patient.name}</div>
                  <Badge tone="transferred" size="sm">{c.route}</Badge>
                </div>
                <div className="text-[11px] text-ink-500 mt-1 flex items-center gap-1.5">
                  <span>{c.transferFromName || branch?.name}</span>
                  <ChevronRight className="w-3 h-3 text-ink-300" />
                  <span>{c.transferToName || branch?.name}</span>
                  <span className="mx-1 text-ink-300">·</span>
                  <Clock className="w-3 h-3" /> {fmtRelative(c.transferSentAt || c.visitDate)}
                </div>
              </Link>
            )}
            empty="No transfer movement yet today."
          />
        </div>

        <div className="text-[11px] text-ink-400">
          Demo dataset — totals reflect mock rows in <span className="font-mono">src/data/mock.js</span>.
        </div>
      </PageBody>
    </>
  )
}

// --------------------------------------------------------------------
// Local pieces
// --------------------------------------------------------------------
function BranchPanel({ title, description, icon: Icon, tone = 'navy', items, renderItem, empty, badge, badgeTone = 'neutral', seeAllTo, seeAllLabel = 'See all', className }) {
  const toneBg = {
    navy: 'bg-navy-50 text-navy-700',
    sky: 'bg-sky-50 text-sky-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  }[tone] || 'bg-navy-50 text-navy-700'
  return (
    <Card padding="none" className={`overflow-hidden ${className || ''}`}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${toneBg}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink-900 truncate">{title}</h3>
            <p className="text-xs text-ink-500 truncate">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge && <Badge tone={badgeTone} dot size="sm">{badge}</Badge>}
          {seeAllTo && (
            <Button as={Link} to={seeAllTo} variant="ghost" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
              {seeAllLabel}
            </Button>
          )}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="p-3"><EmptyState title={empty} /></div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it) => <li key={it.id}>{renderItem(it)}</li>)}
        </ul>
      )}
    </Card>
  )
}

function CaseListRow({ c }) {
  return (
    <Link to={`/clinic/cases/${c.id}`} className="flex items-start gap-3 p-3.5 hover:bg-subtle">
      <Avatar name={c.patient.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold text-ink-900 text-sm truncate">{c.patient.name}</div>
          <span className="text-[11px] text-ink-500 whitespace-nowrap">{c.visitTime || ''}</span>
        </div>
        <div className="text-[11px] text-ink-400 font-mono">{c.ourRef}</div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <Badge tone={ROUTE_TONE[c.route] || 'neutral'} size="sm">{c.route}</Badge>
          <Badge tone={FINANCIAL_TONE[c.financialType] || 'neutral'} size="sm">{c.financialType}</Badge>
          <Badge tone={STATUS_TONE[c.invoiceReadiness] || 'neutral'} size="sm">{c.invoiceReadiness}</Badge>
        </div>
      </div>
    </Link>
  )
}

function Avatar({ name }) {
  const initials = name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-9 h-9 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center font-semibold text-xs shrink-0">
      {initials}
    </div>
  )
}
