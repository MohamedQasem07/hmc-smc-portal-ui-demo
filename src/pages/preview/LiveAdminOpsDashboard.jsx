import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, ChevronLeft, ChevronRight, Building2, Hospital, Bed,
  FileText, Banknote, CreditCard, Wallet, ShieldAlert, Gift, Clock, Stethoscope,
  ArrowLeftRight, ArrowRight, ArrowUpRight, TrendingUp, Activity, AlertTriangle,
  DoorOpen, ClipboardList, Archive, Users, UserCheck, BookOpen, FileCheck2,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import { PremiumKpi, StatusPill, MeshCorner, Avatar } from '../../premium/primitives'
import { ReviewQueues } from '../../premium/ReviewQueues'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { fmtMoney, fmtRelative } from '../../lib/format'
import { cn } from '../../lib/cn'
import { useCases } from '../../context/DemoStateContext'
import { fetchCollections, summarizeCollectionsByPurpose, fetchLocations } from '../../lib/api/portalData'
import {
  computeAdminAnalytics, localDateKey, monthLabel, monthShort,
  addMonth, recentMonthKeys, daysInMonth, prettyCode,
} from '../../lib/adminAnalytics'

/* =========================================================================
 * LiveAdminOpsDashboard (P3E) — Admin Operations Analytics command center.
 * -----------------------------------------------------------------------
 * Supabase-mode admin home. Every figure is computed live from the RLS-scoped
 * case list (useCases) + the live location directory (fetchLocations) + read-
 * only collections (fetchCollections). NO mutations, NO mock numbers, NO fake
 * demo rows. With zero cases it renders the full structure with clean zeros.
 *
 * Counting rule (owner, binding):
 *   - External clinics: cases REGISTERED there = clinic activity; if sent on,
 *     they ALSO show as "transferred out".
 *   - Main branches (Al-Kawther / Sheraton): "direct" = registered AT the
 *     branch (this already excludes transfers-in, which were registered at the
 *     origin clinic). Transferred-in is a SEPARATE metric — never folded into
 *     the direct count.
 * All month math is done on 'YYYY-MM' string keys (see lib/adminAnalytics) to
 * avoid JS Date timezone / off-by-one surprises.
 * ========================================================================= */

