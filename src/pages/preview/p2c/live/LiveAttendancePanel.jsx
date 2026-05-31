import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Users, Play, Square, Clock, ChevronDown, ChevronLeft, ChevronRight, CheckCircle2,
  Stethoscope, RefreshCw, AlertTriangle, ShieldCheck, CalendarDays, Building2,
} from 'lucide-react'
import { SectionHead } from '../../../../premium/p2cPrimitives'
import { StatusPill, Avatar } from '../../../../premium/primitives'
import {
  fetchAttendance, fetchAssignableStaff, locationIdForCode,
  recordNurseShift, endNurseShift, recordDoctorDuty,
} from '../../../../lib/api/portalData'
import { fmtDMY, fmtHM, diffHM, todayYMD, parseYMD, shiftYMD, fmtLongLabel } from '../../../../lib/displayDate'
import { cn } from '../../../../lib/cn'

/* =========================================================================
 * LiveAttendancePanel (P3B / Task #9) — supabase-mode only.
 * -----------------------------------------------------------------------
 * mode="clinic": a clinic user records + sees ONLY its own location/day
 *   attendance. Nurse pickers come from portal_staff_location_assignments
 *   (RLS-scoped), so only staff the record RPCs will accept are offered.
 *   Writes go through portal_record_nurse_shift / portal_end_nurse_shift /
 *   portal_record_doctor_duty (verified RPCs).
 * mode="admin": read-only daily overview across ALL clinics (RLS returns
 *   everything for admin). No record controls.
 * ========================================================================= */

