import { useMemo, useState } from 'react'
import {
  Users, Play, Square, Clock, ChevronDown, CheckCircle2, Info,
  Stethoscope, Plus, CalendarDays, ChevronLeft, ChevronRight, UserCheck,
  AlertTriangle,
} from 'lucide-react'
import { OperationalShell, IdentityHeader } from '../../../../premium/OperationalShell'
import { SectionHead } from '../../../../premium/p2cPrimitives'
import { StatusPill, Avatar } from '../../../../premium/primitives'
import { useUserMode } from '../../../../context/UserModeContext'
import { getClinicName } from '../../../../data/p2c'
import { shiftHours } from '../../../../data/p2cR1'
import {
  useDemoState, useDoctorOnDuty, useNursesForClinic, useDoctorsForClinic, useStaff,
} from '../../../../context/DemoStateContext'
import { fmtDMY, fmtHM, todayYMD, parseYMD, shiftYMD, fmtLongLabel } from '../../../../lib/displayDate'
import { cn } from '../../../../lib/cn'
import { IS_SUPABASE } from '../../../../lib/api/config'
import LiveAttendancePanel from '../live/LiveAttendancePanel'

/* =========================================================================
 * P2C.R3 — External Clinic Attendance (practical compact tables)
 * -----------------------------------------------------------------------
 * Replaces the oversized R2 cards with two real operational tables:
 *
 *   - Nurses table: Date · Nurse · Start · End · Hours · Status · Action
 *   - Doctor table: Date · Doctor on Duty · Note · Action (no clock-in/out)
 *
 * Both tables filter by the selected date (defaults to today). The
 * dashboard's date selector ultimately drives this too, but this page
 * has its own selector for direct edits.
 * ========================================================================= */

const TODAY = '2026-05-27'

export default function ClinicAttendanceP2C() {
  // Supabase mode (5180): clinic users record + see their own day; admins get a
  // read-only all-clinics overview. Mock mode (5173) is unchanged below.
  if (IS_SUPABASE) return <SupabaseAttendance />
  return <MockClinicAttendanceP2C />
}

function SupabaseAttendance() {
  const { clinicId, currentUser, operateAs } = useUserMode()
  const isAdmin = currentUser?.role === 'admin'
  // Real admin → all-clinics overview. Admin operate-as → scoped to that one clinic.
  const isAdminOverview = isAdmin && !operateAs
  const clinicName = getClinicName(clinicId)
  return (
    <OperationalShell role="clinic_nurse" active="attendance"
      identityName={isAdminOverview ? 'All Clinics' : clinicName}
      identitySub={isAdminOverview ? 'Admin Overview' : 'External Clinic Workspace'}>
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-12 max-w-[1500px] mx-auto">
        <LiveAttendancePanel mode={isAdminOverview ? 'admin' : 'clinic'} clinicCode={clinicId} clinicName={clinicName}
          restrictToCode={operateAs ? clinicId : null} />
      </div>
    </OperationalShell>
  )
}