export function LiveAdminOpsDashboard() {
  const cases = useCases()

  // Deterministic local "today" + current month key (no UTC parse → no off-by-one).
  const todayKey = useMemo(() => localDateKey(), [])
  const currentMonthKey = todayKey.slice(0, 7)
  const [monthKey, setMonthKey] = useState(currentMonthKey)

  // Location directory (all clinics + branches) so the grid renders at zero cases too.
  const [locations, setLocations] = useState([])
  const [locError, setLocError] = useState(null)
  useEffect(() => {
    let alive = true
    fetchLocations()
      .then((r) => { if (alive) setLocations(r || []) })
      .catch((e) => { if (alive) setLocError(e?.message || 'Could not load the clinic / branch list.') })
    return () => { alive = false }
  }, [])

  const a = useMemo(
    () => computeAdminAnalytics({ cases, locations, monthKey, todayKey }),
    [cases, locations, monthKey, todayKey],
  )

  // Month-scoped collections (READ-ONLY) for the financial snapshot teaser.
  const bounds = useMemo(() => ({
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(daysInMonth(monthKey)).padStart(2, '0')}`,
  }), [monthKey])
  const [collections, setCollections] = useState(null) // null = loading
  const [colError, setColError] = useState(null)
  useEffect(() => {
    let alive = true
    setCollections(null); setColError(null)
    fetchCollections({ from: bounds.from, to: bounds.to })
      .then((r) => { if (alive) setCollections(r || []) })
      .catch((e) => { if (alive) { setCollections([]); setColError(e?.message || 'Could not load collections.') } })
    return () => { alive = false }
  }, [bounds.from, bounds.to])
  const colLoading = collections === null
  const monthTreasury = useMemo(() => summarizeCollectionsByPurpose(collections || []), [collections])
  const todayTreasury = useMemo(() => {
    if (monthKey !== currentMonthKey) return summarizeCollectionsByPurpose([])
    return summarizeCollectionsByPurpose((collections || []).filter((c) => (c.collectedAt || '').slice(0, 10) === todayKey))
  }, [collections, monthKey, currentMonthKey, todayKey])

  const recentTransfers = useMemo(() =>
    cases
      .filter((c) => c.transfer && (c.visitDate || '').slice(0, 7) === monthKey)
      .sort((x, y) => ((y.transfer?.sentAt || y.visitDate || '') > (x.transfer?.sentAt || x.visitDate || '') ? 1 : -1))
      .slice(0, 6),
  [cases, monthKey])

  const monthName = monthLabel(monthKey)
  const isCurrent = monthKey === currentMonthKey

  return (
    <AdminShell active="dashboard">
      <div className="px-4 sm:px-6 lg:px-10 py-5 lg:py-7 space-y-6 max-w-[1600px] w-full mx-auto">

        {/* ===================== COMMAND CENTER HERO ===================== */}
        <section className="p-mesh p-grid-overlay relative overflow-hidden p-rise px-5 sm:px-7 lg:px-9 py-6 sm:py-7 lg:py-8"
          style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={320} color="#2DD4C7" opacity={0.24} />
          <MeshCorner position="bl" size={280} color="#1E4180" opacity={0.18} />
          <MeshCorner position="br" size={220} color="#D9A574" opacity={0.10} />
          <div className="relative z-10 space-y-5 lg:space-y-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(15,181,169,0.18)', border: '1px solid rgba(15,181,169,0.30)', color: '#7FE7DE' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#2DD4C7' }} /> Live
                  </span>
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="p-eyebrow mt-3" style={{ color: '#7FE7DE' }}>HMC · SMC — All Clinics &amp; Branches</div>
                <h1 className="p-display p-display-light text-[26px] sm:text-[32px] lg:text-[38px] mt-1.5 leading-tight">
                  Operations <span style={{ color: '#7FE7DE' }}>Command Center.</span>
                </h1>
                <p className="text-sm mt-2 max-w-xl" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  What every clinic and main branch did in <span className="font-semibold text-white">{monthName}</span> — cases, transfers and collections, computed live.
                </p>
              </div>
              <MonthSelector monthKey={monthKey} currentMonthKey={currentMonthKey} onChange={setMonthKey} />
            </div>

            {/* Hero KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <HeroMetric icon={FileText}      label="Cases this month" value={a.kpis.total}     accent="#7FE7DE" />
              <HeroMetric icon={Activity}      label={isCurrent ? 'Today' : 'Today (n/a)'} value={a.kpis.today} accent="#9EE6A6" />
              <HeroMetric icon={Stethoscope}   label="Open / Active"    value={a.kpis.open}      accent="#8FB7FF" />
              <HeroMetric icon={ShieldAlert}   label="Insurance"        value={a.kpis.insurance} accent="#7FE7DE" />
              <HeroMetric icon={Banknote}      label="Cash"             value={a.kpis.cash}      accent="#9EE6A6" />
              <HeroMetric icon={ArrowLeftRight} label="Transfers"       value={a.kpis.transfers} accent="#E8C68A" />
            </div>
          </div>
        </section>

        {/* error strips (non-blocking) */}
        {(locError || colError) && (
          <div className="rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-[12px]"
            style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="font-semibold">{locError || colError}</span>
          </div>
        )}

        {/* zero-month gentle note (structure stays fully rendered) */}
        {!a.hasCases && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-2.5 text-[12.5px]"
            style={{ background: 'var(--p-surface-tint)', border: '1px dashed var(--p-border-strong)', color: 'var(--p-ink-600)' }}>
            <Stethoscope className="w-4 h-4 shrink-0" style={{ color: 'var(--p-teal)' }} />
            <span>No cases recorded for <span className="font-semibold">{monthName}</span> yet — every panel below is ready and will fill in as clinics register patients.</span>
          </div>
        )}

        {/* ===================== REVIEW QUEUES (Pilot Supervision) ===================== */}
        <section className="space-y-2.5">
          <SectionAccent icon={ShieldAlert} label="Needs Review" color="#B14242"
            trailing="Incomplete or likely-wrong cases — click to correct" />
          <ReviewQueues cases={cases} />
        </section>

        {/* ===================== MONTHLY ACTIVITY CHART ===================== */}
        <section className="space-y-2.5">
          <SectionAccent icon={TrendingUp} label="Monthly Activity" />
          <MonthActivityCard analytics={a} monthName={monthName} />
        </section>

        {/* ===================== EXTERNAL CLINICS GRID ===================== */}
        <section className="space-y-2.5">
          <SectionAccent icon={Hospital} label="External Clinics" trailing={`${a.clinics.length} clinics`} />
          {a.clinics.length === 0 ? (
            <Card><EmptyState icon={Hospital} title="No clinics configured." message="External clinics appear here once added in Operational Config." /></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {a.clinics.map((c) => <ClinicPerfCard key={c.code} clinic={c} />)}
            </div>
          )}
        </section>

        {/* ===================== MAIN BRANCHES ===================== */}
        <section className="space-y-2.5">
          <SectionAccent icon={Building2} label="Main Branches" color="var(--p-gold)"
            trailing="Direct vs transferred-in counted separately" />
          {a.branches.length === 0 ? (
            <Card><EmptyState icon={Building2} title="No main branches configured." message="Al-Kawther and Sheraton appear here once configured." /></Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {a.branches.map((b) => <BranchCard key={b.code} branch={b} />)}
            </div>
          )}
        </section>

        {/* ===================== TRANSFERS FLOW ===================== */}
        <section className="space-y-2.5">
          <SectionAccent icon={ArrowLeftRight} label="Transfers Flow" color="#6F5DCE" />
          <TransfersFlowCard transfers={a.transfers} recentTransfers={recentTransfers} monthName={monthName} />
        </section>

        {/* ===================== FINANCIAL SNAPSHOT ===================== */}
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <SectionHeader title="Financial Snapshot" className="mb-0"
              description={`Read-only overview · ${monthName} · grouped by currency, no conversion · patient excess kept separate.`} />
            <Link to="/admin/collections" className="text-xs font-semibold inline-flex items-center gap-1 px-2.5 h-8 rounded-full text-ink-700 hover:text-ink-900 transition-colors whitespace-nowrap"
              style={{ border: '1px solid var(--p-border)', background: 'var(--p-surface-tint)' }}>
              Open Collections <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <MoneyCard title="Cash Collected" icon={Banknote} tone="emerald"
              monthBy={monthTreasury.channel.physical_cash} todayBy={todayTreasury.channel.physical_cash}
              loading={colLoading} showToday={isCurrent} desc="Physical cash · original currency" />
            <MoneyCard title="Visa / Bank" icon={CreditCard} tone="sky"
              monthBy={monthTreasury.channel.visa_bank} todayBy={todayTreasury.channel.visa_bank}
              loading={colLoading} showToday={isCurrent} desc="Card settlements · EGP" />
            <MoneyCard title="Insurance Excess" icon={Wallet} tone="amber"
              monthBy={monthTreasury.purpose.patient_excess} todayBy={todayTreasury.purpose.patient_excess}
              loading={colLoading} showToday={isCurrent} desc="Patient excess · treasury money, separate from cash revenue" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-subtle border border-border px-3 py-1 text-[11px] font-medium text-ink-500">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Each currency is shown separately — no cross-currency conversion or combined total. Treasury logic is unchanged.
          </div>
        </section>

        {/* ===================== QUICK ACTIONS ===================== */}
        <section>
          <SectionHeader title="Quick Actions" description="Jump to the operational screens." className="mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            <QuickLink to="/admin/p2c-cases"            icon={ClipboardList} label="All Cases"               desc="Clinic & reception" />
            <QuickLink to="/clinic/new-case"            icon={Stethoscope}   label="New Case"                desc="Clinic & Reception" />
            <QuickLink to="/admin/collections"          icon={Banknote}      label="Collections & Treasury"  desc="Treasury log" />
            <QuickLink to="/admin/reports/daily"        icon={FileText}      label="Daily Report"            desc="Collections by date" />
            <QuickLink to="/admin/users-staff"          icon={Users}         label="Users & Staff"           desc="Accounts & roles" />
            <QuickLink to="/admin/specialist-doctors"   icon={UserCheck}     label="Specialist Doctors"      desc="Directory" />
            <QuickLink to="/admin/specialist-visits"    icon={Activity}      label="Specialist Visits"       desc="Visits report" />
            <QuickLink to="/admin/reference-lists"      icon={BookOpen}      label="Operational Config"      desc="Services · rooms · insurers" />
          </div>
        </section>
      </div>
    </AdminShell>
  )
}

/* ====================================================================
 * Month selector — prev / select / next over 'YYYY-MM' keys (timezone-safe).
 * "Next" is disabled at the current month (no future months).
 * ==================================================================== */
function MonthSelector({ monthKey, currentMonthKey, onChange }) {
  const options = recentMonthKeys(currentMonthKey, 12) // newest first
  const atCurrent = monthKey >= currentMonthKey
  const atOldest = monthKey <= options[options.length - 1]
  return (
    <div className="flex items-center gap-1.5 rounded-full p-1 shrink-0"
      style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}>
      <button type="button" aria-label="Previous month" disabled={atOldest}
        onClick={() => onChange(addMonth(monthKey, -1))}
        className={cn('w-8 h-8 rounded-full inline-flex items-center justify-center transition-colors',
          atOldest ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/15')}
        style={{ color: 'white' }}>
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="relative inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }}>
        <Calendar className="w-3.5 h-3.5 text-white/70" />
        <span className="text-xs font-bold text-white whitespace-nowrap p-numeric">{monthLabel(monthKey)}</span>
        <select value={monthKey} onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Select month">
          {options.map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}
        </select>
      </div>
      <button type="button" aria-label="Next month" disabled={atCurrent}
        onClick={() => onChange(addMonth(monthKey, 1))}
        className={cn('w-8 h-8 rounded-full inline-flex items-center justify-center transition-colors',
          atCurrent ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/15')}
        style={{ color: 'white' }}>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function HeroMetric({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl px-3 py-3 min-w-0" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)' }}>
      <div className="flex items-center gap-1.5">
        <span className="w-6 h-6 rounded-md inline-flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.10)', color: accent }}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="text-[9.5px] uppercase tracking-[0.10em] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.62)' }}>{label}</span>
      </div>
      <div className="mt-1.5 text-2xl sm:text-[28px] font-bold p-numeric text-white leading-none">{value}</div>
    </div>
  )
}

/* ====================================================================
 * Monthly activity smooth area chart (pure SVG, responsive, zero-state aware).
 * ==================================================================== */
function MonthActivityCard({ analytics, monthName }) {
  const { daily, peakDay, kpis } = analytics
  return (
    <Card padding="none" className="overflow-hidden p-card-top">
      <div className="px-5 py-4 border-b border-border flex items-end justify-between gap-3 flex-wrap">
        <SectionHeader title={`Cases per day — ${monthName}`} className="mb-0"
          description="Smooth daily case volume across the month." />
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-[22px] font-bold text-ink-900 tabular-nums leading-none">{kpis.total}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold mt-1">Total</div>
          </div>
          <div className="text-right">
            <div className="text-[22px] font-bold text-ink-900 tabular-nums leading-none">{peakDay.count > 0 ? peakDay.count : '—'}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold mt-1">{peakDay.count > 0 ? `Peak (day ${peakDay.day})` : 'Peak'}</div>
          </div>
        </div>
      </div>
      <div className="px-2 sm:px-4 pt-4 pb-2">
        <SmoothAreaChart daily={daily} hasCases={analytics.hasCases} />
      </div>
    </Card>
  )
}

// Measure the container width so the SVG renders at real pixels (crisp text,
// uniform stroke) and never overflows horizontally.
function useElementWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setW(Math.round(el.getBoundingClientRect().width))
    measure()
    let ro
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(measure); ro.observe(el) }
    window.addEventListener('resize', measure)
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  return [ref, w]
}

function niceMax(maxC) {
  if (maxC <= 4) return 4
  const step = maxC <= 20 ? 5 : maxC <= 50 ? 10 : maxC <= 100 ? 20 : 50
  let m = Math.ceil(maxC / step) * step
  if (m % 4 !== 0) m = Math.ceil(m / 4) * 4
  return m
}

// Catmull-Rom → cubic-bezier smoothing.
function smoothPath(pts) {
  if (!pts.length) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

function SmoothAreaChart({ daily, hasCases }) {
  const [ref, w] = useElementWidth()
  const width = w || 720
  const compact = width < 480
  const height = compact ? 196 : 252
  const pad = { l: 30, r: 14, t: 16, b: 26 }
  const plotW = Math.max(10, width - pad.l - pad.r)
  const plotH = height - pad.t - pad.b
  const dim = daily.length || 30
  const maxC = Math.max(0, ...daily.map((d) => d.count))
  const yMax = niceMax(maxC)

  const xFor = (day) => pad.l + (dim <= 1 ? 0 : ((day - 1) / (dim - 1)) * plotW)
  const yFor = (count) => pad.t + plotH - (yMax === 0 ? 0 : (count / yMax) * plotH)
  const pts = daily.map((d) => ({ x: xFor(d.day), y: yFor(d.count), day: d.day, count: d.count }))
  const line = smoothPath(pts)
  const baseY = pad.t + plotH
  const area = pts.length > 1 ? `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${baseY} Z` : ''

  // grid + axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: Math.round(yMax * f), y: pad.t + plotH - f * plotH }))
  const nTicks = compact ? 5 : 8
  const xTickDays = []
  for (let i = 0; i < nTicks; i++) {
    const day = Math.round(1 + (i / (nTicks - 1)) * (dim - 1))
    if (!xTickDays.includes(day)) xTickDays.push(day)
  }
  const accent = '#0FB5A9'
  const gid = 'p3e-area-grad'

  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" role="img"
          aria-label="Daily case counts for the month">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* horizontal gridlines + y labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={pad.l} y1={t.y} x2={width - pad.r} y2={t.y} stroke="var(--p-border)" strokeWidth="1" />
              <text x={pad.l - 6} y={t.y + 3} textAnchor="end" fontSize="10" fill="var(--p-ink-400)">{t.v}</text>
            </g>
          ))}
          {/* x labels */}
          {xTickDays.map((day) => (
            <text key={day} x={xFor(day)} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--p-ink-400)">{day}</text>
          ))}

          {hasCases ? (
            <>
              {area && <path d={area} fill={`url(#${gid})`} />}
              <path d={line} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p) => (
                <g key={p.day}>
                  {p.count > 0 && <circle cx={p.x} cy={p.y} r="2.6" fill={accent} />}
                  {/* invisible wide hit target for native tooltip */}
                  <circle cx={p.x} cy={p.y} r="9" fill="transparent">
                    <title>{`Day ${p.day}: ${p.count} case${p.count === 1 ? '' : 's'}`}</title>
                  </circle>
                </g>
              ))}
            </>
          ) : (
            <>
              <line x1={pad.l} y1={baseY} x2={width - pad.r} y2={baseY} stroke={accent} strokeWidth="2" strokeOpacity="0.35" strokeDasharray="5 5" />
              <text x={pad.l + plotW / 2} y={pad.t + plotH / 2} textAnchor="middle" fontSize="13" fill="var(--p-ink-400)" fontWeight="600">
                No cases recorded this month yet.
              </text>
            </>
          )}
        </svg>
      )}
    </div>
  )
}

