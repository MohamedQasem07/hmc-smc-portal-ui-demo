import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Stethoscope, Send, Plus, FileBarChart2, Banknote, Clock,
  ChevronLeft, ChevronRight, CalendarDays, Users, BedDouble,
  ClipboardList, Wallet, ArrowRight, ShieldCheck, Gift, CreditCard,
  Building2, TrendingUp, AlertTriangle,
} from 'lucide-react'
import { OperationalShell } from '../../../../premium/OperationalShell'
import { SectionHead, DemoBanner, FacilityBadge, FinTypePill } from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import { useUserMode } from '../../../../context/UserModeContext'
import {
  useCasesForClinic, useTreasuryFor, useVisaBankFor,
  useActiveShifts, useClosedShiftsToday, useDoctorOnDuty,
} from '../../../../context/DemoStateContext'
import { getClinicName } from '../../../../data/p2c'
import { R1_CURRENCIES, r1DoctorsFor, r1NurseName, shiftHours } from '../../../../data/p2cR1'
import { fmtDMY, fmtHM, todayYMD, parseYMD, shiftYMD, fmtLongLabel } from '../../../../lib/displayDate'
import { cn } from '../../../../lib/cn'

/* =========================================================================
 * P2C.R3 — External Clinic Dashboard (wide desktop redesign)
 * -----------------------------------------------------------------------
 * - Top date selector (prev/next/today) controls everything below.
 * - Compact Quick Actions row across desktop width.
 * - Full-width KPI grid for the selected date.
 * - Multi-panel operational layout: Cases · Treasury · Attendance · Transfers
 * - Layout collapses cleanly at <md but stays a real operational workspace
 *   at laptop/desktop widths.
 * ========================================================================= */

const TODAY = '2026-05-27'