function durationLabel(s) {
  if (s.workedMinutes != null) {
    const h = Math.floor(s.workedMinutes / 60), m = s.workedMinutes % 60
    return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`
  }
  return diffHM(s.startAt, s.endAt)
}

export default function LiveAttendancePanel({ mode = 'clinic', clinicCode = null, clinicName = '' }) {
  const isAdmin = mode === 'admin'
  const [dateYmd, setDateYmd] = useState(() => todayYMD())
  const [data, setData] = useState({ shifts: [], duties: [] })
  const [staff, setStaff] = useState([])
  const [locationId, setLocationId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [selectedNurse, setSelectedNurse] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const att = await fetchAttendance(dateYmd)
      setData(att)
      if (!isAdmin) {
        const [assignable, locId] = await Promise.all([fetchAssignableStaff(), locationIdForCode(clinicCode)])
        setStaff(assignable)
        setLocationId(locId)
      }
    } catch (e) {
      setError(e?.message || 'Failed to load attendance.')
    } finally {
      setLoading(false)
    }
  }, [dateYmd, isAdmin, clinicCode])

  useEffect(() => { load() }, [load])

  const nurses = useMemo(() => staff.filter((s) => s.role === 'nurse'), [staff])
  const doctors = useMemo(() => staff.filter((s) => s.role === 'doctor'), [staff])
  const dateLabel = fmtDMY(parseYMD(dateYmd))
  const isToday = dateYmd === todayYMD()

  // For clinic mode, only one location is in scope — derive its id robustly.
  const ownLocationId = locationId || nurses[0]?.locationId || doctors[0]?.locationId || null
  const activeNurseIds = new Set(data.shifts.filter((s) => s.status === 'active').map((s) => s.staffId))
  const availableNurses = nurses.filter((n) => !activeNurseIds.has(n.staffId))

  async function doRecordNurse() {
    if (!selectedNurse || !ownLocationId) return
    setBusy(true); setFeedback(null)
    try {
      await recordNurseShift(ownLocationId, selectedNurse, dateYmd)
      setSelectedNurse('')
      setFeedback({ tone: 'ok', message: 'Nurse shift started.' })
      await load()
    } catch (e) {
      setFeedback({ tone: 'reject', message: cleanErr(e) })
    } finally { setBusy(false) }
  }
  async function doEndShift(shift) {
    setBusy(true); setFeedback(null)
    try {
      await endNurseShift(shift.id)
      setFeedback({ tone: 'ok', message: `Shift ended for ${shift.staffName || 'nurse'}.` })
      await load()
    } catch (e) {
      setFeedback({ tone: 'reject', message: cleanErr(e) })
    } finally { setBusy(false) }
  }
  async function doRecordDoctor() {
    if (!selectedDoctor || !ownLocationId) return
    setBusy(true); setFeedback(null)
    try {
      await recordDoctorDuty(ownLocationId, selectedDoctor, dateYmd, null)
      setSelectedDoctor('')
      setFeedback({ tone: 'ok', message: 'Doctor on duty recorded.' })
      await load()
    } catch (e) {
      setFeedback({ tone: 'reject', message: cleanErr(e) })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      {/* Date selector + scope note */}
      <header className="p-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-12 h-12 rounded-2xl inline-flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)', color: 'white' }}>
            <Users className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <div className="p-eyebrow">Daily Attendance · Live</div>
            <h1 className="p-h1 text-xl sm:text-2xl mt-0.5 truncate" style={{ color: 'var(--p-ink-900)' }}>
              {isAdmin ? 'All Clinics — Overview' : clinicName}
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>
              {dateLabel} <span className="ml-1">{fmtLongLabel(parseYMD(dateYmd))}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setDateYmd((d) => shiftYMD(d, -1))} className="inline-flex items-center justify-center h-10 w-10 rounded-full p-btn-ghost"><ChevronLeft className="w-4 h-4" /></button>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
            <input type="date" value={dateYmd} onChange={(e) => setDateYmd(e.target.value)} className="p-input h-10 pl-9 pr-3 font-semibold" style={{ minWidth: 170 }} />
          </div>
          <button onClick={() => setDateYmd((d) => shiftYMD(d, 1))} className="inline-flex items-center justify-center h-10 w-10 rounded-full p-btn-ghost"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setDateYmd(todayYMD())} className={cn('inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold', isToday ? 'p-btn-primary' : 'p-btn-ghost')}>Today</button>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full text-xs font-semibold p-btn-ghost">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]"
        style={{ background: 'var(--p-brand-pale)', color: 'var(--p-ink-800)', border: '1px solid #BCCDE8' }}>
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--p-brand-mid)' }} />
        <span>
          {isAdmin
            ? 'Read-only daily overview across all clinics (row-level-security returns every location for admin).'
            : <>You record and view attendance for <strong>{clinicName}</strong> only. Pickers list nurses / doctors assigned to this clinic — the same set the server will accept.</>}
        </span>
      </div>

      {error && (
        <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]"
          style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span className="font-semibold">{error}</span>
        </div>
      )}
      {feedback && (
        <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]"
          style={feedback.tone === 'ok'
            ? { background: 'var(--p-finalized-soft)', color: '#076D4A', border: '1px solid #9FD4BB' }
            : { background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
          {feedback.tone === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {isAdmin ? (
        <AdminOverview data={data} loading={loading} dateLabel={dateLabel} />
      ) : (
        <>
          {/* Add nurse shift */}
          <section className="p-card p-4 sm:p-5">
            <SectionHead eyebrow="Nurses" title="Add Nurse Shift"
              description="Multiple nurses can be on shift the same day. Start a shift below; End Shift in the table when done." />
            {nurses.length === 0 ? (
              <EmptyAssign role="nurses" />
            ) : (
              <div className="rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                <div className="sm:col-span-7 flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Select Nurse</label>
                  <div className="relative">
                    <select value={selectedNurse} onChange={(e) => setSelectedNurse(e.target.value)} className="p-input appearance-none w-full pr-8">
                      <option value="">Select a nurse…</option>
                      {availableNurses.map((n) => <option key={n.staffId} value={n.staffId}>{n.name}</option>)}
                      {availableNurses.length === 0 && <option disabled>(All assigned nurses already on shift)</option>}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
                  </div>
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Start</label>
                  <span className="inline-flex items-center gap-1.5 h-11 px-3 rounded-xl text-xs font-bold"
                    style={{ background: 'white', border: '1px solid var(--p-border)', color: 'var(--p-ink-900)' }}>
                    <Clock className="w-3.5 h-3.5" /> now
                  </span>
                </div>
                <div className="sm:col-span-3">
                  <button onClick={doRecordNurse} disabled={!selectedNurse || busy || !ownLocationId}
                    className={cn('w-full inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-xs font-bold p-btn-primary',
                      (!selectedNurse || busy || !ownLocationId) && 'opacity-40 cursor-not-allowed')}>
                    <Play className="w-3.5 h-3.5" /> Start Shift
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Nurse table */}
          <section>
            <SectionHead eyebrow="Nurse Shifts" title={`Nurse Attendance — ${dateLabel}`}
              description={`${data.shifts.filter((s) => s.status === 'active').length} active · ${data.shifts.filter((s) => s.status !== 'active').length} closed.`} />
            <ShiftTable shifts={data.shifts} loading={loading} dateLabel={dateLabel} onEnd={doEndShift} busy={busy} showAction />
          </section>

          {/* Doctor on duty */}
          <section className="p-card p-4 sm:p-5 space-y-4">
            <SectionHead eyebrow="Doctor on Duty" title={`Doctor Attendance — ${dateLabel}`}
              description="Record who was on duty for this date (one upsert per doctor/day; no time tracking)." />
            {doctors.length === 0 ? (
              <EmptyAssign role="doctors" />
            ) : (
              <div className="rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                <div className="sm:col-span-9 flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Select Doctor</label>
                  <div className="relative">
                    <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} className="p-input appearance-none w-full pr-8">
                      <option value="">Select a doctor…</option>
                      {doctors.map((d) => <option key={d.staffId} value={d.staffId}>{d.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <button onClick={doRecordDoctor} disabled={!selectedDoctor || busy || !ownLocationId}
                    className={cn('w-full inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-xs font-bold p-btn-primary',
                      (!selectedDoctor || busy || !ownLocationId) && 'opacity-40 cursor-not-allowed')}>
                    <Stethoscope className="w-3.5 h-3.5" /> Record Duty
                  </button>
                </div>
              </div>
            )}
            <DutyTable duties={data.duties} loading={loading} dateLabel={dateLabel} />
          </section>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function ShiftTable({ shifts, loading, dateLabel, onEnd, busy, showAction, showClinic }) {
  const cols = ['Date', ...(showClinic ? ['Clinic'] : []), 'Nurse', 'Start', 'End', 'Worked', 'Status', 'Recorded by', ...(showAction ? ['Action'] : [])]
  return (
    <div className="p-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[640px]">
          <thead>
            <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
              {cols.map((h) => <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={cols.length} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading…</td></tr>}
            {!loading && shifts.length === 0 && (
              <tr><td colSpan={cols.length} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No nurse shifts for {dateLabel}.</td></tr>
            )}
            {!loading && shifts.map((s) => (
              <tr key={s.id} style={{ borderTop: '1px solid var(--p-border)' }}>
                <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{fmtDMY(s.workDate)}</td>
                {showClinic && <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--p-ink-700)' }}>{s.locationName || s.locationCode || '—'}</td>}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={s.staffName || '—'} size={24} tone="navy" />
                    <span className="font-semibold" style={{ color: 'var(--p-ink-900)' }}>{s.staffName || '—'}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{fmtHM(s.startAt)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{s.endAt ? fmtHM(s.endAt) : '—'}</td>
                <td className="px-3 py-2.5 p-numeric font-bold" style={{ color: 'var(--p-ink-900)' }}>{durationLabel(s)}</td>
                <td className="px-3 py-2.5">
                  {s.status === 'active'
                    ? <StatusPill tone="cash">On Shift</StatusPill>
                    : <StatusPill tone="finalized" icon={CheckCircle2}>Closed</StatusPill>}
                </td>
                <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--p-ink-600)' }}>{s.recordedByName || (s.recordedBy ? s.recordedBy.slice(0, 8) + '…' : '—')}</td>
                {showAction && (
                  <td className="px-3 py-2.5 text-right no-print">
                    {s.status === 'active' ? (
                      <button onClick={() => onEnd(s)} disabled={busy}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold p-btn-ghost">
                        <Square className="w-3 h-3" /> End Shift
                      </button>
                    ) : <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>—</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DutyTable({ duties, loading, dateLabel, showClinic }) {
  const cols = ['Date', ...(showClinic ? ['Clinic'] : []), 'Doctor on Duty', 'Recorded by', 'Note']
  return (
    <div className="p-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[480px]">
          <thead>
            <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
              {cols.map((h) => <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading…</td></tr>}
            {!loading && duties.length === 0 && (
              <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No doctor on duty recorded for {dateLabel}.</td></tr>
            )}
            {!loading && duties.map((d) => (
              <tr key={d.id} style={{ borderTop: '1px solid var(--p-border)' }}>
                <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{fmtDMY(d.workDate)}</td>
                {showClinic && <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--p-ink-700)' }}>{d.locationName || d.locationCode || '—'}</td>}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={d.staffName || '—'} size={24} tone="teal" />
                    <span className="font-semibold" style={{ color: 'var(--p-ink-900)' }}>{d.staffName || '—'}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--p-ink-600)' }}>{d.recordedByName || (d.recordedBy ? d.recordedBy.slice(0, 8) + '…' : '—')}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-500)' }}>{d.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminOverview({ data, loading, dateLabel }) {
  // Group both shifts and duties by clinic for a per-location daily overview.
  const byClinic = useMemo(() => {
    const m = {}
    const key = (r) => r.locationName || r.locationCode || '—'
    for (const s of data.shifts) { (m[key(s)] ||= { shifts: [], duties: [] }).shifts.push(s) }
    for (const d of data.duties) { (m[key(d)] ||= { shifts: [], duties: [] }).duties.push(d) }
    return m
  }, [data])
  const clinics = Object.keys(byClinic).sort()

  if (loading) return <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading live attendance…</div>
  if (clinics.length === 0) return <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No attendance recorded across any clinic for {dateLabel}.</div>

  return (
    <div className="space-y-6">
      {clinics.map((name) => {
        const g = byClinic[name]
        return (
          <section key={name} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg inline-flex items-center justify-center" style={{ background: 'var(--p-brand-mid)', color: 'white' }}><Building2 className="w-4 h-4" /></span>
              <h3 className="text-base font-bold" style={{ color: 'var(--p-ink-900)' }}>{name}</h3>
              <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{g.shifts.length} shift{g.shifts.length !== 1 ? 's' : ''} · {g.duties.length} doctor record{g.duties.length !== 1 ? 's' : ''}</span>
            </div>
            <ShiftTable shifts={g.shifts} loading={false} dateLabel={dateLabel} showClinic={false} />
            <DutyTable duties={g.duties} loading={false} dateLabel={dateLabel} showClinic={false} />
          </section>
        )
      })}
    </div>
  )
}

function EmptyAssign({ role }) {
  return (
    <div className="rounded-xl p-4 flex items-start gap-2.5" style={{ background: 'var(--p-pending-soft)', border: '1px solid #F0C97A' }}>
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#A1672A' }} />
      <p className="text-[12px] leading-relaxed font-semibold" style={{ color: '#7A4F1F' }}>
        No active {role} assigned to this clinic. Admin assigns staff in Users &amp; Staff before attendance can be recorded.
      </p>
    </div>
  )
}

function cleanErr(e) {
  const m = e?.message || String(e || 'Action failed.')
  // Surface the human part of a PORTAL_* RPC exception.
  const match = /PORTAL_[A-Z]+:\s*(.*)$/.exec(m)
  return match ? match[1] : m
}
