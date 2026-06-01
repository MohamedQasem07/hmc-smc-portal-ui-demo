import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown, Calendar, Building2, Wallet, FileText, Clock,
  ArrowUpRight, ArrowDownRight, FileCheck2, ShieldAlert, Banknote, CreditCard,
  ChevronRight, BarChart3, AlertTriangle, MapPin, Plus, Settings,
  LayoutDashboard, DoorOpen, ArrowLeftRight, Inbox, Gift,
  Stethoscope, ClipboardList, Archive, Users, UserCheck, BookOpen,
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
import { fetchCollections, summarizeCollectionsByPurpose } from '../../lib/api/portalData'
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

  // ---- Live treasury (real portal_collections, READ-ONLY — no status mutation) ----
  const [range, setRange] = useState('all')          // 'today' | 'all'
  const [collections, setCollections] = useState(null)   // null = loading
  const [colError, setColError] = useState(null)
  useEffect(() => {
    let alive = true
    let opts = {}
    if (range === 'today') {
      const d = new Date()
      const y = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      opts = { from: y, to: y }
    }
    setCollections(null); setColError(null)
    fetchCollections(opts)
      .then((r) => { if (alive) setCollections(r) })
      .catch((e) => { if (alive) { setCollections([]); setColError(e?.message || 'Failed to load collections.') } })
    return () => { alive = false }
  }, [range])
  const treasury = useMemo(() => summarizeCollectionsByPurpose(collections || []), [collections])
  const colLoading = collections === null

  return (
    <AdminShell active="dashboard">
      <div className="px-4 sm:px-6 lg:px-10 py-5 lg:py-6 space-y-5 max-w-[1440px] w-full mx-auto">
        {/* ===== Live hero band ===== */}
        <section className="p-mesh p-grid-overlay relative overflow-hidden p-rise px-5 sm:px-7 py-6 sm:py-7" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={280} color="#2DD4C7" opacity={0.26} />
          <MeshCorner position="bl" size={240} color="#1E4180" opacity={0.18} />
          <MeshCorner position="br" size={200} color="#D9A574" opacity={0.10} />
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full" style={{ background: 'rgba(15,181,169,0.18)', border: '1px solid rgba(15,181,169,0.30)', color: '#7FE7DE' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#2DD4C7' }} /> Live
              </span>
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.62)' }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div>
              <div className="p-eyebrow" style={{ color: '#7FE7DE' }}>HMC · SMC Admin</div>
              <h1 className="p-display p-display-light text-[28px] sm:text-[34px] lg:text-[40px] mt-1.5 leading-tight">Command <span style={{ color: '#7FE7DE' }}>Center.</span></h1>
              <p className="text-sm mt-2 max-w-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>Every figure is computed live from the real cases you can see — all branches, one operations view.</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[['Total Cases', stats.total], ['Open / Active', stats.open], ['Admitted Now', stats.admittedNow], ['Transfers', stats.transfersPending + stats.transfersReceived], ['Rooms', stats.roomsOccupied]].map(([l, v]) => (
                <div key={l} className="rounded-xl px-2.5 py-2.5 text-center min-w-0" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)' }}>
                  <div className="text-xl sm:text-2xl font-bold p-numeric text-white leading-none">{v}</div>
                  <div className="text-[9px] uppercase tracking-[0.1em] font-semibold mt-1 truncate" style={{ color: 'rgba(255,255,255,0.62)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {!hasCases ? (
          <section className="p-card p-card-top relative overflow-hidden text-center px-6 py-12 sm:py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #1E4180, #0A1B3D)', boxShadow: 'var(--p-shadow-glow)' }}>
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <div className="p-eyebrow justify-center" style={{ color: 'var(--p-teal)' }}>Platform ready</div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold mt-1.5" style={{ color: 'var(--p-ink-900)', letterSpacing: '-0.02em' }}>Register the first case</h2>
            <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: 'var(--p-ink-500)' }}>This dashboard lights up with live counts, transfers and collections as soon as clinics start registering patients.</p>
            <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
              <StatusPill tone="navy" dot>9 branches</StatusPill>
              <StatusPill tone="teal" dot>EUR · GBP · USD · EGP</StatusPill>
              <StatusPill tone="internal" dot>Live insurance tracking</StatusPill>
            </div>
          </section>
        ) : (
          <>
            {/* ===== Operations KPIs ===== */}
            <section className="space-y-2">
              <SectionAccent label="Today's Operations" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <PremiumKpi label="Total Cases"    value={stats.total}         icon={FileText}    tone="navy" />
                <PremiumKpi label="Open / Active"  value={stats.open}          icon={Stethoscope} tone="teal"     hint={`${stats.closed} discharged`} />
                <PremiumKpi label="Admitted Now"   value={stats.admittedNow}   icon={DoorOpen}    tone="transfer" hint={`${stats.dischargedClosed} discharged`} />
                <PremiumKpi label="Rooms Occupied" value={stats.roomsOccupied} icon={Building2}    tone="cash"     hint="Active patient rooms" />
              </div>
            </section>

            {/* ===== Financial mix KPIs (clean number tiles, no decorative chips) ===== */}
            <section className="space-y-2">
              <SectionAccent label="Cases & Branch Activity" color="var(--p-gold)" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <PremiumKpi label="Cash Cases"      value={stats.byFinancial.Cash}      icon={Banknote}    tone="cash" />
                <PremiumKpi label="Insurance Cases" value={stats.byFinancial.Insurance} icon={ShieldAlert} tone="teal" />
                <PremiumKpi label="Free Cases"      value={stats.byFinancial.Free}      icon={Gift}        tone="transfer" />
                <PremiumKpi label="Pending Type"    value={stats.byFinancial.Pending}   icon={Clock}       tone="pending" hint="Awaiting classification" />
              </div>
            </section>

            {/* ===== Live Treasury — real portal_collections (read-only, no status mutation) ===== */}
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <SectionHeader title="Treasury / Collections"
                  description="Real portal_collections · grouped by currency · no conversion · patient excess kept separate from cash revenue." className="mb-0" />
                <div className="inline-flex rounded-full p-0.5 shrink-0" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                  {[{ id: 'today', label: 'Today' }, { id: 'all', label: 'All' }].map((r) => (
                    <button key={r.id} onClick={() => setRange(r.id)}
                      className={cn('h-8 px-3.5 rounded-full text-xs font-semibold transition-colors',
                        range === r.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500')}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {colError && (
                <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]"
                  style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span className="font-semibold">{colError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <TreasuryMoneyCard title="Cash Case Revenue" icon={Banknote} tone="emerald" desc="Cash-case invoices collected" byCur={treasury.purpose.cash_case_payment} loading={colLoading} emptyText="No cash-case collections in range." />
                <TreasuryMoneyCard title="Insurance Excess Collected" icon={Wallet} tone="amber" desc="Patient excess — treasury money, separate from cash revenue" byCur={treasury.purpose.patient_excess} loading={colLoading} emptyText="No insurance excess in range." />
                <TreasuryMoneyCard title="Physical Cash" icon={Banknote} tone="sky" desc="Cash drawer · original currency" byCur={treasury.channel.physical_cash} loading={colLoading} emptyText="No physical cash in range." />
                <TreasuryMoneyCard title="Visa / Bank" icon={CreditCard} tone="navy" desc="Card settlements · EGP" byCur={treasury.channel.visa_bank} loading={colLoading} emptyText="No Visa / bank collections in range." />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full bg-subtle border border-border px-3 py-1 text-[11px] font-medium text-ink-500">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Each currency is shown separately — no cross-currency conversion or combined total.
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                <Card padding="none" className="overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <SectionHeader title="Transfers" description="Movement between clinics." className="mb-0" />
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="px-5 py-5 text-center">
                      <div className="text-[28px] sm:text-[32px] font-bold text-ink-900 tabular-nums leading-none tracking-tight">{stats.transfersPending}</div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold">Pending</div>
                    </div>
                    <div className="px-5 py-5 text-center">
                      <div className="text-[28px] sm:text-[32px] font-bold text-ink-900 tabular-nums leading-none tracking-tight">{stats.transfersReceived}</div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold">Received</div>
                    </div>
                  </div>
                </Card>

                <Card padding="none" className="overflow-hidden lg:col-span-2">
                  <div className="px-5 py-4 border-b border-border">
                    <SectionHeader title="Collections Recorded" description={`Live collection lines · ${range === 'today' ? 'today' : 'all dates'}.`} className="mb-0" />
                  </div>
                  <div className="px-5 py-5 flex items-center gap-6 flex-wrap">
                    <div className="shrink-0">
                      <div className="text-[28px] sm:text-[32px] font-bold text-ink-900 tabular-nums leading-none tracking-tight">{colLoading ? '—' : treasury.count}</div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold">Collections</div>
                    </div>
                    <p className="text-[11px] text-ink-400 flex-1 min-w-[180px]">Treasury handover reconciliation (open vs handed-over) is tracked outside Portal until that step is enabled. No cross-currency grand total is shown.</p>
                    <Link to="/admin/collections" className="text-xs font-semibold inline-flex items-center gap-1 px-2.5 h-8 rounded-full text-ink-700 hover:text-ink-900 transition-colors whitespace-nowrap" style={{ border: '1px solid var(--p-border)', background: 'var(--p-surface-tint)' }}>Open Collections <ChevronRight className="w-3.5 h-3.5" /></Link>
                  </div>
                </Card>
              </div>
            </section>

            {/* ===== Recent transfer movement ===== */}
            <Card padding="none" className="overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <SectionHeader
                  title="Recent Transfer Movement"
                  description="Latest cases transferred between clinics."
                  action={<Link to="/admin/p2c-cases" className="text-xs font-semibold inline-flex items-center gap-1 px-2.5 h-8 rounded-full text-ink-700 hover:text-ink-900 transition-colors" style={{ border: '1px solid var(--p-border)', background: 'var(--p-surface-tint)' }}>Open Cases <ChevronRight className="w-3.5 h-3.5" /></Link>}
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

        {/* ===== Quick access — live operational screens (always available) ===== */}
        <section>
          <SectionHeader title="Quick Actions" description="Jump to the operational screens." className="mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            <QuickLink to="/admin/p2c-cases"            icon={ClipboardList} label="All Cases"            desc="Clinic & reception" />
            <QuickLink to="/admin/collections"          icon={Banknote}      label="Collections"          desc="Treasury log" />
            <QuickLink to="/admin/insurance-completion" icon={FileCheck2}    label="Insurance Completion" desc="Billing preparation" />
            <QuickLink to="/admin/legacy-review"        icon={Archive}       label="Old Cases"            desc="Historical archive" />
            <QuickLink to="/admin/users-staff"          icon={Users}         label="Users & Staff"        desc="Accounts & roles" />
            <QuickLink to="/admin/attendance"           icon={UserCheck}     label="Attendance"           desc="Nurse & doctor duty" />
            <QuickLink to="/admin/reference-lists"      icon={BookOpen}      label="Operational Config"   desc="Services · insurers · rooms" />
            <QuickLink to="/admin/reports/daily"        icon={FileText}      label="Daily Report"         desc="Collections by date" />
          </div>
        </section>
      </div>
    </AdminShell>
  )
}

// ====================================================================
// Live treasury money card — one currency-row list (read-only). No FX, no total.
function TreasuryMoneyCard({ title, icon: Icon, desc, byCur, loading, emptyText, tone = 'navy' }) {
  const t = {
    emerald: { chip: 'bg-emerald-50 text-emerald-700', row: 'bg-emerald-50/40 border-emerald-100', amt: 'text-emerald-800' },
    amber:   { chip: 'bg-amber-50 text-amber-700',     row: 'bg-amber-50/50 border-amber-200',     amt: 'text-amber-900' },
    sky:     { chip: 'bg-sky-50 text-sky-700',         row: 'bg-sky-50/40 border-sky-100',         amt: 'text-ink-900' },
    navy:    { chip: 'bg-navy-50 text-navy-700',       row: 'bg-subtle border-border',             amt: 'text-ink-900' },
  }[tone] || { chip: 'bg-navy-50 text-navy-700', row: 'bg-subtle border-border', amt: 'text-ink-900' }
  const rows = Object.entries(byCur || {}).sort((a, b) => a[0].localeCompare(b[0]))
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-start gap-2.5">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', t.chip)}><Icon className="w-4 h-4" /></div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-900 leading-snug">{title}</h3>
          <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">{desc}</p>
        </div>
      </div>
      <div className="p-3">
        {loading ? (
          <div className="h-12 rounded-lg bg-subtle border border-border animate-pulse" />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center text-center py-4 px-2">
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center mb-2', t.chip)}><Icon className="w-4 h-4" /></div>
            <p className="text-[11px] text-ink-500">{emptyText}</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {rows.map(([cur, v]) => (
              <li key={cur} className={cn('flex items-center justify-between rounded-lg border px-3 py-2.5', t.row)}>
                <div className="min-w-0">
                  <div className={cn('text-[15px] font-bold tabular-nums leading-tight', t.amt)}>{fmtMoney(v.total, cur)}</div>
                  <div className="text-[11px] text-ink-500 mt-0.5">{v.count} {v.count === 1 ? 'collection' : 'collections'} · {cur}</div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 shrink-0">{cur}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

// Quick-access tile → an operational screen.
function QuickLink({ to, icon: Icon, label, desc }) {
  return (
    <Link to={to} className="group p-card p-lift rounded-2xl p-3.5 flex items-start gap-3">
      <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0 text-white transition-transform group-hover:scale-105" style={{ background: 'linear-gradient(135deg, #1E4180, #0A1B3D)' }}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold truncate" style={{ color: 'var(--p-ink-900)' }}>{label}</span>
        <span className="block text-[11px] truncate" style={{ color: 'var(--p-ink-500)' }}>{desc}</span>
      </span>
      <ChevronRight className="w-4 h-4 mt-1 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--p-ink-300)' }} />
    </Link>
  )
}

function SectionAccent({ label, color = 'var(--p-teal)' }) {
  return (
    <div className="flex items-center gap-2.5 mb-1">
      <span className="w-1 h-5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-600)' }}>{label}</span>
    </div>
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