export default function ClinicDashboardP2C() {
  const { clinicId } = useUserMode()
  const clinicName = getClinicName(clinicId)
  const cases = useCasesForClinic(clinicId)
  const treasury = useTreasuryFor(clinicId)
  const visaBank = useVisaBankFor(clinicId)
  const activeShifts = useActiveShifts(clinicId)
  const closedShifts = useClosedShiftsToday(clinicId)
  const onDuty = useDoctorOnDuty(clinicId)
  const doctors = r1DoctorsFor(clinicId)
  const doctorName = onDuty?.doctorId ? (doctors.find((d) => d.id === onDuty.doctorId)?.name || '—') : '— Not yet selected —'

  // -------- Date filter state --------
  const [dateYmd, setDateYmd] = useState(TODAY)
  const dateLabel = fmtDMY(parseYMD(dateYmd))
  const longLabel = fmtLongLabel(parseYMD(dateYmd))

  function setToday() { setDateYmd(TODAY) }
  function moveDay(n) { setDateYmd((d) => shiftYMD(d, n)) }

  // -------- Date-filtered case set --------
  const casesForDate = useMemo(() => {
    return cases.filter((c) => {
      if (!c.visitDate) return false
      const ymd = new Date(c.visitDate).toISOString().slice(0, 10)
      // p2cR1 uses ISO with timezone — slice off date only
      return ymd === dateYmd
    })
  }, [cases, dateYmd])

  // -------- KPIs for the selected date --------
  const k = useMemo(() => {
    const k = {
      total: casesForDate.length,
      cash: casesForDate.filter((c) => c.financialType === 'Cash').length,
      insurance: casesForDate.filter((c) => c.financialType === 'Insurance').length,
      pending: casesForDate.filter((c) => c.financialType === 'Pending').length,
      free: casesForDate.filter((c) => c.financialType === 'Free / Complimentary').length,
      transfersSent: casesForDate.filter((c) => c.transfer).length,
      open: casesForDate.filter((c) => c.operationalStatus === 'Open').length,
      closed: casesForDate.filter((c) => c.operationalStatus === 'Closed').length,
    }
    return k
  }, [casesForDate])

  const pendingTransfers = useMemo(() => casesForDate.filter((c) => c.transfer && !c.transfer.receivedAt), [casesForDate])
  const receivedTransfers = useMemo(() => casesForDate.filter((c) => c.transfer && c.transfer.receivedAt), [casesForDate])

  return (
    <OperationalShell role="clinic_nurse" active="dashboard"
      identityName={clinicName} identitySub="External Clinic Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-12 max-w-[1500px] mx-auto space-y-5">

        <DemoBanner>
          UI demo — runtime state only. Clinic: <strong>{clinicName}</strong> · Selected Date: <strong>{dateLabel}</strong>. Switch clinics in the top bar; refresh resets all data.
        </DemoBanner>

        {/* ── Dashboard Control Header ─────────────────────────────────── */}
        <header className="p-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-12 h-12 rounded-2xl inline-flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)', color: 'white', boxShadow: 'var(--p-shadow-glow)' }}>
              <Stethoscope className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="p-eyebrow">Clinic Operations Dashboard</div>
              <h1 className="p-h1 text-xl sm:text-2xl lg:text-[26px] mt-0.5 truncate" style={{ color: 'var(--p-ink-900)' }}>
                {clinicName}
              </h1>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>
                Selected Date: <strong style={{ color: 'var(--p-ink-900)' }}>{dateLabel}</strong>
                {longLabel && <> · <span style={{ color: 'var(--p-ink-500)' }}>{longLabel}</span></>}
              </p>
            </div>
          </div>

          {/* Date selector: prev · date input · next · Today */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => moveDay(-1)}
              className="inline-flex items-center gap-1 h-10 w-10 justify-center rounded-full p-btn-ghost" aria-label="Previous day">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
              <input type="date" value={dateYmd} onChange={(e) => setDateYmd(e.target.value)}
                className="p-input h-10 pl-9 pr-3 font-semibold" style={{ minWidth: 170 }} />
            </div>
            <button onClick={() => moveDay(1)}
              className="inline-flex items-center gap-1 h-10 w-10 justify-center rounded-full p-btn-ghost" aria-label="Next day">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={setToday}
              className={cn('inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold',
                dateYmd === TODAY ? 'p-btn-primary' : 'p-btn-ghost')}>
              Today
            </button>
          </div>
        </header>

        {/* ── Quick Actions row ────────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <QuickAction to="/clinic/new-case" icon={Plus} label="Register New Case" tone="teal" primary />
            <QuickAction to="/clinic/attendance" icon={Users} label="Record Attendance" tone="navy" />
            <QuickAction to="/clinic/transfers" icon={Send} label="View Transfers" tone="gold" />
            <QuickAction to="/clinic/treasury" icon={Wallet} label="Treasury / Handover" tone="soft" />
            <QuickAction to="/clinic/daily-report" icon={FileBarChart2} label="Daily Report" tone="soft" />
          </div>
        </section>

        {/* ── KPI grid ─────────────────────────────────────────────────── */}
        <section>
          <SectionHead eyebrow="Selected Date" title="Operational KPIs" description={`All counters below reflect ${dateLabel}.`} />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <Kpi label="Total Cases" value={k.total} tone="navy" icon={Stethoscope} />
            <Kpi label="Cash" value={k.cash} tone="cash" icon={Banknote} />
            <Kpi label="Insurance" value={k.insurance} tone="teal" icon={ShieldCheck} />
            <Kpi label="Pending Class." value={k.pending} tone="pending" />
            <Kpi label="Free / Comp." value={k.free} tone="gold" icon={Gift} />
            <Kpi label="Transfers Sent" value={k.transfersSent} tone="transfer" icon={Send}
              sub={pendingTransfers.length > 0 ? `${pendingTransfers.length} awaiting receipt` : null} />
            <Kpi label="Open Encounters" value={k.open} tone="navy" />
            <Kpi label="Closed / Discharged" value={k.closed} tone="finalized" />
          </div>
        </section>

        {/* ── Operational panels grid ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Panel 1: Selected-date cases table */}
          <section className="p-card p-5 lg:col-span-8">
            <SectionHead eyebrow="Selected Date" title="Cases Snapshot"
              description={`Cases registered at ${clinicName} on ${dateLabel}.`}
              action={
                <Link to="/clinic/cases" className="text-xs font-bold inline-flex items-center gap-1" style={{ color: 'var(--p-teal)' }}>
                  Open My Cases <ArrowRight className="w-3 h-3" />
                </Link>
              } />
            {casesForDate.length === 0 ? (
              <EmptyState icon={TrendingUp}
                title="No cases recorded for this date"
                hint="Pick a different date or register a new case." />
            ) : (
              <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--p-border)' }}>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: 'var(--p-surface-tint)' }}>
                      {['Time', 'OUR Ref', 'Patient', 'Financial', 'Encounter', 'Status', 'Action'].map((h) =>
                        <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {casesForDate.slice(0, 8).map((c) => (
                      <tr key={c.id} style={{ borderTop: '1px solid var(--p-border)' }}>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{fmtHM(c.visitDate)}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{c.ourRef}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold" style={{ color: 'var(--p-ink-900)' }}>{c.patient?.name || '—'}</div>
                          <div className="text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{c.patient?.nationality || '—'}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <FinTypePill type={c.financialType} />
                            {c.billingFacility && <FacilityBadge code={c.billingFacility} size="sm" />}
                          </div>
                        </td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-700)' }}>
                          {c.encounterPattern === 'inpatient_admission' ? 'Inpatient' :
                           c.encounterPattern === 'outpatient_multi' ? 'Multi-Session' :
                           'Single Visit'}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusPill tone={c.operationalStatus === 'Closed' ? 'finalized' : 'navy'}>{c.operationalStatus}</StatusPill>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Link to={`/clinic/cases/${c.id}`}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-[11px] font-bold p-btn-ghost">
                            Open <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Panel 2: Treasury snapshot */}
          <section className="p-card p-5 lg:col-span-4">
            <SectionHead eyebrow="Treasury" title="Cash + Visa Snapshot"
              description="Balances grouped by currency. Visa / Bank tracked separately."
              action={
                <Link to="/clinic/treasury" className="text-xs font-bold inline-flex items-center gap-1" style={{ color: 'var(--p-teal)' }}>
                  Open Treasury <ArrowRight className="w-3 h-3" />
                </Link>
              } />
            {treasury ? (
              <ul className="space-y-2">
                {R1_CURRENCIES.map((cur) => {
                  const b = treasury[cur]
                  if (!b || b.net === 0) return null
                  return (
                    <li key={cur} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--p-surface-tint)' }}>
                      <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--p-ink-700)' }}>
                        <span className="w-8 h-7 rounded-md flex items-center justify-center text-[10px] font-bold"
                              style={{ background: 'white', color: 'var(--p-brand-mid)', border: '1px solid var(--p-border)' }}>{cur}</span>
                        Cash available
                      </span>
                      <span className="text-sm font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmtNum(b.net)} {cur}</span>
                    </li>
                  )
                })}
                {visaBank && (
                  <li className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
                    <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--p-ink-700)' }}>
                      <CreditCard className="w-3.5 h-3.5" /> Visa / Bank pending handover
                    </span>
                    <span className="text-sm font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmtNum(visaBank.pending)} EGP</span>
                  </li>
                )}
              </ul>
            ) : (
              <div className="text-xs" style={{ color: 'var(--p-ink-400)' }}>No treasury record for this clinic.</div>
            )}
          </section>

          {/* Panel 3: Attendance snapshot */}
          <section className="p-card p-5 lg:col-span-6">
            <SectionHead eyebrow="Attendance" title="Today's Shift Coverage"
              description="Nurses on duty + Doctor on duty."
              action={
                <Link to="/clinic/attendance" className="text-xs font-bold inline-flex items-center gap-1" style={{ color: 'var(--p-teal)' }}>
                  Open Attendance <ArrowRight className="w-3 h-3" />
                </Link>
              } />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Kpi label="Active Nurses" value={activeShifts.length} tone="cash" />
              <Kpi label="Closed Shifts" value={closedShifts.length} tone="finalized" />
              <Kpi label="Doctor on Duty" value={onDuty?.doctorId ? '1' : '0'} tone={onDuty?.doctorId ? 'teal' : 'pending'}
                sub={onDuty?.doctorId ? doctorName.split(' ').slice(0, 3).join(' ') : '— pick today'} />
            </div>
            {activeShifts.length === 0 && closedShifts.length === 0 ? (
              <EmptyState icon={Users}
                title="No nurses recorded today"
                hint="Add a nurse shift on the Attendance page." />
            ) : (
              <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--p-border)' }}>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: 'var(--p-surface-tint)' }}>
                      {['Nurse', 'Start', 'End', 'Hours', 'Status'].map((h) =>
                        <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[...activeShifts, ...closedShifts].map((s) => (
                      <tr key={s.id} style={{ borderTop: '1px solid var(--p-border)' }}>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--p-ink-900)' }}>{r1NurseName(s.nurseId)}</td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{fmtHM(s.startedAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{s.endedAt ? fmtHM(s.endedAt) : '—'}</td>
                        <td className="px-3 py-2 p-numeric font-bold" style={{ color: 'var(--p-ink-900)' }}>{shiftHours(s.startedAt, s.endedAt).toFixed(1)}h</td>
                        <td className="px-3 py-2">
                          <StatusPill tone={s.status === 'active' ? 'cash' : 'finalized'}>{s.status === 'active' ? 'On Shift' : 'Closed'}</StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Panel 4: Transfers snapshot */}
          <section className="p-card p-5 lg:col-span-6">
            <SectionHead eyebrow="Transfers" title="Outgoing to Branches"
              description={`Cases from this clinic transferred on ${dateLabel}.`}
              action={
                <Link to="/clinic/transfers" className="text-xs font-bold inline-flex items-center gap-1" style={{ color: 'var(--p-teal)' }}>
                  Open Transfers <ArrowRight className="w-3 h-3" />
                </Link>
              } />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Kpi label="Sent Today" value={k.transfersSent} tone="transfer" />
              <Kpi label="Awaiting Receipt" value={pendingTransfers.length} tone="pending"
                sub={pendingTransfers.length > 0 ? 'Action needed at branch' : null} />
              <Kpi label="Received" value={receivedTransfers.length} tone="finalized" />
            </div>
            {(pendingTransfers.length === 0 && receivedTransfers.length === 0) ? (
              <EmptyState icon={Send}
                title="No transfers on this date"
                hint="Create a new case with a transfer route to populate this list." />
            ) : (
              <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--p-border)' }}>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: 'var(--p-surface-tint)' }}>
                      {['Patient', 'OUR Ref', 'To Branch', 'Receipt'].map((h) =>
                        <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[...pendingTransfers, ...receivedTransfers].slice(0, 6).map((c) => (
                      <tr key={c.id} style={{ borderTop: '1px solid var(--p-border)' }}>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--p-ink-900)' }}>{c.patient?.name}</td>
                        <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{c.ourRef}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--p-ink-700)' }}>{c.transfer?.toBranchName || '—'}</td>
                        <td className="px-3 py-2">
                          {c.transfer?.receivedAt
                            ? <StatusPill tone="finalized">Received</StatusPill>
                            : <StatusPill tone="amber" icon={Clock}>Awaiting</StatusPill>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

      </div>
    </OperationalShell>
  )
}

// =====================================================================
// Helpers
// =====================================================================
function QuickAction({ to, icon: Icon, label, tone = 'soft', primary }) {
  const tones = {
    teal:    { bg: 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)', fg: 'white', iconBg: 'rgba(255,255,255,0.18)', shadow: '0 8px 22px rgba(15,181,169,0.30)' },
    navy:    { bg: 'linear-gradient(135deg, #1E4180 0%, #0A1B3D 100%)', fg: 'white', iconBg: 'rgba(255,255,255,0.16)', shadow: '0 8px 22px rgba(10,27,61,0.28)' },
    gold:    { bg: 'linear-gradient(135deg, #D9A574 0%, #B8854D 100%)', fg: 'white', iconBg: 'rgba(255,255,255,0.16)', shadow: '0 8px 22px rgba(184,133,77,0.26)' },
    soft:    { bg: 'white', fg: 'var(--p-ink-900)', iconBg: 'var(--p-teal-soft)', iconFg: 'var(--p-teal)', shadow: 'var(--p-shadow-card)' },
  }
  const t = tones[tone] || tones.soft
  return (
    <Link to={to} className={cn(
      'group relative overflow-hidden rounded-2xl p-4 flex items-center gap-3 transition-all',
      'hover:-translate-y-px',
    )} style={{
      background: t.bg,
      color: t.fg,
      border: tone === 'soft' ? '1px solid var(--p-border)' : '1px solid rgba(255,255,255,0.12)',
      boxShadow: t.shadow,
      minHeight: 78,
    }}>
      <span className="w-11 h-11 rounded-2xl inline-flex items-center justify-center shrink-0"
        style={{ background: t.iconBg, color: t.iconFg || t.fg }}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold leading-tight">{label}</span>
        {primary && <span className="block text-[11px] opacity-80 mt-0.5">Primary action</span>}
      </span>
      <ArrowRight className="w-4 h-4 opacity-70" />
    </Link>
  )
}

function Kpi({ label, value, sub, tone = 'navy', icon: Icon }) {
  const tones = {
    navy:      { bg: '#E9EFF8', fg: '#1E4180' },
    teal:      { bg: '#E0F8F6', fg: '#0A8F87' },
    cash:      { bg: '#E2F7EE', fg: '#0A8F62' },
    pending:   { bg: '#FBF1DE', fg: '#A1672A' },
    gold:      { bg: '#FBF5EC', fg: '#9A6E36' },
    transfer:  { bg: '#ECE6FA', fg: '#5443A8' },
    finalized: { bg: '#DEF4E5', fg: '#076D4A' },
    mixed:     { bg: '#FBE6E5', fg: '#B14242' },
  }
  const t = tones[tone] || tones.navy
  return (
    <div className="p-card p-3 sm:p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
          <div className="mt-1 text-[22px] sm:text-2xl font-bold p-numeric leading-none" style={{ color: 'var(--p-ink-900)' }}>{value}</div>
          {sub && <div className="mt-1 text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{sub}</div>}
        </div>
        {Icon && (
          <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.fg }}>
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="rounded-xl p-6 text-center" style={{ background: 'var(--p-surface-tint)', border: '1px dashed var(--p-border)' }}>
      {Icon && <Icon className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--p-ink-300)' }} />}
      <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-600)' }}>{title}</div>
      {hint && <div className="text-[11px] mt-1" style={{ color: 'var(--p-ink-400)' }}>{hint}</div>}
    </div>
  )
}

function fmtNum(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}
