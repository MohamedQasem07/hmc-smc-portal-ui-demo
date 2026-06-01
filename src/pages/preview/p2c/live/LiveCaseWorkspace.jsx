import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, AlertTriangle, Building2, Hotel, Phone, Mail, BedDouble, Clock,
  CheckCircle2, Pencil, Save, X, Send, ShieldCheck, Gift, Banknote, DoorOpen,
  Activity, History,
} from 'lucide-react'
import { SectionHead, FacilityBadge, FinTypePill, RoutePill, P2CTimeline } from '../../../../premium/p2cPrimitives'
import { StatusPill, Avatar } from '../../../../premium/primitives'
import { useCases, useFindCase, useDemoState } from '../../../../context/DemoStateContext'
import { useUserMode } from '../../../../context/UserModeContext'
import { useLiveRooms } from '../../../../lib/useLiveRooms'
import { fmtDate } from '../../../../lib/format'
import {
  updatePatientContact, updateCaseFields, assignRoom, dischargeCase,
  fetchCaseFinancials, upsertCashInvoiceCharge, fetchRoomStayHistory, recordCaseCollection,
} from '../../../../lib/api/portalData'
import { escalateIfAuthError, sbEnsureSession } from '../../../../lib/api/auth'
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

const CURRENCIES = ['EUR', 'GBP', 'USD', 'EGP']

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
  const refresh = actions.refreshCases
  const isClosed = c?.operationalStatus === 'Closed'

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

  const [editing, setEditing] = useState(false)
  const [editReg, setEditReg] = useState(false)   // P3G — full registration edit mode
  const [form, setForm] = useState({})
  const [showDischarge, setShowDischarge] = useState(false)
  const [checkoutAt, setCheckoutAt] = useState(nowLocalDatetime())
  const [invAmount, setInvAmount] = useState('')
  const [invCurrency, setInvCurrency] = useState('EUR')

  useEffect(() => {
    if (fin?.cashOutstanding) {
      setInvAmount(String(fin.cashOutstanding.invoice))
      setInvCurrency(fin.cashOutstanding.currency)
    }
  }, [fin])

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

  function startEdit() {
    setForm({
      phoneCode: c.patient.phoneCode || '', phone: c.patient.phone || '',
      email: c.patient.email || '', postal: c.patient.postal || '',
      hotel: c.patient.hotel || '', hotelRoom: c.patient.hotelRoom || '',
      note: c.patient.note || '',
    })
    setOkMsg(null); setError(null); setEditing(true)
  }
  async function saveEdit() {
    await run(async () => {
      await updatePatientContact(c.patientId, {
        phoneCode: form.phoneCode, phone: form.phone, email: form.email, postal: form.postal,
      })
      await updateCaseFields(c.id, { hotel: form.hotel, hotelRoom: form.hotelRoom, note: form.note })
      setEditing(false)
    }, 'Details saved.')
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

  async function saveInvoice() {
    await run(async () => { await upsertCashInvoiceCharge(c.id, invAmount, invCurrency); await loadFin() }, 'Invoice amount saved.')
  }

  // P3J — record a REAL cash/Visa collection against this case (was missing: the
  // panel could set the invoice but never the money actually collected, so
  // Collected/Outstanding never moved). Persists via portal_record_collection
  // (+ treasury movement), then reloads so the figures update.
  async function saveCollection(line) {
    await run(async () => {
      await recordCaseCollection(c.id, line, { locationCode: c.currentLocationCode || null })
      await loadFin()
    }, 'Collection recorded.')
  }

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
  if (editReg && !isClosed) {
    // P3J — hand the stored cash invoice (amount + currency) to the edit form so
    // Step-3 Financial prefills the real values instead of blank / EUR.
    const editCaseWithInvoice = {
      ...c,
      cashInvoice: fin?.cashOutstanding
        ? { amount: fin.cashOutstanding.invoice, currency: fin.cashOutstanding.currency }
        : null,
    }
    return (
      <ClinicNewCaseP2C embedded editCase={editCaseWithInvoice}
        onDone={async () => { setEditReg(false); if (refresh) await refresh(); await loadFin(); setOkMsg('Registration updated.') }} />
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
              {!isClosed && !editing && (
                <>
                  <button onClick={() => { setOkMsg(null); setError(null); setEditReg(true) }}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold p-btn-primary">
                    <Pencil className="w-3.5 h-3.5" /> Edit Full Registration
                  </button>
                  <button onClick={startEdit}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)', color: 'white' }}>
                    <Pencil className="w-3.5 h-3.5" /> Edit details
                  </button>
                </>
              )}
              {isClosed && (
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
          {!isClosed && (!c.patient.phone || !c.patient.email) && (
            <button onClick={startEdit} className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#7FE7DE' }}>
              <Pencil className="w-3 h-3" /> Add missing contact details
            </button>
          )}
        </div>
      </section>

      {/* Edit details panel (light card) */}
      {editing && (
        <div className="p-card p-card-top p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-brand-mid)' }}>
            Complete missing details
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Phone code"><input className="p-input" value={form.phoneCode} onChange={(e) => setForm({ ...form, phoneCode: e.target.value })} placeholder="+20" /></Field>
            <Field label="Phone"><input className="p-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="100 000 0000" /></Field>
            <Field label="Email"><input className="p-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@email.com" /></Field>
            <Field label="Postal code"><input className="p-input" value={form.postal} onChange={(e) => setForm({ ...form, postal: e.target.value })} /></Field>
            <Field label="Hotel"><input className="p-input" value={form.hotel} onChange={(e) => setForm({ ...form, hotel: e.target.value })} /></Field>
            <Field label="Hotel room"><input className="p-input" value={form.hotelRoom} onChange={(e) => setForm({ ...form, hotelRoom: e.target.value })} /></Field>
            <Field label="Clinical note" className="sm:col-span-3"><input className="p-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} disabled={busy}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold p-btn-ghost">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={saveEdit} disabled={busy}
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-sm font-bold p-btn-primary">
              <Save className="w-4 h-4" /> {busy ? 'Saving…' : 'Save details'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT — encounter / room / specialists */}
        <div className="xl:col-span-7 space-y-5">

          {/* Visit / discharge */}
          <section className="p-card p-5 space-y-4">
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
            <section className="p-card p-5">
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
                    destination branch (when no branch receptionist is available). The receive
                    RPC is admin-aware; this deep-links into the live receive+classify flow. */}
                {isAdmin && !c.transfer.receivedAt && c.transfer.toBranchId && (
                  <Link to={`/reception/${String(c.transfer.toBranchId).replace(/_/g, '-')}/incoming-transfers/${c.id}`}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold p-btn-primary mt-1.5">
                    <DoorOpen className="w-3.5 h-3.5" /> Receive as {c.transfer.toBranchName || 'destination branch'}
                  </Link>
                )}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT — financial (surfaced first on mobile: the figure cashier needs at a glance) */}
        <div className="xl:col-span-5 space-y-5 order-first xl:order-none">
          <section className="p-card p-5 space-y-4">
            <SectionHead eyebrow="Financial" title="Collection Summary" />
            <FinancialPanel c={c} fin={fin} finError={finError} isClosed={isClosed} busy={busy}
              invAmount={invAmount} setInvAmount={setInvAmount}
              invCurrency={invCurrency} setInvCurrency={setInvCurrency}
              onSaveInvoice={saveInvoice} onRecordCollection={saveCollection} />
          </section>
        </div>
      </div>

      {/* Discharge confirmation modal */}
      {showDischarge && (
        <DischargeModal c={c} fin={fin} roomLabel={roomLabel} checkoutAt={checkoutAt} setCheckoutAt={setCheckoutAt}
          busy={busy} onCancel={() => setShowDischarge(false)} onConfirm={confirmDischarge} />
      )}
    </div>
  )
}

// =====================================================================
function FinancialPanel({ c, fin, finError, isClosed, busy, invAmount, setInvAmount, invCurrency, setInvCurrency, onSaveInvoice, onRecordCollection }) {
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
    const remaining = out ? out.remaining : null
    const under = remaining !== null && remaining > 0.005
    const over = remaining !== null && remaining < -0.005
    return (
      <div className="space-y-3">
        {finErrorBanner}
        <div className="rounded-xl p-3 space-y-3" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
          <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>
            <Banknote className="inline w-3.5 h-3.5 mr-1" /> Cash Invoice
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
            <Field label="Invoice amount" className="col-span-1">
              <input className="p-input h-10" type="number" min="0" step="0.01" value={invAmount}
                onChange={(e) => setInvAmount(e.target.value)} disabled={isClosed || busy} />
            </Field>
            <Field label="Currency" className="col-span-1">
              <select className="p-input h-10" value={invCurrency} onChange={(e) => setInvCurrency(e.target.value)} disabled={isClosed || busy}>
                {CURRENCIES.map((cur) => <option key={cur} value={cur}>{cur}</option>)}
              </select>
            </Field>
            {!isClosed && (
              <button onClick={onSaveInvoice} disabled={busy}
                className="h-10 rounded-full text-xs font-bold p-btn-primary col-span-2 sm:col-span-1">Save</button>
            )}
          </div>
          {out && (
            <div className="text-[12px] space-y-1 pt-1 border-t" style={{ borderColor: 'var(--p-border)' }}>
              <div className="flex justify-between"><span style={{ color: 'var(--p-ink-600)' }}>Invoice</span><span className="font-bold p-numeric">{fmtAmt(out.invoice)} {out.currency}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--p-ink-600)' }}>Collected</span><span className="font-bold p-numeric">{fmtAmt(out.collected)} {out.currency}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--p-ink-600)' }}>Outstanding</span>
                <span className="font-bold p-numeric" style={{ color: under ? '#B14242' : '#0A8F62' }}>{fmtAmt(out.remaining)} {out.currency}</span>
              </div>
            </div>
          )}
        </div>

        {/* P3J — record the money actually collected (cash / Visa). Persists a real
            collection + treasury movement; Collected / Outstanding then update. */}
        {!isClosed && (
          <CashCollectionForm
            invoiceCurrency={out?.currency || invCurrency}
            busy={busy}
            onSubmit={onRecordCollection}
          />
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

// P3J — inline "record collection" form for a Cash case (Case Detail). Cash
// collects in the chosen currency; Visa / Card settles in EGP and needs an FX
// rate to the invoice currency (same rules as intake). Disabled while saving so
// a double-click cannot create a duplicate line.
function CashCollectionForm({ invoiceCurrency, busy, onSubmit }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(invoiceCurrency || 'EGP')
  const [method, setMethod] = useState('Cash')
  const [fxRate, setFxRate] = useState('')
  const isVisa = method === 'Visa / Card'

  useEffect(() => { setCurrency(invoiceCurrency || 'EGP') }, [invoiceCurrency])

  function reset() { setAmount(''); setFxRate(''); setMethod('Cash'); setCurrency(invoiceCurrency || 'EGP') }
  function submit() {
    const amt = Number(amount)
    if (!(amt > 0)) return
    const line = isVisa
      ? { method: 'Visa', currency: invoiceCurrency || 'EGP', amount: amt,
          fxRefCurrency: invoiceCurrency || 'EGP', fxRefAmount: amt, fxRate: Number(fxRate) || null }
      : { method: 'Cash', currency, amount: amt }
    Promise.resolve(onSubmit(line)).then(() => { reset(); setOpen(false) })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} disabled={busy}
        className="w-full h-10 rounded-full text-xs font-bold inline-flex items-center justify-center gap-1.5 p-btn-ghost"
        style={{ border: '1px solid var(--p-border-strong)' }}>
        <Banknote className="w-3.5 h-3.5" /> Record collection
      </button>
    )
  }
  return (
    <div className="rounded-xl p-3 space-y-3" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
      <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>Record Collection</div>
      <div className="grid grid-cols-2 gap-2 items-end">
        <Field label="Method" className="col-span-2">
          <select className="p-input h-10" value={method} onChange={(e) => setMethod(e.target.value)} disabled={busy}>
            <option>Cash</option>
            <option>Visa / Card</option>
          </select>
        </Field>
        <Field label="Amount collected">
          <input className="p-input h-10" type="number" min="0" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)} disabled={busy} placeholder="0" />
        </Field>
        {isVisa ? (
          <Field label={`FX → EGP (1 ${invoiceCurrency || 'EGP'} = ? EGP)`}>
            <input className="p-input h-10" type="number" min="0" step="0.0001" value={fxRate}
              onChange={(e) => setFxRate(e.target.value)} disabled={busy} placeholder="e.g. 50" />
          </Field>
        ) : (
          <Field label="Currency">
            <select className="p-input h-10" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={busy}>
              {CURRENCIES.map((cur) => <option key={cur} value={cur}>{cur}</option>)}
            </select>
          </Field>
        )}
      </div>
      <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
        {isVisa
          ? 'Visa / Card settles in EGP. Amount is in the invoice currency; the FX rate converts it to the EGP bank settlement.'
          : 'Physical cash is recorded in the collected currency. Use the invoice currency to reduce Outstanding.'}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => { reset(); setOpen(false) }} disabled={busy}
          className="h-9 px-4 rounded-full text-xs font-semibold p-btn-ghost">Cancel</button>
        <button onClick={submit} disabled={busy || !(Number(amount) > 0) || (isVisa && !(Number(fxRate) > 0))}
          className="h-9 px-5 rounded-full text-xs font-bold p-btn-primary">{busy ? 'Saving…' : 'Save collection'}</button>
      </div>
    </div>
  )
}

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
