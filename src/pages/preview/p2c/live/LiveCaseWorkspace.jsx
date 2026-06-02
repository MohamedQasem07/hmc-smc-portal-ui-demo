import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, AlertTriangle, Building2, Hotel, Phone, Mail, BedDouble, Clock,
  CheckCircle2, Pencil, X, Send, ShieldCheck, Gift, Banknote, DoorOpen,
  Activity, History, Trash2,
} from 'lucide-react'
import { SectionHead, FacilityBadge, FinTypePill, RoutePill, P2CTimeline } from '../../../../premium/p2cPrimitives'
import { StatusPill, Avatar } from '../../../../premium/primitives'
import { NeedsAttentionPanel } from '../../../../premium/CaseWarnings'
import { useCases, useFindCase, useDemoState } from '../../../../context/DemoStateContext'
import { useUserMode } from '../../../../context/UserModeContext'
import { useLiveRooms } from '../../../../lib/useLiveRooms'
import { fmtDate } from '../../../../lib/format'
import {
  assignRoom, dischargeCase,
  fetchCaseFinancials, fetchRoomStayHistory, adminDeleteCase,
} from '../../../../lib/api/portalData'
import { escalateIfAuthError, sbEnsureSession } from '../../../../lib/api/auth'
import { computeCaseWarnings, normalizeCaseFinancials, SECTION } from '../../../../lib/caseWarnings'
import LiveSpecialistVisits from './LiveSpecialistVisits'
import LiveCaseServices from './LiveCaseServices'
import ClinicNewCaseP2C from '../clinic/ClinicNewCaseP2C'

/* =========================================================================
 * LiveCaseWorkspace (Case Lifecycle Model) — supabase-mode only.
 * -----------------------------------------------------------------------
 * The active-case workspace that each case-detail page (clinic / reception /
 * admin) early-returns in supabase mode. Existing-schema only; the page
 * supplies the surrounding shell. Capabilities:
 *   - edit missing patient contact + case fields while the case is OPEN
 *   - room occupy / change (branch cases) — releases on discharge
 *   - End Visit / Discharge confirmation modal (saves check-out date+time,
 *     releases the room, closes the case; read-only afterwards)
 *   - specialist visits (existing doctor staff list)
 *   - Cash invoice vs collected warning + outstanding amount
 * Mutations call actions.refreshCases() so the room board + lists stay in sync.
 * ========================================================================= */

function nowLocalDatetime() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fmtAmt(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}
function sumByCurrency(cols, purpose) {
  const out = {}
  for (const c of cols) {
    if (c.collection_purpose !== purpose) continue
    const cur = c.invoice_currency || c.actual_currency || 'EGP'
    out[cur] = (out[cur] || 0) + (Number(c.foreign_amount_covered) || 0)
  }
  return out
}