/* ====================================================================
 * External clinic performance card.
 * ==================================================================== */
function ClinicPerfCard({ clinic }) {
  const busy = clinic.casesMonth >= 10
  return (
    <Card padding="none" className="overflow-hidden p-card-top p-lift">
      <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border">
        <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg, #1E4180, #0A1B3D)' }}>
          <Hospital className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-ink-900 truncate">{clinic.name}</div>
          <div className="text-[11px] text-ink-400">External clinic</div>
        </div>
        {busy && <StatusPill tone="teal" dot>Active</StatusPill>}
      </div>
      <div className="px-4 py-3 flex items-end justify-between">
        <div>
          <div className="text-[34px] font-bold text-ink-900 tabular-nums leading-none">{clinic.casesMonth}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold mt-1">Cases this month</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-ink-700 tabular-nums leading-none">{clinic.casesToday}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold mt-1">Today</div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
        <MiniStat label="Insurance" value={clinic.insurance} tone="teal" />
        <MiniStat label="Cash" value={clinic.cash} tone="emerald" />
        <MiniStat label="Transf. out" value={clinic.transferredOut} tone="violet" />
      </div>
    </Card>
  )
}

/* ====================================================================
 * Main branch card — direct vs transferred-in shown as DISTINCT blocks.
 * ==================================================================== */
