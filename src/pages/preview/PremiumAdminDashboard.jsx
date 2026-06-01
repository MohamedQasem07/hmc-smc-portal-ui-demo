import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown, Calendar, Building2, Wallet, FileText, Clock,
  ArrowUpRight, ArrowDownRight, FileCheck2, ShieldAlert, Banknote, CreditCard,
  ChevronRight, BarChart3, AlertTriangle, MapPin, Plus, Settings,
  LayoutDashboard, DoorOpen, ArrowLeftRight, Inbox, Gift,
  Stethoscope,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import {
  PremiumKpi, StatusPill, PremiumButton, Avatar, SectionLabel,
  Sparkline, MeshCorner,
} from '../../premium/primitives'
import {
  BRANCHES, FACILITIES, aggregateForAdmin, getBranchName, CASES,
} from '../../data/mock'
import { fmtDate, fmtMoney, fmtRelative } from '../../lib/format'
import { cn } from '../../lib/cn'
import { IS_SUPABASE } from '../../lib/api/config'
import { useCases } from '../../context/DemoStateContext'
import { KpiCard } from '../../components/ui/KpiCard'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'

export default function PremiumAdminDashboard() {
  // Live (Supabase) mode: render ONLY real data — never the mock body below.
  if (IS_SUPABASE) return <LiveAdminDashboard />

  const [date, setDate] = useState('2026-05-26')
  const [facility, setFacility] = useState('all')
  const [branch, setBranch] = useState('all')

  const agg = useMemo(() => aggregateForAdmin({ date, facilityId: facility, branchId: branch }), [date, facility, branch])

  const branchesInFacility = facility === 'all' ? BRANCHES : BRANCHES.filter((b) => b.facility === facility)

  // Trend sparklines — mock daily history for the 7 most recent days
  const trends = {
    total:     [3, 5, 4, 6, 5, 7, agg.totals.total || 7],
    cash:      [2, 3, 2, 3, 4, 5, agg.totals.cash || 1],
    insurance: [2, 4, 3, 5, 4, 6, agg.totals.insurance || 2],
    pending:   [4, 3, 5, 4, 3, 4, agg.totals.pending || 4],
  }

  const needsClassification = agg.list.filter((c) => c.financialType === 'Pending').slice(0, 5)
  const missingInfo = CASES.filter((c) =>
    (c.financialType === 'Insurance' && c.coverageStatus !== 'Confirmed') ||
    (c.financialType === 'Cash' && c.mixedCurrency),
  ).slice(0, 5)
  const readyQueue = CASES.filter((c) => c.invoiceReadiness === 'Ready for Invoice').slice(0, 5)
  const recentTransfers = CASES.filter((c) => c.route !== 'Direct')
    .sort((a, b) => ((b.transferSentAt || b.visitDate || '') > (a.transferSentAt || a.visitDate || '') ? 1 : -1))
    .slice(0, 4)

  const maxBranchTotal = Math.max(1, ...agg.branchComparison.map((b) => b.total))

  return (
    <AdminShell active="dashboard">
      <div className="px-6 lg:px-10 py-7 lg:py-9 space-y-7 max-w-[1500px] w-full mx-auto">
            {/* ===== HERO BAND ===== */}
            <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-7 lg:px-10 lg:py-9 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
              <MeshCorner position="tr" size={300} color="#2DD4C7" opacity={0.28} />
              <MeshCorner position="bl" size={260} color="#1E4180" opacity={0.20} />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-6 lg:justify-between">
                <div className="max-w-2xl">
                  <div className="p-eyebrow" style={{ color: '#7FE7DE' }}>
                    Admin Workspace · {fmtDate(date)}
                  </div>
                  <h1 className="p-display p-display-light text-[34px] lg:text-[40px] mt-2">
                    Operations <span style={{ color: '#7FE7DE' }}>at a glance.</span>
                  </h1>
                  <p className="text-sm lg:text-base mt-2 max-w-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>
                    Every branch, every case, every currency — separated, clear, and ready for review. Toggle filters below to focus.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <HeroStat label="Total Today"     value={agg.totals.total}      delta="+12%" trendDir="up" />
                  <HeroStat label="Ready for Invoice" value={agg.totals.ready}    delta="2 new" trendDir="up" />
                  <HeroStat label="Needs Review"    value={agg.totals.needsAdminReview} delta="action" trendDir="down" />
                </div>
              </div>
            </section>

            {/* ===== FILTER BAR ===== */}
            <section className="p-card p-3 sm:p-4 p-rise-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <FilterChip icon={Calendar} label="Date" value="Today · 26 May 2026" options={[
                  { value: '2026-05-26', label: 'Today · 26 May 2026' },
                  { value: '2026-05-25', label: '25 May 2026' },
                  { value: '2026-05-24', label: '24 May 2026' },
                ]} current={date} onChange={setDate} />
                <FilterChip icon={Building2} label="Facility" value={facility === 'all' ? 'All' : FACILITIES.find(f => f.id === facility)?.name} options={[
                  { value: 'all', label: 'All facilities' },
                  ...FACILITIES.map(f => ({ value: f.id, label: f.name })),
                ]} current={facility} onChange={(v) => { setFacility(v); setBranch('all') }} />
                <FilterChip icon={MapPin} label="Branch" value={branch === 'all' ? 'All' : getBranchName(branch)} options={[
                  { value: 'all', label: 'All branches' },
                  ...branchesInFacility.map(b => ({ value: b.id, label: b.name })),
                ]} current={branch} onChange={setBranch} />
                <FilterChip icon={Wallet} label="Financial" value="All" options={[{ value: 'all', label: 'All' }, { value: 'Cash', label: 'Cash' }, { value: 'Insurance', label: 'Insurance' }, { value: 'Pending', label: 'Pending' }]} current="all" />
                <FilterChip icon={ArrowUpRight} label="Route" value="All" options={[{ value: 'all', label: 'All' }, { value: 'Direct', label: 'Direct' }, { value: 'Transferred In', label: 'Transferred In' }, { value: 'Transferred Out', label: 'Transferred Out' }]} current="all" />
                <div className="flex-1" />
                <button className="p-btn-ghost h-10 px-4 text-xs flex items-center gap-1.5">
                  <ChevronDown className="w-3.5 h-3.5" /> More filters
                </button>
              </div>
            </section>

            {/* ===== KPI ROW with sparklines ===== */}
            <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 p-rise-2">
              <TrendKpi label="Total Cases"    value={agg.totals.total}     data={trends.total}     color="#1E4180" trendNote="+12% vs 7-day avg" />
              <TrendKpi label="Cash"           value={agg.totals.cash}      data={trends.cash}      color="#18A877" trendNote="2 in EUR · 1 mixed" />
              <TrendKpi label="Insurance"      value={agg.totals.insurance} data={trends.insurance} color="#0FB5A9" trendNote="4 confirmed · 1 review" />
              <TrendKpi label="Pending"        value={agg.totals.pending}   data={trends.pending}   color="#E1A148" trendNote="awaiting classification" trendDown />
              <PremiumKpi label="Needs Review" value={agg.totals.needsAdminReview} icon={ShieldAlert} tone="mixed" hint="Mixed currency · coverage requests" />
            </section>

            {/* ===== Cash Summary (wide) + Branch Leaderboard ===== */}
            <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
              <CashCollectionPanel agg={agg} />
              <BranchLeaderboard branches={agg.branchComparison} maxTotal={maxBranchTotal} />
            </section>

            {/* ===== Operational panels ===== */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <OperationalPanel
                eyebrow="Action required"
                title="Cases Needing Classification"
                accent="amber"
                items={needsClassification}
                empty="All cases classified."
                renderItem={(c) => <CaseRow c={c} statusTone="pending" status="Pending" />}
              />
              <OperationalPanel
                eyebrow="Information"
                title="Missing Required Information"
                accent="red"
                items={missingInfo}
                empty="No cases missing info."
                renderItem={(c) => (
                  c.financialType === 'Cash'
                    ? <CaseRow c={c} statusTone="mixed"  status="Mixed Currency" />
                    : <CaseRow c={c} statusTone="amber"  status={c.coverageStatus || 'Details Pending'} />
                )}
              />
              <OperationalPanel
                eyebrow="Workflow"
                title="Ready for Invoice"
                accent="teal"
                items={readyQueue}
                empty="No cases ready."
                renderItem={(c) => <CaseRow c={c} statusTone="finalized" status="Ready" />}
              />
            </section>

            {/* ===== Recent Transfers ===== */}
            <section className="p-card p-rise-2">
              <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--p-border)' }}>
                <SectionLabel
                  eyebrow="Live activity"
                  title="Recent Transfer Movement"
                  description="Movement between clinics across both facilities."
                  action={<Link to="/admin/cases" className="text-xs font-semibold" style={{ color: 'var(--p-teal)' }}>Open Cases Master →</Link>}
                />
              </div>
              <ul className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
                {recentTransfers.map((c) => (
                  <li key={c.id} className="px-5 py-4 flex items-center gap-4 transition-colors hover:bg-[var(--p-surface-tint)]">
                    <Avatar name={c.patient.name} size={42} tone="navy" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</span>
                        <StatusPill tone="transferred">{c.route}</StatusPill>
                      </div>
                      <div className="text-[12px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
                        <Building2 className="w-3 h-3" />
                        {c.transferFromName || getBranchName(c.branchId)}
                        <span style={{ color: 'var(--p-ink-300)' }}>→</span>
                        {c.transferToName || getBranchName(c.branchId)}
                        <span style={{ color: 'var(--p-ink-300)' }}>·</span>
                        <Clock className="w-3 h-3" /> {fmtRelative(c.transferSentAt || c.visitDate)}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--p-ink-300)' }} />
                  </li>
                ))}
              </ul>
            </section>

            {/* CTA — entry to Admin Control Center */}
            <section className="p-card p-rise-3 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FBF5EC 0%, #FFFFFF 60%, #E0F8F6 100%)' }}>
              <MeshCorner position="tr" size={220} color="#0FB5A9" opacity={0.12} />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 lg:p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1E4180 0%, #0A1B3D 100%)', color: 'white', boxShadow: '0 8px 24px rgba(10, 27, 61, 0.20)' }}>
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="p-eyebrow">Admin Only</div>
                    <h2 className="p-h2 text-lg mt-1">System Setup &amp; Master Data</h2>
                    <p className="text-sm mt-1.5 max-w-lg" style={{ color: 'var(--p-ink-600)' }}>
                      Configure facilities, users, payment methods, insurance workflow statuses and reference lists used everywhere across the Portal.
                    </p>
                  </div>
                </div>
                <PremiumButton as={Link} to="/admin-control-center" size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Open Control Center
                </PremiumButton>
              </div>
            </section>
          </div>
    </AdminShell>
  )
}