export default function LiveCaseWorkspace({ caseId, backTo = '/', backLabel = 'Back' }) {
  const c = useFindCase(caseId)
  const cases = useCases()
  const { actions } = useDemoState()
  const { currentUser } = useUserMode()
  const isAdmin = currentUser?.role === 'admin'   // P3J — admin global operation
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)   // P3J — admin safe delete
  const [deleteText, setDeleteText] = useState('')
  const refresh = actions.refreshCases
  const isClosed = c?.operationalStatus === 'Closed'
  // P3K — admin may open the Full Case Editor even on a closed/cancelled case
  // (Admin Correction Mode). Normal users stay read-only after close.
  const canOpenEditor = !isClosed || isAdmin

  const { rooms, reloadRooms } = useLiveRooms(c?.currentLocationCode || null)

  const [fin, setFin] = useState(null)
  const [finError, setFinError] = useState(null)
  const loadFin = useCallback(async () => {
    if (!caseId) return
    // P3J — NEVER silently swallow a failed financial read. A dead/expired
    // session makes the RLS-scoped read return empty/401; surfacing it (and
    // escalating to re-login) prevents the "the saved amount vanished" illusion
    // — the data is safe in the DB, only the read failed.
    try { setFin(await fetchCaseFinancials(caseId)); setFinError(null) }
    catch (e) {
      setFin(null)
      const handled = await escalateIfAuthError(e)
      setFinError(handled
        ? 'Your session expired — sign in again to load live financials.'
        : 'Could not load the latest financial data. Refresh to retry.')
    }
  }, [caseId])
  useEffect(() => { loadFin() }, [loadFin, c?.operationalStatus])

  // P3H — room stay history (read-only) for the Case Detail timeline + history block.
  const [roomHistory, setRoomHistory] = useState([])
  useEffect(() => {
    let alive = true
    if (!caseId) { setRoomHistory([]); return }
    fetchRoomStayHistory(caseId).then((r) => { if (alive) setRoomHistory(r || []) }).catch(() => { if (alive) setRoomHistory([]) })
    return () => { alive = false }
  }, [caseId, c?.operationalStatus, c?.centerRoomId])

  // P3H — operational timeline events, time-ordered. Read-only (no mutation).
  const timeline = useMemo(() => {
    if (!c) return []
    const ev = []
    if (c.visitDate) ev.push({ at: c.visitDate, tone: 'navy', title: 'Registered & Checked In', detail: [c.registeredAtName, c.routeLabel].filter(Boolean).join(' · ') || null })
    if (c.transfer) {
      if (c.transfer.sentAt) ev.push({ at: c.transfer.sentAt, tone: 'transferred', title: `Transfer sent → ${c.transfer.toBranchName || '—'}`, detail: c.transfer.reason || null })
      if (c.transfer.receivedAt) ev.push({ at: c.transfer.receivedAt, tone: 'teal', title: `Transfer received at ${c.transfer.toBranchName || '—'}`, detail: null })
    }
    for (const r of roomHistory) {
      const rl = r.roomName || (r.roomCode ? `Room ${r.roomCode}` : 'Room')
      if (r.assignedAt) ev.push({ at: r.assignedAt, tone: 'navy', title: `Room assigned — ${rl}`, detail: r.releasedAt ? null : 'Currently occupying' })
      if (r.releasedAt) ev.push({ at: r.releasedAt, tone: 'finalized', title: `Room released — ${rl}`, detail: null })
    }
    for (const s of (c.sessions || [])) {
      const at = s.checkInAt || s.date
      if (at) ev.push({ at, tone: 'teal', title: `Specialist visit${s.specialistName ? ' — ' + s.specialistName : ''}`, detail: [s.specialty, s.source].filter(Boolean).join(' · ') || null })
    }
    for (const col of (fin?.collections || [])) {
      if (col.collected_at) ev.push({ at: col.collected_at, tone: 'cash', title: `Collection — ${fmtAmt(col.actual_collected_amount)} ${col.actual_currency || ''}`.trim(), detail: (col.collection_purpose || '').replace(/_/g, ' ') || null })
    }
    if (c.closedAt) ev.push({ at: c.closedAt, tone: 'finalized', title: 'Discharged / Visit ended', detail: 'Case closed · room released' })
    ev.sort((a, b) => new Date(a.at) - new Date(b.at))
    return ev.map((e, i) => ({ ...e, key: i, done: true }))
  }, [c, roomHistory, fin])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [okMsg, setOkMsg] = useState(null)

  const [editReg, setEditReg] = useState(false)   // P3G/P3K — Full Case Editor (single edit place)
  const [showDischarge, setShowDischarge] = useState(false)
  const [checkoutAt, setCheckoutAt] = useState(nowLocalDatetime())

  const occupiedRoomIds = useMemo(() => {
    const m = new Map()
    for (const x of cases) {
      if (x.operationalStatus === 'Open' && x.centerRoomId) m.set(x.centerRoomId, x.id)
    }
    return m
  }, [cases])

  const availableRooms = useMemo(
    () => rooms.filter((r) => !occupiedRoomIds.has(r.id) || occupiedRoomIds.get(r.id) === caseId),
    [rooms, occupiedRoomIds, caseId],
  )

  async function run(fn, okText) {
    setBusy(true); setError(null); setOkMsg(null)
    try {
      // P3J — verify the session is alive BEFORE writing. If the refresh token
      // is dead, escalate to re-login and DO NOT pretend the save succeeded.
      const s = await sbEnsureSession()
      if (!s.ok) { setError('Your session expired — please sign in again. Nothing was saved.'); return }
      await fn(); if (refresh) await refresh(); if (okText) setOkMsg(okText)
    } catch (e) {
      const handled = await escalateIfAuthError(e)
      setError(handled
        ? 'Your session expired — please sign in again. Nothing was saved.'
        : (e?.message || 'Action failed.'))
    } finally { setBusy(false) }
  }

  // P3K — inline "Edit details" / contact edit removed. The Full Case Editor
  // (setEditReg) is the single edit place; patient + case fields persist there
  // via updateCaseRegistration. Open it with a clean banner state.
  function openEditor() { setOkMsg(null); setError(null); setEditReg(true) }

  // Pilot Supervision — incompleteness / mistake warnings for this case. Same
  // pure rules as the list chips + admin queues; `fin` is the live financial read,
  // so the money rules (cash/excess outstanding) are exact here.
  const warnings = useMemo(
    () => computeCaseWarnings(c, normalizeCaseFinancials(fin)),
    [c, fin],
  )
  // Quick-action target for a Needs-Attention item: registration → open the Full
  // Case Editor; money / visit / transfer → smooth-scroll to that section.
  function gotoWarningSection(section) {
    if (section === SECTION.REGISTRATION) { openEditor(); return }
    const id = section === SECTION.FINANCIAL ? 'case-financial'
      : section === SECTION.TRANSFER ? 'case-transfer' : 'case-visit'
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function onAssignRoom(roomId) {
    if (!roomId) return
    await run(async () => { await assignRoom(c.id, roomId); await reloadRooms() }, 'Room updated.')
  }

  async function confirmDischarge() {
    const activeSessionIds = (c.sessions || []).filter((s) => s.status === 'active').map((s) => s.id)
    await run(async () => {
      await dischargeCase(c.id, { checkOutAt: new Date(checkoutAt).toISOString(), sessionIds: activeSessionIds })
      setShowDischarge(false)
      await reloadRooms()
    }, 'Patient discharged. Room released.')
  }

  // P3J — ADMIN SAFE DELETE: permanently remove a wrong/test case + all children
  // via the admin-only RPC, then return to the list. run() surfaces any error.
  async function confirmDelete() {
    await run(async () => {
      await adminDeleteCase(c.id)
      setShowDelete(false)
      navigate(backTo || '/admin-dashboard')
    }, 'Case deleted.')
  }

  // P3J — ADMIN receives an awaiting transfer IN PLACE (no bounce to the reception
  // screen). Calls the admin-aware portal_receive_transfer RPC; origin is preserved.
  async function confirmReceive() {
    await run(async () => {
      await actions.receiveTransfer(c.id)
    }, `Received as ${c?.transfer?.toBranchName || 'destination branch'}.`)
  }

  // P3K — invoice amount + collections are recorded from the Full Case Editor
  // (the single money place), not from this summary card. The functions live in
  // ClinicNewCaseP2C edit mode (upsertCashInvoiceCharge / recordCaseCollections).

  // ---- loading / not-found ----
  if (!c) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-10 pb-12 max-w-2xl mx-auto text-center">
        <div className="p-card p-8 space-y-3">
          {cases.length === 0 ? (
            <>
              <Clock className="w-8 h-8 mx-auto" style={{ color: 'var(--p-ink-400)' }} />
              <div className="text-sm font-semibold">Loading case…</div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-8 h-8 mx-auto" style={{ color: '#A1672A' }} />
              <div className="text-sm font-semibold">Case not found or not visible to your account.</div>
            </>
          )}
          <Link to={backTo} className="text-xs font-semibold" style={{ color: 'var(--p-teal)' }}>← {backLabel}</Link>
        </div>
      </div>
    )
  }

  // P3G — Full registration edit mode (OPEN cases only). Renders the original
  // multi-section registration form embedded inside this role's shell, pre-loaded
  // with the case's data. Updates the SAME case + patient in place. Closed cases
  // never reach here (the button is hidden once discharged).
  if (editReg && canOpenEditor) {
    // P3K — Full Case Editor (single edit place). Hand the stored cash invoice so
    // Step-3 Financial prefills real values. adminCorrection shows the closed-case
    // correction banner when an admin edits a closed case.
    const editCaseWithInvoice = {
      ...c,
      cashInvoice: fin?.cashOutstanding
        ? { amount: fin.cashOutstanding.invoice, currency: fin.cashOutstanding.currency }
        : null,
    }
    return (
      <ClinicNewCaseP2C embedded editCase={editCaseWithInvoice} adminCorrection={isClosed && isAdmin}
        onDone={async () => { setEditReg(false); if (refresh) await refresh(); await loadFin(); setOkMsg('Case updated.') }} />
    )
  }

  const roomLabel = c.centerRoomName || (c.centerRoomNumber ? `Room ${c.centerRoomNumber}` : null)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-5">

      <div className="flex items-center justify-between gap-3">
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--p-teal)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> {backLabel}
        </Link>
        <StatusPill tone="cash" dot>Live · portal</StatusPill>
      </div>

      {/* Feedback */}
      {error && (
        <div className="rounded-xl px-3 py-2 flex items-start gap-2 text-[12px]"
          style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="font-semibold">{error}</span>
        </div>
      )}
      {okMsg && (
        <div className="rounded-xl px-3 py-2 flex items-start gap-2 text-[12px]"
          style={{ background: 'var(--p-finalized-soft)', color: '#076D4A', border: '1px solid #9FD4BB' }}>
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="font-semibold">{okMsg}</span>
        </div>
      )}

      {/* Pilot Supervision — Needs Attention (incomplete / likely-wrong fields).
          Renders only when something needs review; each item links to the fix. */}
      <NeedsAttentionPanel warnings={warnings} onAction={(section) => gotoWarningSection(section)} busy={busy} />

      {/* ===== Premium identity hero ===== */}
      <section className="p-mesh p-grid-overlay relative overflow-hidden p-rise px-5 sm:px-7 py-5 sm:py-6" style={{ borderRadius: 'var(--p-radius-hero)' }}>
        <div className="relative z-10">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar name={c.patient.name} size={54} tone="teal" />
            <div className="flex-1 min-w-0">
              <h1 className="p-display p-display-light text-[22px] sm:text-[28px] leading-tight">{c.patient.name}</h1>
              <div className="text-[12px] font-mono mt-1" style={{ color: 'rgba(255,255,255,0.62)' }}>{c.ourRef}</div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <FinTypePill type={c.financialType} />
                <RoutePill route={c.route} routeLabel={c.routeLabel} />
                {c.billingFacility && <FacilityBadge code={c.billingFacility} size="md" />}
                {roomLabel && <StatusPill tone="navy" icon={BedDouble}>{roomLabel}</StatusPill>}
                <StatusPill tone={isClosed ? 'finalized' : 'open'} dot>{c.operationalStatus}</StatusPill>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-2 shrink-0 w-full sm:w-auto">
              {canOpenEditor && (
                <button onClick={openEditor}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold p-btn-primary">
                  <Pencil className="w-3.5 h-3.5" /> Open Full Case Editor
                </button>
              )}
              {isClosed && isAdmin && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                  style={{ background: 'rgba(177,66,66,0.20)', color: '#FFD9D9', border: '1px solid rgba(240,181,181,0.5)' }}>
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin Correction Mode
                </span>
              )}
              {isClosed && !isAdmin && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                  style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.20)' }}>
                  Closed — contact admin for corrections.
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <HeroInfo icon={Building2} label="Location" value={c.registeredAtName} />
            <HeroInfo icon={Hotel} label="Hotel" value={[c.patient.hotel, c.patient.hotelRoom ? `Rm ${c.patient.hotelRoom}` : ''].filter(Boolean).join(' · ')} />
            <HeroInfo icon={Phone} label="Phone" value={[c.patient.phoneCode, c.patient.phone].filter(Boolean).join(' ')} />
            <HeroInfo icon={Mail} label="Email" value={c.patient.email} />
          </div>
          {canOpenEditor && (!c.patient.phone || !c.patient.email) && (
            <button onClick={openEditor} className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#7FE7DE' }}>
              <Pencil className="w-3 h-3" /> Add missing contact details
            </button>
          )}
        </div>
      </section>

      {/* P3K — inline "Edit details" panel removed; the Full Case Editor handles
          patient + case + financial edits in one place. */}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT — encounter / room / specialists */}
        <div className="xl:col-span-7 space-y-5">

          {/* Visit / discharge */}
          <section id="case-visit" className="p-card p-5 space-y-4 scroll-mt-4">
            <SectionHead eyebrow="Encounter" title="Visit & Discharge"
              description="Check-in, room, and discharge for this case." />
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Stat label="Check-In" value={c.visitDate ? fmtDate(c.visitDate, { withTime: !!c.visitTime }) : '—'} />
                <Stat label="Discharge / Check-Out" value={c.closedAt ? fmtDate(c.closedAt, { withTime: true }) : 'Active'} tone={isClosed ? 'cash' : 'pending'} />
                <Stat label="Room" value={roomLabel || '—'} />
              </div>
              {!isClosed ? (
                <button onClick={() => { setCheckoutAt(nowLocalDatetime()); setShowDischarge(true) }}
                  className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full text-sm font-bold p-btn-primary">
                  <CheckCircle2 className="w-4 h-4" /> End Visit / Discharge
                </button>
              ) : (
                <div className="rounded-xl px-3 py-2 text-[12px] flex items-center gap-2"
                  style={{ background: 'var(--p-finalized-soft)', color: '#076D4A', border: '1px solid #9FD4BB' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Discharged {c.closedAt ? `on ${fmtDate(c.closedAt, { withTime: true })}` : ''}. Room released. Case is read-only.
                </div>
              )}
            </div>

            {/* Room control (branch cases only) */}
            {rooms.length > 0 && !isClosed && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>
                  <DoorOpen className="w-3.5 h-3.5" /> Center Room
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-sm" style={{ color: 'var(--p-ink-700)' }}>
                    Current: <strong>{roomLabel || 'Not assigned'}</strong>
                  </div>
                  <select className="p-input h-10 max-w-[220px]" value="" disabled={busy}
                    onChange={(e) => onAssignRoom(e.target.value)}>
                    <option value="">{c.centerRoomId ? 'Change room…' : 'Assign room…'}</option>
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.roomName || `Room ${r.roomCode}`}{r.id === c.centerRoomId ? ' (current)' : ''}</option>
                    ))}
                  </select>
                  {availableRooms.length === 0 && (
                    <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>No free rooms right now.</span>
                  )}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
                  The room stays occupied on the board until this case is discharged.
                </div>
              </div>
            )}
          </section>

          {/* P3H — Operational timeline + room stay history */}
          <section className="p-card p-card-top p-5 space-y-4">
            <SectionHead icon={Activity} eyebrow="Operational" title="Case Timeline"
              description="Every operational event for this case, in order." />
            {timeline.length === 0 ? (
              <div className="rounded-xl px-3 py-6 text-center text-sm" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-400)', border: '1px dashed var(--p-border-strong)' }}>
                No events recorded yet.
              </div>
            ) : (
              <P2CTimeline steps={timeline} />
            )}

            {roomHistory.length > 0 && (
              <div className="rounded-2xl p-4 space-y-2.5" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>
                  <History className="w-3.5 h-3.5" /> Room Stay History
                </div>
                <ul className="space-y-2">
                  {roomHistory.map((r) => {
                    const occupied = r.status === 'occupied' || !r.releasedAt
                    return (
                      <li key={r.id} className="rounded-xl px-3 py-2.5 flex items-center gap-x-4 gap-y-1 flex-wrap" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>
                          <BedDouble className="w-3.5 h-3.5" style={{ color: 'var(--p-brand-mid)' }} />
                          {r.roomName || (r.roomCode ? `Room ${r.roomCode}` : 'Room')}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
                          In: <strong style={{ color: 'var(--p-ink-800)' }}>{r.assignedAt ? fmtDate(r.assignedAt, { withTime: true }) : '—'}</strong>
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
                          Out: <strong style={{ color: 'var(--p-ink-800)' }}>{r.releasedAt ? fmtDate(r.releasedAt, { withTime: true }) : '—'}</strong>
                        </span>
                        <span className="ms-auto"><StatusPill tone={occupied ? 'open' : 'finalized'} dot>{occupied ? 'Occupied' : 'Released'}</StatusPill></span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </section>

          {/* Specialist visits (existing doctor staff list) */}
          <LiveSpecialistVisits caseId={c.id} sessions={c.sessions} onChanged={async () => { if (refresh) await refresh() }}
            readOnly={isClosed} locationCode={c.currentLocationCode} />

          {/* Services / checklist (Bundle 1 Phase B) */}
          <LiveCaseServices caseId={c.id} readOnly={isClosed} />

          {/* Transfer info */}
          {c.transfer && (
            <section id="case-transfer" className="p-card p-5 scroll-mt-4">
              <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--p-transfer-soft)', border: '1px solid #D7CFF2' }}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#5443A8' }}>
                  <Send className="w-3.5 h-3.5" /> Transfer
                </div>
                <div className="text-sm" style={{ color: 'var(--p-ink-800)' }}>
                  {c.transfer.fromName ? <><strong>{c.transfer.fromName}</strong> → </> : null}
                  <strong>{c.transfer.toBranchName || '—'}</strong> · {c.transfer.status}
                </div>
                {c.transfer.reason && <div className="text-[12px]" style={{ color: 'var(--p-ink-700)' }}>Reason: {c.transfer.reason}</div>}
                <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
                  Sent: {fmtDate(c.transfer.sentAt, { withTime: true })}
                  {c.transfer.receivedAt && <> · Received: {fmtDate(c.transfer.receivedAt, { withTime: true })}</>}
                </div>
                {/* P3J — ADMIN GLOBAL OPERATION: receive an incoming transfer on behalf of the
                    destination branch IN PLACE (when no branch receptionist is available). The
                    portal_receive_transfer RPC is admin-aware; origin location is preserved. */}
                {isAdmin && !c.transfer.receivedAt && c.transfer.toBranchId && (
                  <button onClick={confirmReceive} disabled={busy}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold p-btn-primary mt-1.5">
                    <DoorOpen className="w-3.5 h-3.5" /> {busy ? 'Receiving…' : `Receive as ${c.transfer.toBranchName || 'destination branch'}`}
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT — financial (surfaced first on mobile: the figure cashier needs at a glance) */}
        <div className="xl:col-span-5 space-y-5 order-first xl:order-none">
          <section id="case-financial" className="p-card p-5 space-y-4 scroll-mt-4">
            <SectionHead eyebrow="Financial" title="Collection Summary"
              description="Read-only summary. Invoice, collections and excess are edited in the Full Case Editor." />
            <FinancialPanel c={c} fin={fin} finError={finError} />
            {canOpenEditor ? (
              <button onClick={openEditor}
                className="w-full h-11 rounded-full text-sm font-bold p-btn-primary inline-flex items-center justify-center gap-2">
                <Pencil className="w-4 h-4" /> Open Full Case Editor
              </button>
            ) : (
              <p className="text-[11px] text-center" style={{ color: 'var(--p-ink-500)' }}>
                Closed — contact admin to edit invoice / collections.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* P3J — ADMIN DANGER ZONE: safe delete of a wrong/test case (admin-only). */}
      {isAdmin && (
        <section className="p-card p-5 space-y-3" style={{ border: '1px solid #F0B5B5', background: 'var(--p-mixed-soft)' }}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#B14242' }}>
            <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone — Admin
          </div>
          <p className="text-[12px]" style={{ color: 'var(--p-ink-700)' }}>
            Permanently delete this case and <strong>all</strong> its operational records — collections, treasury movements,
            charges, encounters, room assignments, transfers, insurance intakes. The patient is removed only if they have
            no other case. This cannot be undone.
          </p>
          <button onClick={() => { setDeleteText(''); setOkMsg(null); setError(null); setShowDelete(true) }}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold" style={{ background: '#B14242', color: 'white' }}>
            <Trash2 className="w-3.5 h-3.5" /> Delete Case
          </button>
        </section>
      )}

      {/* Discharge confirmation modal */}
      {showDischarge && (
        <DischargeModal c={c} fin={fin} roomLabel={roomLabel} checkoutAt={checkoutAt} setCheckoutAt={setCheckoutAt}
          busy={busy} onCancel={() => setShowDischarge(false)} onConfirm={confirmDischarge} />
      )}

      {/* P3J — admin delete confirmation (type DELETE) */}
      {showDelete && (
        <DeleteCaseModal c={c} busy={busy} deleteText={deleteText} setDeleteText={setDeleteText}
          onCancel={() => setShowDelete(false)} onConfirm={confirmDelete} />
      )}
    </div>
  )
}

// =====================================================================
function FinancialPanel({ c, fin, finError }) {
  // P3J — honest read-failure banner. When the financial read failed (commonly a
  // dead/expired session), say so instead of rendering a misleading blank panel.
  const finErrorBanner = finError ? (
    <div className="rounded-xl px-3 py-2 mb-3 flex items-start gap-2 text-[12px]"
      style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="font-semibold">{finError}</span>
    </div>
  ) : null
  if (c.financialType === 'Free / Complimentary') {
    return (
      <div className="rounded-xl p-4" style={{ background: 'var(--p-gold-soft)', border: '1px solid #F1E2C9' }}>
        <div className="text-xs font-bold uppercase tracking-[0.12em] mb-1" style={{ color: '#7A4F1F' }}>
          <Gift className="inline w-3.5 h-3.5 mr-1" /> Free / Complimentary
        </div>
        <div className="text-sm" style={{ color: 'var(--p-ink-800)' }}>{c.freeReason || '—'}</div>
        {c.freeApprovedBy && (
          <div className="text-[11px] mt-1" style={{ color: 'var(--p-ink-500)' }}>
            Approved by: <strong>{c.freeApprovedBy}</strong>{c.freeApprovedAt ? ` · ${fmtDate(c.freeApprovedAt, { withTime: true })}` : ''}
          </div>
        )}
      </div>
    )
  }

  if (c.financialType === 'Insurance') {
    const excess = sumByCurrency(fin?.collections || [], 'patient_excess')
    const entries = Object.entries(excess)
    return (
      <div className="space-y-3">
        {finErrorBanner}
        <div className="rounded-xl p-3" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-brand-mid)' }}>
            <ShieldCheck className="w-3.5 h-3.5" /> Insurance
          </div>
          <div className="text-sm mt-1 flex items-center gap-2 flex-wrap" style={{ color: 'var(--p-ink-800)' }}>
            {c.insurance?.company || '—'}
            {c.billingFacility && <FacilityBadge code={c.billingFacility} size="sm" />}
          </div>
          {c.insurance?.ref && <div className="text-[11px] mt-1 font-mono" style={{ color: 'var(--p-ink-500)' }}>Ref: {c.insurance.ref}</div>}
        </div>
        <div className="rounded-xl p-3" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
          <div className="text-xs font-bold uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--p-ink-700)' }}>Patient Excess</div>
          {entries.length === 0 ? (
            <div className="text-[12px]" style={{ color: 'var(--p-ink-400)' }}>No patient-excess collected (separate from cash revenue).</div>
          ) : (
            <ul className="text-[12px] space-y-1">
              {entries.map(([cur, val]) => (
                <li key={cur} className="flex justify-between"><span style={{ color: 'var(--p-ink-600)' }}>Excess collected</span><span className="font-bold p-numeric">{fmtAmt(val)} {cur}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  if (c.financialType === 'Cash') {
    const out = fin?.cashOutstanding
    const cross = !!out?.crossCurrency
    const remaining = out ? out.remaining : null
    const under = !cross && remaining !== null && remaining > 0.005
    const over = !cross && remaining !== null && remaining < -0.005
    const collectedEntries = out ? Object.entries(out.collectedByCurrency || {}) : []
    const cashRows = (fin?.collections || []).filter((x) => x.collection_purpose === 'cash_case_payment')
    const nameFor = (uid) => (fin?.collectorNames && fin.collectorNames[uid]) || null
    return (
      <div className="space-y-3">
        {finErrorBanner}
        <div className="rounded-xl p-3 space-y-2" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
          <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>
            <Banknote className="inline w-3.5 h-3.5 mr-1" /> Cash Invoice
          </div>
          {out ? (
            <div className="text-[13px] space-y-1">
              <div className="flex justify-between"><span style={{ color: 'var(--p-ink-600)' }}>Invoice</span><span className="font-bold p-numeric">{fmtAmt(out.invoice)} {out.currency}</span></div>
              <div className="flex justify-between items-start gap-3">
                <span style={{ color: 'var(--p-ink-600)' }}>Collected</span>
                <span className="text-right">
                  {!out.hasAnyCollection
                    ? <span className="font-bold p-numeric">{fmtAmt(0)} {out.currency}</span>
                    : cross
                      ? collectedEntries.map(([cur, val]) => <div key={cur} className="font-bold p-numeric">{fmtAmt(val)} {cur}</div>)
                      : <span className="font-bold p-numeric">{fmtAmt(out.collected)} {out.currency}</span>}
                </span>
              </div>
              {!cross && (
                <div className="flex justify-between"><span style={{ color: 'var(--p-ink-600)' }}>Outstanding</span>
                  <span className="font-bold p-numeric" style={{ color: under ? '#B14242' : '#0A8F62' }}>{fmtAmt(out.remaining)} {out.currency}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[12px]" style={{ color: 'var(--p-ink-500)' }}>No cash invoice recorded yet — open the Full Case Editor to add it.</div>
          )}
        </div>

        {/* Recorded payments — read from the SAME case-linked collections as Treasury / Timeline. */}
        {cashRows.length > 0 && (
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Recorded payments</div>
            {cashRows.map((x, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-[12px]">
                <span style={{ color: 'var(--p-ink-600)' }}>
                  {(x.payment_method || 'cash').replace(/_/g, ' ')}
                  {x.collected_at ? ` · ${fmtDate(x.collected_at, { withTime: true })}` : ''}
                  {nameFor(x.collected_by) ? ` · ${nameFor(x.collected_by)}` : ''}
                </span>
                <span className="font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>
                  {fmtAmt(Number(x.foreign_amount_covered) || 0)} {x.invoice_currency || ''}
                  {x.actual_currency && x.actual_currency !== x.invoice_currency
                    ? <span className="font-normal" style={{ color: 'var(--p-ink-500)' }}> → {fmtAmt(Number(x.actual_collected_amount ?? x.foreign_amount_covered) || 0)} {x.actual_currency}</span>
                    : null}
                </span>
              </div>
            ))}
          </div>
        )}

        {cross && (
          <div className="rounded-xl px-3 py-2 text-[12px] flex items-start gap-2"
            style={{ background: 'var(--p-pending-soft)', color: '#A1672A', border: '1px solid #F0C97A' }}>
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span><strong>Collection exists in {out.otherCurrencies.join(', ')}; invoice is {out.currency}.</strong> Outstanding can't be auto-calculated across currencies without an FX rate — verify the FX / method.</span>
          </div>
        )}
        {under && (
          <div className="rounded-xl px-3 py-2 text-[12px] flex items-start gap-2"
            style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="font-semibold">There is {fmtAmt(remaining)} {out.currency} remaining uncollected (outstanding).</span>
          </div>
        )}
        {over && (
          <div className="rounded-xl px-3 py-2 text-[12px] flex items-start gap-2"
            style={{ background: 'var(--p-pending-soft)', color: '#A1672A', border: '1px solid #F0C97A' }}>
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="font-semibold">Collected exceeds the invoice by {fmtAmt(Math.abs(remaining))} {out.currency}. Check the amounts.</span>
          </div>
        )}
        {!out && (
          <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
            Enter the cash invoice amount to track collection vs outstanding.
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl px-3 py-3 text-[12px] flex items-start gap-2"
      style={{ background: 'var(--p-pending-soft)', color: '#A1672A', border: '1px solid #F0C97A' }}>
      <Clock className="w-3.5 h-3.5 mt-0.5" />
      <span>Financial classification still <strong>Pending</strong>. Confirm it at the receiving branch (if transferred) or by admin.</span>
    </div>
  )
}

// P3K — CashCollectionForm removed. Money (cash invoice + collections + excess)
// is recorded ONLY from the Full Case Editor (ClinicNewCaseP2C edit mode), never
// from this summary card — one editing place, no duplicate workflow.

function DischargeModal({ c, fin, roomLabel, checkoutAt, setCheckoutAt, busy, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,27,61,0.45)' }}>
      <div className="p-card p-5 w-full max-w-md space-y-4" style={{ background: 'white' }}>
        <div className="flex items-center gap-2 text-base font-bold" style={{ color: 'var(--p-ink-900)' }}>
          <CheckCircle2 className="w-5 h-5" style={{ color: '#0A8F62' }} /> Confirm Discharge / End Visit
        </div>
        <div className="rounded-xl p-3 space-y-1.5 text-[13px]" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
          <Row label="Patient" value={c.patient.name} />
          <Row label="Reference" value={c.ourRef} mono />
          <Row label="Current room" value={roomLabel || 'Not assigned'} />
          <Row label="Check-in" value={c.visitDate ? fmtDate(c.visitDate, { withTime: !!c.visitTime }) : '—'} />
        </div>
        <Field label="Discharge / check-out date & time">
          <input type="datetime-local" className="p-input" value={checkoutAt} onChange={(e) => setCheckoutAt(e.target.value)} />
        </Field>
        <div className="text-[12px]" style={{ color: 'var(--p-ink-600)' }}>
          On confirm: the check-out time is saved, the room is released back to the board, and the case is closed (read-only). Full history is kept.
        </div>
        {fin?.cashOutstanding && fin.cashOutstanding.remaining > 0.005 && (
          <div className="rounded-xl px-3 py-2 text-[12px]" style={{ background: 'var(--p-pending-soft)', color: '#A1672A', border: '1px solid #F0C97A' }}>
            <strong>Heads up:</strong> {fin.cashOutstanding.remaining.toFixed(2)} {fin.cashOutstanding.currency} is still outstanding on the cash invoice. Discharge still proceeds.
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={busy}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold p-btn-ghost">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-sm font-bold p-btn-primary">
            <CheckCircle2 className="w-4 h-4" /> {busy ? 'Discharging…' : 'Confirm discharge'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteCaseModal({ c, busy, deleteText, setDeleteText, onCancel, onConfirm }) {
  const armed = deleteText === 'DELETE'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,27,61,0.45)' }}>
      <div className="p-card p-5 w-full max-w-md space-y-4" style={{ background: 'white' }}>
        <div className="flex items-center gap-2 text-base font-bold" style={{ color: '#B14242' }}>
          <AlertTriangle className="w-5 h-5" /> Delete Case — permanent
        </div>
        <div className="rounded-xl p-3 space-y-1.5 text-[13px]" style={{ background: 'var(--p-mixed-soft)', border: '1px solid #F0B5B5' }}>
          <Row label="Patient" value={c.patient.name} />
          <Row label="Reference" value={c.ourRef} mono />
          <Row label="Location" value={c.registeredAtName} />
        </div>
        <p className="text-[12px]" style={{ color: 'var(--p-ink-700)' }}>
          This permanently deletes the case and <strong>all</strong> linked records — including any <strong>collections and
          treasury movements</strong> (cash trail). The patient is deleted only if they have no other case.{' '}
          <strong>This cannot be undone.</strong>
        </p>
        <Field label="Type DELETE to confirm">
          <input className="p-input" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="DELETE" autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={busy}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold p-btn-ghost">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button onClick={onConfirm} disabled={busy || !armed}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-sm font-bold"
            style={{ background: armed ? '#B14242' : '#E3A9A9', color: 'white', opacity: (busy || !armed) ? 0.6 : 1, cursor: (busy || !armed) ? 'not-allowed' : 'pointer' }}>
            <Trash2 className="w-4 h-4" /> {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] uppercase tracking-[0.1em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</span>
      <span className={`text-sm font-semibold ${mono ? 'font-mono text-[12px]' : ''}`} style={{ color: 'var(--p-ink-900)' }}>{value}</span>
    </div>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
      <div className="text-sm font-bold mt-0.5"
        style={{ color: tone === 'cash' ? '#0A8F62' : tone === 'pending' ? '#A1672A' : 'var(--p-ink-900)' }}>
        {value}
      </div>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold flex items-center gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
      <div className="text-[13px] font-semibold mt-0.5 truncate" style={{ color: 'var(--p-ink-800)' }}>{value || '—'}</div>
    </div>
  )
}

// P3H — info tile for the dark identity hero band (light text).
function HeroInfo({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
      <div className="text-[13px] font-semibold mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.92)' }}>{value || '—'}</div>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</label>
      {children}
    </div>
  )
}
