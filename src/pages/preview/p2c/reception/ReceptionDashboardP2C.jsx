import { useCallback, useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Building2, BedDouble, Inbox, Plus, Stethoscope, Scissors, Heart,
  Banknote, ShieldCheck, Clock, AlertTriangle, Gift, MapPin, ArrowRight,
  CheckCircle2, Wallet, Users, FileBarChart2, Hotel, RefreshCw,
} from 'lucide-react'
import { OperationalShell, IdentityHeader, receptionRoute } from '../../../../premium/OperationalShell'
import {
  SectionHead, DemoBanner, FacilityBadge, FinTypePill,
} from '../../../../premium/p2cPrimitives'
import { StatusPill, Avatar } from '../../../../premium/primitives'
import {
  useCasesForBranch, useIncomingTransfers, useRoomBoard, useCaseAggregates,
  useFindCase, useTreasuryFor, useVisaBankFor, useDemoState,
} from '../../../../context/DemoStateContext'
import { R1_TREATMENT_MODES, R1_TODAY_LABEL } from '../../../../data/p2cR1'
import { cn } from '../../../../lib/cn'
import { IS_SUPABASE } from '../../../../lib/api/config'
import { useLiveRooms } from '../../../../lib/useLiveRooms'

/* =========================================================================
 * P2C.R1 — Reception & Rooms Workspace Dashboard (Al-Kawther / Sheraton)
 * -----------------------------------------------------------------------
 * The branch dashboard now leads with the Room Board (1..15) and treats
 * KPIs around: rooms (total/occupied/available/waiting), treatment mode
 * (conservative/surgical/pending), financial type (insurance/cash/pending/free),
 * and a quick treasury snapshot. Quick actions appear inline.
 * ========================================================================= */

function branchConfig(slug) {
  if (slug === 'al-kawther') return { id: 'al_kawther', name: 'Al-Kawther Branch', role: 'reception_kawther' }
  return { id: 'sheraton', name: 'Sheraton Branch', role: 'reception_sheraton' }
}