function MockClinicAttendanceP2C() {
  const { clinicId } = useUserMode()
  const clinicName = getClinicName(clinicId)
  // P2C.R4 — pull nurses/doctors from the runtime Staff Directory, scoped to
  // the current clinic. Admin reassignments update this list immediately.
  const scopedNurses = useNursesForClinic(clinicId)
  const scopedDoctors = useDoctorsForClinic(clinicId)
  const allStaff = useStaff()
  const nurses = useMemo(() => scopedNurses.map((s) => ({ id: s.staffId, name: s.fullName })), [scopedNurses])
  const doctors = useMemo(() => scopedDoctors.map((s) => ({ id: s.staffId, name: s.fullName })), [scopedDoctors])
  const { actions, state } = useDemoState()
  const onDuty = useDoctorOnDuty(clinicId)

  // Resolve a nurse/staff name by id from the runtime list (handles names
  // that come from seed data, runtime additions, or reassignments).
  function nurseName(id) {
    const m = allStaff.find((s) => s.staffId === id)
    return m ? m.fullName : id
  }
  function doctorName(id) {
    const m = allStaff.find((s) => s.staffId === id)
    return m ? m.fullName : id
  }

  const [dateYmd, setDateYmd] = useState(TODAY)
  const dateLabel = fmtDMY(parseYMD(dateYmd))

  function setToday() { setDateYmd(TODAY) }
  function moveDay(n) { setDateYmd((d) => shiftYMD(d, n)) }

  // Nurse shifts on the selected date — drawn directly from raw state so we
  // can show shifts started on yesterday but ending today, etc. We keep it
  // simple: any shift whose startedAt is on this date.
  const shiftsOnDate = useMemo(() => {
    return state.nurseShifts.filter((s) =>
      s.clinicId === clinicId && s.startedAt && s.startedAt.slice(0, 10) === dateYmd,
    )
  }, [state.nurseShifts, clinicId, dateYmd])

  const activeOnDate  = shiftsOnDate.filter((s) => s.status === 'active')
  const closedOnDate  = shiftsOnDate.filter((s) => s.status === 'closed')

  const [selectedNurse, setSelectedNurse] = useState('')

  function startShift() {
    if (!selectedNurse) return
    actions.startNurseShift(clinicId, selectedNurse)
    setSelectedNurse('')
  }
  function endShift(shift) { actions.endNurseShift(shift.id) }

  const doctor = onDuty?.doctorId || ''
  const setDoctor = (id) => actions.setDoctorOnDuty(clinicId, id)
  const availableNurses = nurses.filter((n) => !activeOnDate.some((s) => s.nurseId === n.id))

  return (
    <OperationalShell role="clinic_nurse" active="attendance"
      identityName={clinicName} identitySub="External Clinic Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-12 max-w-[1500px] mx-auto space-y-5">

        {/* Header + date selector (parallel to the dashboard date control) */}
        <header className="p-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-12 h-12 rounded-2xl inline-flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)', color: 'white' }}>
              <Users className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="p-eyebrow">Daily Attendance</div>
              <h1 className="p-h1 text-xl sm:text-2xl mt-0.5 truncate" style={{ color: 'var(--p-ink-900)' }}>{clinicName}</h1>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>
                Selected Date: <strong style={{ color: 'var(--p-ink-900)' }}>{dateLabel}</strong>
                <span className="ml-2" style={{ color: 'var(--p-ink-500)' }}>{fmtLongLabel(parseYMD(dateYmd))}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => moveDay(-1)} className="inline-flex items-center justify-center h-10 w-10 rounded-full p-btn-ghost"><ChevronLeft className="w-4 h-4" /></button>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
              <input type="date" value={dateYmd} onChange={(e) => setDateYmd(e.target.value)} className="p-input h-10 pl-9 pr-3 font-semibold" style={{ minWidth: 170 }} />
            </div>
            <button onClick={() => moveDay(1)} className="inline-flex items-center justify-center h-10 w-10 rounded-full p-btn-ghost"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={setToday} className={cn('inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold', dateYmd === TODAY ? 'p-btn-primary' : 'p-btn-ghost')}>Today</button>
          </div>
        </header>

        {/* Add Nurse Shift control */}
        <section className="p-card p-4 sm:p-5">
          <SectionHead eyebrow="Nurses" title="Add Nurse Shift"
            description="Multiple nurses can be on shift in the same day. Start a new shift below — End Shift in the table when done." />
          {nurses.length === 0 ? (
            <EmptyAssignment role="nurses" />
          ) : (
            <div className="rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                 style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
              <div className="sm:col-span-6 flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Select Nurse</label>
                <div className="relative">
                  <select value={selectedNurse} onChange={(e) => setSelectedNurse(e.target.value)} className="p-input appearance-none w-full pr-8">
                    <option value="">Select a nurse…</option>
                    {availableNurses.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                    {availableNurses.length === 0 && <option disabled>(All nurses already on shift)</option>}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
                </div>
              </div>
              <div className="sm:col-span-3 flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Start Time (now)</label>
                <span className="inline-flex items-center gap-1.5 h-11 px-3 rounded-xl text-xs font-bold"
                      style={{ background: 'white', border: '1px solid var(--p-border)', color: 'var(--p-ink-900)' }}>
                  <Clock className="w-3.5 h-3.5" /> {currentTime()}
                </span>
              </div>
              <div className="sm:col-span-3">
                <button onClick={startShift} disabled={!selectedNurse || dateYmd !== TODAY}
                  title={dateYmd !== TODAY ? 'Switch to Today to start a new shift' : ''}
                  className={cn('w-full inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-xs font-bold p-btn-primary',
                    (!selectedNurse || dateYmd !== TODAY) && 'opacity-40 cursor-not-allowed')}>
                  <Play className="w-3.5 h-3.5" /> Start Shift
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Nurses table */}
        <section>
          <SectionHead eyebrow="Nurse Shifts" title={`Nurse Attendance — ${dateLabel}`}
            description={`${activeOnDate.length} active · ${closedOnDate.length} closed today.`} />
          <div className="p-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] min-w-[640px]">
                <thead>
                  <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
                    {['Date', 'Nurse', 'Start Shift', 'End Shift', 'Worked Hours', 'Status', 'Action'].map((h) =>
                      <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {shiftsOnDate.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>
                        No nurse shifts recorded for {dateLabel}.
                      </td>
                    </tr>
                  )}
                  {shiftsOnDate.map((s) => (
                    <tr key={s.id} style={{ borderTop: '1px solid var(--p-border)' }}>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{fmtDMY(s.startedAt)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={nurseName(s.nurseId)} size={24} tone="navy" />
                          <span className="font-semibold" style={{ color: 'var(--p-ink-900)' }}>{nurseName(s.nurseId)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{fmtHM(s.startedAt)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{s.endedAt ? fmtHM(s.endedAt) : '—'}</td>
                      <td className="px-3 py-2.5 p-numeric font-bold" style={{ color: 'var(--p-ink-900)' }}>{shiftHours(s.startedAt, s.endedAt).toFixed(1)}h</td>
                      <td className="px-3 py-2.5">
                        {s.status === 'active'
                          ? <StatusPill tone="cash">On Shift</StatusPill>
                          : <StatusPill tone="finalized" icon={CheckCircle2}>Closed</StatusPill>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {s.status === 'active' ? (
                          <button onClick={() => endShift(s)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold p-btn-ghost no-print">
                            <Square className="w-3 h-3" /> End Shift
                          </button>
                        ) : (
                          <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Doctor on duty table — by day, no clock-in */}
        <section>
          <SectionHead eyebrow="Doctor on Duty" title={`Doctor Attendance — ${dateLabel}`}
            description="Only one doctor per day. No time tracking — clinic just records who was on duty for this date." />
          <div className="p-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] min-w-[480px]">
                <thead>
                  <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
                    {['Date', 'Doctor on Duty', 'Note', 'Action'].map((h) =>
                      <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{dateLabel}</td>
                    <td className="px-3 py-2.5">
                      {doctor ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={doctorName(doctor)} size={24} tone="teal" />
                          <span className="font-semibold" style={{ color: 'var(--p-ink-900)' }}>{doctorName(doctor)}</span>
                        </div>
                      ) : (
                        <span className="text-[12px] italic" style={{ color: 'var(--p-ink-400)' }}>— Not yet selected —</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-500)' }}>Day-only — no clock-in/out</td>
                    <td className="px-3 py-2.5 text-right no-print">
                      {doctors.length === 0 ? (
                        <span className="text-[11px] italic" style={{ color: 'var(--p-mixed)' }}>
                          No active doctors assigned. Contact Admin.
                        </span>
                      ) : (
                        <div className="relative inline-block">
                          <select value={doctor} onChange={(e) => setDoctor(e.target.value)} className="p-input h-9 pr-8 text-[11px]" style={{ minWidth: 200 }}>
                            <option value="">Assign doctor…</option>
                            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Daily summary — for the daily report */}
        <section className="p-card p-5 space-y-3">
          <SectionHead eyebrow="Daily Summary Preview" title={`Attendance — ${dateLabel}`}
            description="This is what the Daily Report includes for the selected date." />
          <div className="rounded-xl p-4" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
            {shiftsOnDate.length === 0 ? (
              <div className="text-sm" style={{ color: 'var(--p-ink-500)' }}>No nurse shifts recorded.</div>
            ) : (
              <ul className="space-y-1 text-[13px]" style={{ color: 'var(--p-ink-800)' }}>
                {shiftsOnDate.map((s) => (
                  <li key={s.id}>
                    <strong>{nurseName(s.nurseId)}</strong>: {fmtHM(s.startedAt)} – {s.endedAt ? fmtHM(s.endedAt) : 'present'} ({shiftHours(s.startedAt, s.endedAt).toFixed(1)}h{s.status === 'active' ? ', ongoing' : ''})
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-2 mt-2 border-t text-[13px]" style={{ borderColor: 'var(--p-border)', color: 'var(--p-ink-800)' }}>
              <strong>Doctor on Duty:</strong> {doctor ? doctorName(doctor) : '— Not yet selected —'}
            </div>
          </div>
        </section>

      </div>
    </OperationalShell>
  )
}

function currentTime() {
  const d = new Date()
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function EmptyAssignment({ role }) {
  return (
    <div className="rounded-xl p-4 flex items-start gap-2.5"
         style={{ background: 'var(--p-pending-soft)', border: '1px solid #F0C97A' }}>
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#A1672A' }} />
      <p className="text-[12px] leading-relaxed font-semibold" style={{ color: '#7A4F1F' }}>
        No active {role} assigned to this clinic. Contact Admin to update staff assignments in Users &amp; Staff.
      </p>
    </div>
  )
}