function BranchCard({ branch }) {
  return (
    <Card padding="none" className="overflow-hidden p-card-top">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-border">
        <span className="w-11 h-11 rounded-xl inline-flex items-center justify-center shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg, #9A6E36, #6E4B1F)' }}>
          <Building2 className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-ink-900 truncate">{branch.name}</div>
          <div className="text-[11px] text-ink-400">Main branch</div>
        </div>
        <StatusPill tone="gold" dot>Branch</StatusPill>
      </div>

      {/* the two counts, visually separated so they are never confused */}
      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <div className="rounded-xl px-4 py-3.5" style={{ background: '#E9EFF8', border: '1px solid #D4E0F2' }}>
          <div className="flex items-center gap-1.5">
            <DoorOpen className="w-3.5 h-3.5" style={{ color: '#1E4180' }} />
            <span className="text-[10px] uppercase tracking-[0.1em] font-bold" style={{ color: '#1E4180' }}>Direct cases</span>
          </div>
          <div className="text-[30px] font-bold tabular-nums leading-none mt-1.5" style={{ color: '#1E4180' }}>{branch.directMonth}</div>
          <div className="text-[11px] text-ink-500 mt-1">{branch.directToday} today · registered here</div>
        </div>
        <div className="rounded-xl px-4 py-3.5" style={{ background: 'var(--p-transfer-soft)', border: '1px solid #DAD2F5' }}>
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: '#5443A8' }} />
            <span className="text-[10px] uppercase tracking-[0.1em] font-bold" style={{ color: '#5443A8' }}>Transferred in</span>
          </div>
          <div className="text-[30px] font-bold tabular-nums leading-none mt-1.5" style={{ color: '#5443A8' }}>{branch.transferredInMonth}</div>
          <div className="text-[11px] text-ink-500 mt-1">{branch.transferredInReceived} received · counted separately</div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
        <MiniStat label="In rooms" value={branch.inRoom} tone="navy" />
        <MiniStat label="Direct ins." value={branch.directInsurance} tone="teal" />
        <MiniStat label="Direct cash" value={branch.directCash} tone="emerald" />
      </div>
    </Card>
  )
}