export default function ReceptionDashboardP2C() {
  const { branchSlug } = useParams()
  const { id: branchId, name: branchName, role } = branchConfig(branchSlug)

  const all = useCasesForBranch(branchId)
  const mockBoard = useRoomBoard(branchId)
  const kpis = useCaseAggregates(branchId)
  const incomingUnreceived = useIncomingTransfers(branchId, { includeReceived: false })
  const treasury = useTreasuryFor(branchId)
  const visaBank = useVisaBankFor(branchId)
  const { actions } = useDemoState()

  // Live room board (supabase): occupancy derived from live cases (center_room_id)
  // over the branch's real rooms; mock board untouched for 5173.
  const { rooms: liveRooms, reloadRooms } = useLiveRooms(IS_SUPABASE ? branchId : null)
  const liveBoard = useMemo(() => {
    if (!IS_SUPABASE) return null
    const occByRoom = new Map()
    for (const x of all) { if (x.operationalStatus === 'Open' && x.centerRoomId) occByRoom.set(x.centerRoomId, x.id) }
    return liveRooms.map((r) => ({
      number: r.roomCode,
      label: r.roomName || `Room ${String(r.roomCode).padStart(2, '0')}`,
      caseId: occByRoom.get(r.id) || null,
      status: occByRoom.get(r.id) ? 'occupied' : 'available',
    }))
  }, [liveRooms, all])
  const board = IS_SUPABASE ? (liveBoard || []) : mockBoard

  // Room KPIs reflect the live board in supabase mode (mock aggregates otherwise).
  const occupiedCount = board.filter((r) => r.status === 'occupied').length
  const roomTotal = IS_SUPABASE ? board.length : kpis.total
  const roomOccupied = IS_SUPABASE ? occupiedCount : kpis.occupied
  const roomAvailable = IS_SUPABASE ? Math.max(0, board.length - occupiedCount) : kpis.available
  const roomWaiting = IS_SUPABASE
    ? all.filter((c) => c.operationalStatus === 'Open' && c.encounterPattern === 'inpatient_admission' && !c.centerRoomId).length
    : kpis.waiting

  // Phase 6 — light refresh + polling so a branch sees incoming transfers /
  // room changes without a full reload (no realtime subscriptions).
  const refreshAll = useCallback(async () => {
    if (!IS_SUPABASE) return
    try { await actions.refreshCases(); await reloadRooms() } catch { /* best-effort */ }
  }, [actions, reloadRooms])
  useEffect(() => {
    if (!IS_SUPABASE) return undefined
    const t = setInterval(() => { refreshAll() }, 25000)
    return () => clearInterval(t)
  }, [refreshAll])

  return (
    <OperationalShell role={role} active="dashboard"
      identityName={branchName} identitySub="Reception & Rooms Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-6">

        <DemoBanner>
          UI Concept — <strong>{branchName}</strong>. Rooms, financial type, billing facility and treatment mode are placeholders. No backend connected.
        </DemoBanner>

        <IdentityHeader
          icon={Building2}
          tone="gold"
          label={branchName}
          subtitle={`Reception & Rooms Workspace · ${R1_TODAY_LABEL}`}
          badges={
            <>
              {incomingUnreceived.length > 0 && (
                <StatusPill tone="amber" icon={Inbox}>{incomingUnreceived.length} incoming awaiting receipt</StatusPill>
              )}
              {kpis.waiting > 0 && (
                <StatusPill tone="pending" icon={Clock}>{kpis.waiting} waiting for room</StatusPill>
              )}
            </>
          }
          action={
            <Link to={receptionRoute(role, 'new-case')}
              className="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold p-btn-primary whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" /> New Direct Case
            </Link>
          }
        />

        {/* ── KPI strip ─────────────────────────────────────────────────── */}
        <section>
          <SectionHead eyebrow="Today's Activity" title="Branch Operational Snapshot" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <Kpi label="Total Rooms"        value={roomTotal}        icon={BedDouble} tone="navy" />
            <Kpi label="Occupied"           value={roomOccupied}     icon={Hotel}     tone="teal" />
            <Kpi label="Available"          value={roomAvailable}    icon={CheckCircle2} tone="cash" />
            <Kpi label="Waiting for Room"   value={roomWaiting}      icon={Clock}     tone={roomWaiting > 0 ? 'pending' : 'navy'} />
            <Kpi label="Conservative"       value={kpis.conservative} icon={Heart}     tone="teal" />
            <Kpi label="Surgical"           value={kpis.surgical}     icon={Scissors}  tone="mixed" />
            <Kpi label="Insurance"          value={kpis.insurance}    icon={ShieldCheck} tone="teal"  sub={`${kpis.hmc} HMC · ${kpis.smc} SMC`} />
            <Kpi label="Cash"               value={kpis.cash}         icon={Banknote}  tone="cash"  sub={`${kpis.pendingFin} pending · ${kpis.free} free`} />
          </div>
        </section>

        {/* ── Room Board 1..15 ──────────────────────────────────────────── */}
        <section>
          <SectionHead eyebrow="Treatment / Admission Rooms" title="Room Board"
            description="Live occupancy — a room stays lit until the patient is discharged."
            action={
              <div className="flex items-center gap-2">
                {IS_SUPABASE && (
                  <button onClick={refreshAll}
                    className="text-xs font-semibold inline-flex items-center gap-1 p-btn-ghost h-8 px-2.5 rounded-full no-print">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                )}
                <Link to={receptionRoute(role, 'rooms')}
                  className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--p-teal)' }}>
                  Open full board view <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            } />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {board.map((room) => (
              <RoomCard key={room.number} room={room} role={role}
                occupant={room.caseId ? all.find((x) => x.id === room.caseId) : null} />
            ))}
          </div>
        </section>

        {/* ── Quick actions + Mini-treasury ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="p-card p-5 lg:col-span-7 space-y-3">
            <SectionHead eyebrow="Quick Actions" title="Workspace" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ActionLink to={receptionRoute(role, 'new-case')} icon={Plus} label="Register Direct Case" sub="Walk-in patient at this branch" tone="gold" />
              <ActionLink to={receptionRoute(role, 'incoming-transfers')} icon={Inbox}
                label="Incoming Transfers"
                sub={incomingUnreceived.length > 0 ? `${incomingUnreceived.length} awaiting receipt` : 'No pending receipts'}
                tone={incomingUnreceived.length > 0 ? 'teal' : 'soft'} />
              <ActionLink to={receptionRoute(role, 'cases')} icon={Stethoscope} label="Branch Cases" sub="Direct + transferred-in cases" tone="soft" />
              <ActionLink to={receptionRoute(role, 'rooms')} icon={BedDouble} label="Room Board" sub="Detailed Rooms 1 – 15" tone="soft" />
              <ActionLink to={receptionRoute(role, 'treasury')} icon={Wallet} label="Treasury & Handover" sub="Cash, Visa/Bank EGP, handover periods" tone="soft" />
              <ActionLink to={receptionRoute(role, 'daily-report')} icon={FileBarChart2} label="Daily Report" sub="Today's full branch activity" tone="soft" />
            </div>
          </section>

          <section className="p-card p-5 lg:col-span-5 space-y-3">
            <SectionHead eyebrow="Treasury Snapshot" title="Branch Cash + Visa/Bank"
              action={
                <Link to={receptionRoute(role, 'treasury')}
                  className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--p-teal)' }}>
                  Open <ArrowRight className="w-3 h-3" />
                </Link>
              } />
            {treasury && (
              <div className="space-y-2">
                {['EGP', 'EUR', 'USD', 'GBP'].map((cur) => {
                  const b = treasury[cur]
                  if (!b) return null
                  const empty = b.cashInvoiceCollections === 0 && b.patientExcessCollections === 0 && b.handedOver === 0 && b.expenses === 0
                  if (empty) return null
                  return (
                    <div key={cur} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                      style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-8 h-8 rounded-md inline-flex items-center justify-center text-[10px] font-bold"
                          style={{ background: 'white', color: 'var(--p-brand-mid)', border: '1px solid var(--p-border)' }}>{cur}</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--p-ink-700)' }}>Cash · Net</span>
                      </span>
                      <span className="text-sm font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>
                        {fmt(b.net)} {cur}
                      </span>
                    </div>
                  )
                })}
                {visaBank && (
                  <div className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                    style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-8 h-8 rounded-md inline-flex items-center justify-center"
                        style={{ background: 'white', color: 'var(--p-brand-mid)', border: '1px solid var(--p-border)' }}>
                        <Banknote className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-brand-mid)' }}>Visa / Bank — EGP</div>
                        <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{visaBank.movementsCount} movements · {fmt(visaBank.pending)} pending</div>
                      </div>
                    </span>
                    <span className="text-sm font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>
                      {fmt(visaBank.totalMovements)} EGP
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

      </div>
    </OperationalShell>
  )
}

// =====================================================================
// Sub-components
// =====================================================================

function Kpi({ label, value, sub, icon: Icon, tone = 'navy' }) {
  const tones = {
    navy:    { bg: '#E9EFF8', fg: '#1E4180' },
    teal:    { bg: '#E0F8F6', fg: '#0A8F87' },
    cash:    { bg: '#E2F7EE', fg: '#0A8F62' },
    pending: { bg: '#FBF1DE', fg: '#A1672A' },
    mixed:   { bg: '#FBE6E5', fg: '#B14242' },
  }
  const t = tones[tone] || tones.navy
  return (
    <div className="p-card p-3 sm:p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.12em] font-bold truncate" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
          <div className="mt-1 text-xl sm:text-2xl font-bold p-numeric leading-none" style={{ color: 'var(--p-ink-900)' }}>{value}</div>
          {sub && <div className="mt-1 text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{sub}</div>}
        </div>
        {Icon && (
          <span className="w-7 h-7 rounded-md inline-flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.fg }}>
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  )
}

function ActionLink({ to, icon: Icon, label, sub, tone }) {
  const tones = {
    gold: { bg: 'linear-gradient(135deg, #D9A574 0%, #B8854D 100%)', color: 'white' },
    teal: { bg: 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)', color: 'white' },
    soft: { bg: 'white', color: 'var(--p-ink-900)' },
  }
  const t = tones[tone] || tones.soft
  return (
    <Link to={to} className="rounded-2xl p-3.5 flex items-center gap-3 transition-all hover:-translate-y-px"
      style={{ background: t.bg, color: t.color, border: tone === 'soft' ? '1px solid var(--p-border)' : '1px solid rgba(255,255,255,0.12)', boxShadow: tone === 'soft' ? 'var(--p-shadow-card)' : '0 6px 16px rgba(10,27,61,0.16)' }}>
      <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0"
        style={{ background: tone === 'soft' ? 'var(--p-teal-soft)' : 'rgba(255,255,255,0.16)', color: tone === 'soft' ? 'var(--p-teal)' : 'white' }}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold leading-tight">{label}</div>
        <div className="text-[11px] mt-0.5 leading-snug" style={{ color: tone === 'soft' ? 'var(--p-ink-500)' : 'rgba(255,255,255,0.85)' }}>{sub}</div>
      </div>
      <ArrowRight className="w-3.5 h-3.5 opacity-70" />
    </Link>
  )
}

function RoomCard({ room, role, occupant }) {
  if (room.status === 'available') {
    return (
      <div className="p-card p-3 flex flex-col gap-2"
        style={{ borderStyle: 'dashed', background: 'var(--p-surface-tint)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{room.label}</span>
          <StatusPill tone="cash">Available</StatusPill>
        </div>
        <div className="flex-1 flex items-center justify-center py-3 text-xs" style={{ color: 'var(--p-ink-400)' }}>
          Empty — ready to assign
        </div>
        <Link to={receptionRoute(role, 'incoming-transfers')}
          className="h-9 rounded-full text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 p-btn-ghost">
          <Plus className="w-3 h-3" /> Assign Patient
        </Link>
      </div>
    )
  }

  const c = occupant
  if (!c) {
    return (
      <div className="p-card p-3 text-[12px]" style={{ color: 'var(--p-ink-500)' }}>
        {room.label} — occupied (no demo case linked).
      </div>
    )
  }

  const mode = R1_TREATMENT_MODES.find((m) => m.code === c.treatmentMode)
  return (
    <Link to={receptionRoute(role, `cases/${c.id}`)}
      className="p-card p-3 flex flex-col gap-2 transition-all hover:-translate-y-px">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-700)' }}>{room.label}</span>
        <StatusPill tone={c.financialType === 'Cash' ? 'cash' : c.financialType === 'Insurance' ? 'teal' : c.financialType === 'Free / Complimentary' ? 'navy' : 'pending'}>
          {c.financialType === 'Free / Complimentary' ? 'Free' : c.financialType}
        </StatusPill>
      </div>

      <div className="flex items-center gap-2.5">
        <Avatar name={c.patient.name} size={32} tone="navy" />
        <div className="min-w-0">
          <div className="text-sm font-bold truncate" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
          <div className="text-[10px] truncate" style={{ color: 'var(--p-ink-500)' }}>
            From: {c.registeredAtName}
          </div>
        </div>
      </div>

      <div className="text-[11px] space-y-0.5" style={{ color: 'var(--p-ink-600)' }}>
        <div className="flex items-center gap-1">
          <Hotel className="w-3 h-3 opacity-70" />
          <span className="truncate">{c.patient.hotel}{c.patient.hotelRoom ? ` — ${c.patient.hotelRoom}` : ''}</span>
        </div>
        {c.billingFacility && (
          <div className="flex items-center gap-1.5">
            <FacilityBadge code={c.billingFacility} size="sm" />
            {c.insurance?.company && <span className="truncate">{c.insurance.company}</span>}
          </div>
        )}
        {mode && (
          <div className="flex items-center gap-1">
            {c.treatmentMode === 'surgical' ? <Scissors className="w-3 h-3" style={{ color: '#B14242' }} />
              : c.treatmentMode === 'conservative' ? <Heart className="w-3 h-3" style={{ color: '#0A8F87' }} />
              : <Clock className="w-3 h-3" style={{ color: '#A1672A' }} />}
            <span className="font-semibold" style={{ color: c.treatmentMode === 'surgical' ? '#B14242' : c.treatmentMode === 'conservative' ? '#0A8F87' : '#A1672A' }}>
              {mode.label}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}