// ====================================================================
// Humanize a branch/clinic id for display WITHOUT importing mock data, so the
// live path stays free of any mock dependency (e.g. "sahl_hasheesh" → "Sahl Hasheesh").
function prettyBranch(id) {
  if (!id) return '—'
  return String(id).split(/[_\s-]+/).map((w) => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')
}

// ====================================================================
// LIVE ADMIN DASHBOARD (Supabase mode) — real data only, no mock imports.
// Backed by useCases() which, in supabase mode, is populated from fetchCases().
// All numbers are computed from the RLS-scoped case list; clean empty states
// when there is nothing yet. NO fake sparklines, NO mock numbers.
// ====================================================================
function LiveAdminDashboard() {
  const cases = useCases()

  const stats = useMemo(() => {
    const isClosed = (c) => c.operationalStatus === 'Closed'
    const isDischarged = (c) =>
      c.encounterPattern === 'inpatient_admission' &&
      (c.admission?.dischargedAt || c.operationalStatus === 'Closed')

    const byFinancial = { Cash: 0, Insurance: 0, Free: 0, Pending: 0 }
    let open = 0
    let closed = 0
    let admittedNow = 0
    let dischargedClosed = 0
    let transfersPending = 0
    let transfersReceived = 0
    const roomsOccupied = new Set()

    // Cash-case revenue vs Insurance Excess — kept SEPARATE, grouped by
    // currency, no FX conversion (Mohamed's rule).
    const cashRevenueByCur = {}
    const excessByCur = {}

    for (const c of cases) {
      // Financial type buckets
      if (c.financialType === 'Cash') byFinancial.Cash += 1
      else if (c.financialType === 'Insurance') byFinancial.Insurance += 1
      else if (c.financialType === 'Free / Complimentary' || c.financialType === 'Free') byFinancial.Free += 1
      else byFinancial.Pending += 1

      // Open vs closed
      if (isClosed(c)) closed += 1
      else open += 1

      // Inpatient admitted now vs discharged
      if (c.encounterPattern === 'inpatient_admission') {
        if (c.admission && !c.admission.dischargedAt && !isClosed(c)) admittedNow += 1
        if (isDischarged(c)) dischargedClosed += 1
      }

      // Transfers
      if (c.transfer) {
        if (c.transfer.receivedAt || c.transfer.status === 'Received') transfersReceived += 1
        else transfersPending += 1
      }

      // Rooms occupied (unique branch+room with an active occupant)
      if (c.centerRoomNumber != null && !isClosed(c)) {
        roomsOccupied.add(`${c.branchId || '?'}::${c.centerRoomNumber}`)
      }

      // Cash-invoice payments (cash-case revenue)
      for (const l of c.paymentLines || []) {
        const amt = Number(l.amount) || 0
        if (!amt) continue
        const cur = l.currency || '—'
        cashRevenueByCur[cur] = (cashRevenueByCur[cur] || 0) + amt
      }
      // Patient excess (Insurance Excess) — never merged with cash revenue
      for (const l of c.excessLines || []) {
        const amt = Number(l.amount) || 0
        if (!amt) continue
        const cur = l.currency || '—'
        excessByCur[cur] = (excessByCur[cur] || 0) + amt
      }
    }

    return {
      total: cases.length,
      byFinancial,
      open,
      closed,
      admittedNow,
      dischargedClosed,
      transfersPending,
      transfersReceived,
      roomsOccupied: roomsOccupied.size,
      cashRevenueByCur,
      excessByCur,
    }
  }, [cases])

  const hasCases = stats.total > 0
  const cashRows = Object.entries(stats.cashRevenueByCur)
  const excessRows = Object.entries(stats.excessByCur)

  const recentTransfers = useMemo(() =>
    cases
      .filter((c) => c.transfer)
      .sort((a, b) => ((b.transfer?.sentAt || b.visitDate || '') > (a.transfer?.sentAt || a.visitDate || '') ? 1 : -1))
      .slice(0, 6),
  [cases])

  return (
    <AdminShell active="dashboard">
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-9 space-y-6 max-w-[1500px] w-full mx-auto">
        <SectionHeader
          title="Admin Dashboard"
          description="Live operational overview — every figure is computed from real cases visible to you."
        />

        {!hasCases ? (
          <Card padding="none">
            <EmptyState
              icon={Inbox}
              title="No live cases yet."
              message="Once cases are registered they will appear here with live counts, transfers and collections."
            />
          </Card>
        ) : (
          <>
            {/* ===== Primary KPIs ===== */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard label="Total Cases"        value={stats.total}              icon={FileText}     tone="navy" />
              <KpiCard label="Open / Active"      value={stats.open}               icon={Stethoscope}  tone="sky"     hint={`${stats.closed} discharged / closed`} />
              <KpiCard label="Admitted Now"       value={stats.admittedNow}        icon={DoorOpen}     tone="violet"  hint={`${stats.dischargedClosed} discharged`} />
              <KpiCard label="Rooms Occupied"     value={stats.roomsOccupied}      icon={Building2}    tone="emerald" hint="Center rooms with an active patient" />
            </section>

            {/* ===== Financial type breakdown ===== */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard label="Cash Cases"      value={stats.byFinancial.Cash}      icon={Banknote}   tone="emerald" />
              <KpiCard label="Insurance Cases" value={stats.byFinancial.Insurance} icon={FileCheck2} tone="sky" />
              <KpiCard label="Free Cases"      value={stats.byFinancial.Free}      icon={Gift}       tone="violet" />
              <KpiCard label="Pending Type"    value={stats.byFinancial.Pending}   icon={ShieldAlert} tone="amber"  hint="Awaiting classification" />
            </section>

            {/* ===== Transfers + Collections (cash vs excess, never merged) ===== */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Transfers */}
              <Card padding="none" className="overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <SectionHeader icon={ArrowLeftRight} title="Transfers" description="Movement between clinics." className="mb-0" />
                </div>
                <div className="grid grid-cols-2 divide-x divide-border">
                  <div className="px-5 py-5 text-center">
                    <div className="text-2xl sm:text-3xl font-semibold text-ink-900 tabular-nums leading-none">{stats.transfersPending}</div>
                    <div className="mt-1.5 text-[11px] uppercase tracking-wide text-ink-500 font-medium">Pending</div>
                  </div>
                  <div className="px-5 py-5 text-center">
                    <div className="text-2xl sm:text-3xl font-semibold text-ink-900 tabular-nums leading-none">{stats.transfersReceived}</div>
                    <div className="mt-1.5 text-[11px] uppercase tracking-wide text-ink-500 font-medium">Received</div>
                  </div>
                </div>
              </Card>

              {/* Cash-case revenue */}
              <Card padding="none" className="overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <SectionHeader icon={Banknote} title="Cash-Case Revenue" description="By currency · no conversion." className="mb-0" />
                </div>
                <div className="p-4">
                  {cashRows.length === 0 ? (
                    <p className="text-xs text-ink-400 px-1 py-3">No cash collections yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {cashRows.map(([cur, amt]) => (
                        <li key={cur} className="flex items-center justify-between rounded-lg bg-subtle border border-border px-3 py-2">
                          <span className="text-sm font-semibold text-ink-700">{cur}</span>
                          <span className="text-sm font-bold text-ink-900 tabular-nums">{fmtMoney(amt, cur)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>

              {/* Insurance Excess — separate from cash revenue */}
              <Card padding="none" className="overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <SectionHeader icon={Wallet} title="Insurance Excess" description="Patient excess · kept separate." className="mb-0" />
                </div>
                <div className="p-4">
                  {excessRows.length === 0 ? (
                    <p className="text-xs text-ink-400 px-1 py-3">No insurance excess collected yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {excessRows.map(([cur, amt]) => (
                        <li key={cur} className="flex items-center justify-between rounded-lg bg-subtle border border-border px-3 py-2">
                          <span className="text-sm font-semibold text-ink-700">{cur}</span>
                          <span className="text-sm font-bold text-ink-900 tabular-nums">{fmtMoney(amt, cur)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </section>

            {/* ===== Recent transfer movement ===== */}
            <Card padding="none" className="overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <SectionHeader
                  icon={ArrowLeftRight}
                  title="Recent Transfer Movement"
                  description="Latest cases transferred between clinics."
                  action={<Link to="/admin/cases" className="text-xs font-semibold text-navy-700">Open Cases Master →</Link>}
                  className="mb-0"
                />
              </div>
              {recentTransfers.length === 0 ? (
                <EmptyState icon={ArrowLeftRight} title="No transfers yet." message="Transferred cases will show here as they move between clinics." />
              ) : (
                <ul className="divide-y divide-border">
                  {recentTransfers.map((c) => (
                    <li key={c.id} className="px-5 py-3.5 flex items-center gap-3">
                      <Avatar name={c.patient?.name || '—'} size={38} tone="navy" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-ink-900 truncate">{c.patient?.name || '—'}</span>
                          <StatusPill tone={c.transfer?.receivedAt ? 'finalized' : 'transferred'}>
                            {c.transfer?.receivedAt ? 'Received' : 'Pending'}
                          </StatusPill>
                        </div>
                        <div className="text-[12px] mt-0.5 flex items-center gap-1.5 text-ink-500">
                          <Building2 className="w-3 h-3" />
                          {prettyBranch(c.transfer?.fromClinicId || c.branchId)}
                          <span className="text-ink-300">→</span>
                          {prettyBranch(c.transfer?.toBranchId || c.branchId)}
                          <span className="text-ink-300">·</span>
                          <Clock className="w-3 h-3" /> {fmtRelative(c.transfer?.sentAt || c.visitDate)}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-300 shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  )
}

// ====================================================================
function HeroStat({ label, value, delta, trendDir = 'up' }) {
  return (
    <div className="rounded-2xl px-4 py-3 min-w-[140px]" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }}>
      <div className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold p-numeric text-white">{value}</span>
        <span className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: trendDir === 'up' ? '#7FE7DE' : '#FFB89A' }}>
          {trendDir === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{delta}
        </span>
      </div>
    </div>
  )
}

function FilterChip({ icon: Icon, label, value, options, current, onChange }) {
  return (
    <label className="relative inline-flex items-center gap-2 h-10 rounded-full px-3 cursor-pointer transition-all hover:border-[var(--p-border-strong)]"
      style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
      {Icon && <Icon className="w-3.5 h-3.5" style={{ color: 'var(--p-ink-500)' }} />}
      <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: 'var(--p-ink-800)' }}>{value}</span>
      <ChevronDown className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} />
      {options && current !== undefined && (
        <select
          value={current}
          onChange={(e) => onChange?.(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </label>
  )
}

function TrendKpi({ label, value, data, color, trendNote, trendDown }) {
  return (
    <div className="p-card p-4 sm:p-5 relative overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
          <div className="mt-2 text-3xl sm:text-[36px] font-bold p-numeric leading-none" style={{ color: 'var(--p-ink-900)' }}>{value}</div>
        </div>
        <Sparkline data={data} color={color} width={84} height={32} />
      </div>
      <div className="mt-3 text-[11px] flex items-center gap-1 font-medium" style={{ color: trendDown ? 'var(--p-pending)' : 'var(--p-cash)' }}>
        {trendDown ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
        <span style={{ color: 'var(--p-ink-500)', fontWeight: 500 }}>{trendNote}</span>
      </div>
    </div>
  )
}

function CashCollectionPanel({ agg }) {
  const cashRows = Object.entries(agg.cashInvoiceByCurrency)
  const colRows  = Object.entries(agg.collections)
  return (
    <div className="p-card overflow-hidden p-rise-3">
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--p-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--p-cash-soft)', color: '#0A8F62' }}>
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <div className="p-eyebrow">Cash Operations</div>
            <h3 className="p-h2 text-base">Collection Summary by Currency</h3>
          </div>
        </div>
        <StatusPill tone="amber" dot>No conversion</StatusPill>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--p-border)' }}>
        <div className="p-5">
          <div className="p-eyebrow mb-3">Invoice Totals</div>
          {cashRows.length === 0 ? <div className="text-sm" style={{ color: 'var(--p-ink-400)' }}>No cash invoices.</div> : (
            <ul className="space-y-2.5">
              {cashRows.map(([cur, val]) => (
                <li key={cur} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--p-surface-tint)' }}>
                  <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--p-ink-700)' }}>
                    <span className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: 'white', color: 'var(--p-brand-mid)', border: '1px solid var(--p-border)' }}>{cur}</span>
                    Invoice currency
                  </span>
                  <span className="text-base font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmtMoney(val, cur)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-5">
          <div className="p-eyebrow mb-3">Collected Payments</div>
          {colRows.length === 0 ? <div className="text-sm" style={{ color: 'var(--p-ink-400)' }}>No collections.</div> : (
            <ul className="space-y-2.5">
              {colRows.map(([key, val]) => {
                const [method, cur] = key.split('::')
                const icon = method === 'Cash' ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />
                return (
                  <li key={key} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--p-surface-tint)' }}>
                    <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--p-ink-700)' }}>
                      <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'white', color: 'var(--p-brand-mid)', border: '1px solid var(--p-border)' }}>{icon}</span>
                      {method} · {cur}
                    </span>
                    <span className="text-base font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmtMoney(val, cur)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="px-5 py-3 text-[11px] flex items-start gap-2" style={{ background: 'var(--p-pending-soft)', color: '#7A4F1F', borderTop: '1px solid var(--p-border)' }}>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Mixed-currency cases need admin review. No exchange-rate conversion is performed. Reconciliation happens outside Portal.
      </div>
    </div>
  )
}

function BranchLeaderboard({ branches, maxTotal }) {
  return (
    <div className="p-card overflow-hidden p-rise-3">
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--p-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--p-brand-pale)', color: 'var(--p-brand-mid)' }}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="p-eyebrow">Activity</div>
            <h3 className="p-h2 text-base">Branch Leaderboard</h3>
          </div>
        </div>
      </div>
      <ul className="px-3 py-3 space-y-1.5">
        {branches.slice(0, 6).map((b, i) => (
          <li key={b.branchId} className="px-2 py-2 rounded-lg transition-colors hover:bg-[var(--p-surface-tint)]">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold w-5 text-end" style={{ color: 'var(--p-ink-400)' }}>{i + 1}.</span>
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--p-ink-900)' }}>{b.branchName}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--p-ink-400)' }}>{b.facilityId}</span>
              </span>
              <span className="text-sm font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{b.total}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--p-border)' }}>
              <div className="h-full transition-all" style={{ width: `${(b.total / maxTotal) * 100}%`, background: 'linear-gradient(90deg, #0FB5A9 0%, #1E4180 100%)' }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function OperationalPanel({ eyebrow, title, accent, items, empty, renderItem }) {
  const accentColors = {
    amber: '#E1A148',
    red:   '#E26A6A',
    teal:  '#0FB5A9',
  }
  return (
    <div className="p-card overflow-hidden p-rise-3">
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--p-border)' }}>
        <div>
          <div className="p-eyebrow" style={{ color: accentColors[accent] }}>{eyebrow}</div>
          <h3 className="text-sm font-bold mt-0.5" style={{ color: 'var(--p-ink-900)' }}>{title}</h3>
        </div>
        <StatusPill tone="navy">{items.length}</StatusPill>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>{empty}</div>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
          {items.map((c) => <li key={c.id}>{renderItem(c)}</li>)}
        </ul>
      )}
    </div>
  )
}

function CaseRow({ c, statusTone, status }) {
  return (
    <a href="#" className="block px-5 py-3 transition-colors hover:bg-[var(--p-surface-tint)]">
      <div className="flex items-center gap-3">
        <Avatar name={c.patient.name} size={32} tone="navy" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
          <div className="text-[11px] font-mono" style={{ color: 'var(--p-ink-400)' }}>{c.ourRef}</div>
        </div>
        <StatusPill tone={statusTone} className="shrink-0">{status}</StatusPill>
      </div>
      <div className="text-[11px] mt-1.5 ms-11" style={{ color: 'var(--p-ink-500)' }}>
        {getBranchName(c.branchId)} · {fmtDate(c.visitDate)}
      </div>
    </a>
  )
}