function MiniStat({ label, value, tone = 'navy' }) {
  const fg = {
    navy: '#1E4180', teal: '#0A8F87', emerald: '#0A8F62', violet: '#5443A8', amber: '#A1672A',
  }[tone] || '#1E4180'
  return (
    <div className="px-3 py-2.5 text-center min-w-0">
      <div className="text-lg font-bold tabular-nums leading-none" style={{ color: fg }}>{value}</div>
      <div className="text-[9.5px] uppercase tracking-[0.08em] text-ink-400 font-semibold mt-1 truncate">{label}</div>
    </div>
  )
}

/* ====================================================================
 * Transfers flow — total + by destination + origin→destination flows.
 * ==================================================================== */
function TransfersFlowCard({ transfers, recentTransfers, monthName }) {
  const empty = transfers.total === 0
  return (
    <Card padding="none" className="overflow-hidden p-card-top">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* left: total + by destination */}
        <div className="px-5 py-5">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold">Transfers · {monthName}</div>
          <div className="text-[40px] font-bold text-ink-900 tabular-nums leading-none mt-1">{transfers.total}</div>
          <div className="text-[11px] text-ink-500 mt-1">clinic → main branch movements</div>
          {transfers.byDestination.length > 0 && (
            <ul className="mt-4 space-y-2">
              {transfers.byDestination.map((d) => (
                <li key={d.code} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-700 min-w-0">
                    <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--p-gold)' }} />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="text-sm font-bold text-ink-900 tabular-nums shrink-0">{d.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* right: flows or empty */}
        <div className="px-5 py-5">
          <SectionHeader title="Flow by route" className="mb-3"
            description="From the registering clinic to the receiving main branch." />
          {empty ? (
            <EmptyState icon={ArrowLeftRight} title="No transfers this month." message="Clinic-to-branch movements will appear here as they happen." />
          ) : (
            <ul className="space-y-2">
              {transfers.flows.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                  style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                  <span className="text-[12px] font-semibold text-ink-800 truncate min-w-0 flex-1 text-right">{f.fromName}</span>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0" style={{ background: 'var(--p-transfer-soft)', color: '#5443A8' }}>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[12px] font-semibold text-ink-800 truncate min-w-0 flex-1">{f.toName}</span>
                  <span className="text-sm font-bold text-ink-900 tabular-nums shrink-0 ms-1">{f.count}</span>
                </li>
              ))}
            </ul>
          )}
          {recentTransfers.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold mb-2">Most recent</div>
              <ul className="space-y-1.5">
                {recentTransfers.slice(0, 4).map((c) => (
                  <li key={c.id} className="flex items-center gap-2.5">
                    <Avatar name={c.patient?.name || '—'} size={28} tone="navy" />
                    <span className="text-[12px] font-semibold text-ink-800 truncate flex-1 min-w-0">{c.patient?.name || '—'}</span>
                    <StatusPill tone={c.transfer?.receivedAt ? 'finalized' : 'transferred'}>
                      {c.transfer?.receivedAt ? 'Received' : 'Pending'}
                    </StatusPill>
                    <span className="text-[11px] text-ink-400 inline-flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />{fmtRelative(c.transfer?.sentAt || c.visitDate)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

/* ====================================================================
 * Financial snapshot money card — month rows + (optional) today subline.
 * Read-only; one row per currency; no FX, no combined total.
 * ==================================================================== */
function MoneyCard({ title, icon: Icon, desc, monthBy, todayBy, loading, showToday, tone = 'navy' }) {
  const t = {
    emerald: { chip: 'bg-emerald-50 text-emerald-700', amt: 'text-emerald-800' },
    amber:   { chip: 'bg-amber-50 text-amber-700',     amt: 'text-amber-900' },
    sky:     { chip: 'bg-sky-50 text-sky-700',         amt: 'text-ink-900' },
    navy:    { chip: 'bg-navy-50 text-navy-700',       amt: 'text-ink-900' },
  }[tone] || { chip: 'bg-navy-50 text-navy-700', amt: 'text-ink-900' }
  const monthRows = Object.entries(monthBy || {}).sort((a, b) => a[0].localeCompare(b[0]))
  const todayRows = Object.entries(todayBy || {}).sort((a, b) => a[0].localeCompare(b[0]))
  return (
    <Card padding="none" className="overflow-hidden p-card-top">
      <div className="px-4 py-3 border-b border-border flex items-start gap-2.5">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', t.chip)}><Icon className="w-4 h-4" /></div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-900 leading-snug">{title}</h3>
          <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">{desc}</p>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {loading ? (
          <div className="h-12 rounded-lg bg-subtle border border-border animate-pulse" />
        ) : monthRows.length === 0 ? (
          <div className="flex items-center justify-center text-center py-4">
            <p className="text-[11px] text-ink-400">No collections in this range.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {monthRows.map(([cur, v]) => (
              <li key={cur} className="flex items-center justify-between rounded-lg border border-border bg-subtle px-3 py-2">
                <div className="min-w-0">
                  <div className={cn('text-[15px] font-bold tabular-nums leading-tight', t.amt)}>{fmtMoney(v.total, cur)}</div>
                  <div className="text-[11px] text-ink-500 mt-0.5">{v.count} {v.count === 1 ? 'collection' : 'collections'} · this month</div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 shrink-0">{cur}</span>
              </li>
            ))}
          </ul>
        )}
        {showToday && !loading && (
          <div className="pt-1.5 border-t border-dashed border-border">
            <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold mb-1">Today</div>
            {todayRows.length === 0 ? (
              <div className="text-[11px] text-ink-400">— nothing yet today</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {todayRows.map(([cur, v]) => (
                  <span key={cur} className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-subtle border border-border text-ink-700">
                    {fmtMoney(v.total, cur)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

/* ==================================================================== */
function SectionAccent({ icon: Icon, label, color = 'var(--p-teal)', trailing }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-1 h-5 rounded-full shrink-0" style={{ background: color }} />
      {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color }} />}
      <span className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>{label}</span>
      {trailing && <span className="text-[11px] text-ink-400 font-medium ms-1 truncate">· {trailing}</span>}
    </div>
  )
}

function QuickLink({ to, icon: Icon, label, desc }) {
  return (
    <Link to={to} className="group p-card p-lift rounded-2xl p-3.5 flex items-start gap-3">
      <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0 text-white transition-transform group-hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #1E4180, #0A1B3D)' }}>
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

export default LiveAdminOpsDashboard
