import { useMemo, useState } from 'react'
import {
  FileBarChart2, Banknote, ShieldCheck, Gift, Calendar, Repeat,
  BedDouble, Wallet, CreditCard, Users, Receipt, FileText, Building2,
  Stethoscope,
} from 'lucide-react'
import { OperationalShell, IdentityHeader } from '../../../../premium/OperationalShell'
import { SectionHead, DemoBanner, ReportActions, FinTypePill } from '../../../../premium/p2cPrimitives'
import { StatusPill, Avatar } from '../../../../premium/primitives'
import { useUserMode } from '../../../../context/UserModeContext'
import {
  useCasesForClinic, useTreasuryFor, useVisaBankFor, useExpensesFor,
  useHandoversFor, useActiveShifts, useClosedShiftsToday, useDoctorOnDuty,
} from '../../../../context/DemoStateContext'
import { getClinicName } from '../../../../data/p2c'
import {
  R1_TODAY, R1_TODAY_LABEL, R1_CURRENCIES, r1NurseName, r1DoctorName,
  shiftHours, encounterMeta,
} from '../../../../data/p2cR1'
import { IS_SUPABASE } from '../../../../lib/api/config'
import LiveDailyReport from '../live/LiveDailyReport'

/* =========================================================================
 * P2C.R2 — External Clinic Daily Report
 * -----------------------------------------------------------------------
 * Reads from demo-state (R1 seed + runtime). Date selector concept,
 * full KPI/section breakdown, attendance summary, treasury rollup.
 * Print / Export buttons are UI-only concepts.
 * ========================================================================= */

function ClinicDailyReportLive() {
  const { clinicId } = useUserMode()
  const clinicName = getClinicName(clinicId)
  return (
    <OperationalShell role="clinic_nurse" active="report" identityName={clinicName} identitySub="External Clinic Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-12 max-w-[1400px] mx-auto space-y-6">
        <IdentityHeader icon={FileBarChart2} tone="navy" label="Daily Report" subtitle={`${clinicName} · Live Supabase`} />
        <LiveDailyReport scopeNote={`${clinicName} — your clinic's cases & collections only (RLS-scoped).`} />
      </div>
    </OperationalShell>
  )
}

export default function ClinicDailyReportP2C() {
  if (IS_SUPABASE) return <ClinicDailyReportLive />
  const { clinicId } = useUserMode()
  const clinicName = getClinicName(clinicId)
  const all = useCasesForClinic(clinicId)
  const treasury = useTreasuryFor(clinicId)
  const visaBank = useVisaBankFor(clinicId)
  const expenses = useExpensesFor(clinicId)
  const handovers = useHandoversFor(clinicId)
  const activeShifts = useActiveShifts(clinicId)
  const closedShifts = useClosedShiftsToday(clinicId)
  const onDuty = useDoctorOnDuty(clinicId)

  const [date, setDate] = useState(R1_TODAY)

  const dayCases = useMemo(() => all.filter((c) => sameDay(c.visitDate, date)
    || c.sessions?.some((s) => sameDay(s.date, date))
    || sameDay(c.admission?.admittedAt, date) || sameDay(c.admission?.dischargedAt, date)), [all, date])

  const totals = useMemo(() => {
    const sessionsToday = []
    for (const c of all) {
      for (const s of c.sessions || []) {
        if (sameDay(s.date, date) || sameDay(s.checkInAt, date) || sameDay(s.checkOutAt, date)) sessionsToday.push({ caseId: c.id, ...s })
      }
    }
    return {
      total: dayCases.length,
      cash: dayCases.filter((c) => c.financialType === 'Cash').length,
      insurance: dayCases.filter((c) => c.financialType === 'Insurance').length,
      pending: dayCases.filter((c) => c.financialType === 'Pending').length,
      free: dayCases.filter((c) => c.financialType === 'Free / Complimentary').length,
      single: dayCases.filter((c) => c.encounterPattern === 'outpatient_single').length,
      multi: dayCases.filter((c) => c.encounterPattern === 'outpatient_multi').length,
      inpatient: dayCases.filter((c) => c.encounterPattern === 'inpatient_admission').length,
      transfersSent: dayCases.filter((c) => c.transfer).length,
      sessionsToday: sessionsToday.length,
      hmc: dayCases.filter((c) => c.billingFacility === 'HMC').length,
      smc: dayCases.filter((c) => c.billingFacility === 'SMC').length,
    }
  }, [all, dayCases, date])

  const cashByCurrency = useMemo(() => byCurrency(dayCases, 'paymentLines'), [dayCases])
  const excessByCurrency = useMemo(() => byCurrency(dayCases, 'excessLines'), [dayCases])
  const visaByLine = useMemo(() => visaByCurrency(dayCases), [dayCases])
  const expensesByCurrency = useMemo(() => expensesGroup(expenses, date), [expenses, date])

  return (
    <OperationalShell role="clinic_nurse" active="report"
      identityName={clinicName} identitySub="External Clinic Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-6">

        <DemoBanner>
          <strong>Interactive Demo</strong> — Daily Report reads live from this session. Date selector defaults to today.
        </DemoBanner>

        <IdentityHeader
          icon={FileBarChart2} tone="gold"
          label="Daily Report" subtitle={`${clinicName} · ${R1_TODAY_LABEL}`}
          action={
            <div className="flex items-center gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="p-input h-10 w-44" />
              <ReportActions onPrint={() => window.print()} onExport={() => alert('Demo only — no PDF export wired.')} />
            </div>
          }
        />

        {/* KPI strip */}
        <section>
          <SectionHead eyebrow="Activity" title={`Cases on ${date}`} />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <Kpi label="Total"        value={totals.total}     icon={Building2} tone="navy" />
            <Kpi label="Cash"         value={totals.cash}      icon={Banknote}  tone="cash" />
            <Kpi label="Insurance"    value={totals.insurance} icon={ShieldCheck} tone="teal" sub={`${totals.hmc} HMC · ${totals.smc} SMC`} />
            <Kpi label="Pending"      value={totals.pending}   icon={Calendar}  tone="pending" />
            <Kpi label="Free"         value={totals.free}      icon={Gift}      tone="navy" />
            <Kpi label="Single Visit" value={totals.single}    icon={Calendar}  tone="navy" />
            <Kpi label="Multi-Session" value={totals.multi}    icon={Repeat}    tone="teal"  sub={`${totals.sessionsToday} sessions today`} />
            <Kpi label="Inpatient"    value={totals.inpatient} icon={BedDouble} tone="mixed" />
          </div>
        </section>

        {/* Collections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="p-card p-5 lg:col-span-7 space-y-3">
            <SectionHead eyebrow="Cash" title="Collections by Currency"
              description="Cash Invoice (incl. on transferred cases pre-paid here) + Patient Excess." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {R1_CURRENCIES.map((cur) => {
                const inv = cashByCurrency[cur] || 0
                const exc = excessByCurrency[cur] || 0
                if (inv === 0 && exc === 0) return null
                return (
                  <div key={cur} className="rounded-xl px-3 py-2.5"
                    style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>{cur}</span>
                      <span className="text-sm font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmt(inv + exc)} {cur}</span>
                    </div>
                    <div className="text-[11px] mt-1 flex justify-between" style={{ color: 'var(--p-ink-500)' }}>
                      <span>Cash Invoice: <strong>{fmt(inv)}</strong></span>
                      <span>Excess: <strong>{fmt(exc)}</strong></span>
                    </div>
                  </div>
                )
              })}
              {Object.values(cashByCurrency).every((v) => !v) && Object.values(excessByCurrency).every((v) => !v) && (
                <div className="text-sm text-center py-6 sm:col-span-2" style={{ color: 'var(--p-ink-400)' }}>No collections on this date.</div>
              )}
            </div>
          </section>

          <section className="p-card p-5 lg:col-span-5 space-y-3">
            <SectionHead eyebrow="Bank" title="Visa / Bank — EGP" />
            <div className="space-y-2">
              <div className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
                <span className="inline-flex items-center gap-2">
                  <span className="w-8 h-8 rounded-md inline-flex items-center justify-center"
                    style={{ background: 'white', color: 'var(--p-brand-mid)' }}>
                    <CreditCard className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-brand-mid)' }}>Total Movements</div>
                    <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{visaByLine.count} movements on this date</div>
                  </div>
                </span>
                <span className="text-sm font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmt(visaByLine.total)} EGP</span>
              </div>
              {visaBank && (
                <div className="text-[11px] flex justify-between rounded-xl px-3 py-2"
                  style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-700)' }}>
                  <span>Confirmed in Handover: <strong>{fmt(visaBank.confirmedInHandover)} EGP</strong></span>
                  <span>Pending: <strong>{fmt(visaBank.pending)} EGP</strong></span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Expenses + Treasury net + Handover */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="p-card p-5 lg:col-span-4 space-y-3">
            <SectionHead eyebrow="Expenses" title="By Currency (this date)"
              description="External clinic expenses only." />
            {Object.keys(expensesByCurrency).length === 0 ? (
              <div className="text-sm text-center py-6" style={{ color: 'var(--p-ink-400)' }}>No expenses on this date.</div>
            ) : Object.entries(expensesByCurrency).map(([cur, val]) => (
              <div key={cur} className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>{cur}</span>
                <span className="text-sm font-bold p-numeric" style={{ color: 'var(--p-mixed)' }}>−{fmt(val)} {cur}</span>
              </div>
            ))}
          </section>

          <section className="p-card p-5 lg:col-span-4 space-y-3">
            <SectionHead eyebrow="Treasury" title="Net Available to Hand Over" />
            {treasury && R1_CURRENCIES.map((cur) => {
              const b = treasury[cur]
              if (!b || b.net === 0) return null
              return (
                <div key={cur} className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                  style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>{cur}</span>
                  <span className="text-sm font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{fmt(b.net)} {cur}</span>
                </div>
              )
            })}
          </section>

          <section className="p-card p-5 lg:col-span-4 space-y-3">
            <SectionHead eyebrow="Handover" title="Period Status" />
            {handovers.length === 0 ? (
              <div className="text-sm text-center py-6" style={{ color: 'var(--p-ink-400)' }}>No handover periods recorded.</div>
            ) : handovers.map((h) => (
              <div key={h.id} className="rounded-xl px-3 py-2.5"
                style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>{h.status}</span>
                  <StatusPill tone={h.status === 'Closed' ? 'finalized' : 'amber'}>{h.status}</StatusPill>
                </div>
                <div className="text-[11px] mt-1" style={{ color: 'var(--p-ink-500)' }}>by {h.handedOverBy}</div>
              </div>
            ))}
          </section>
        </div>

        {/* Attendance */}
        <section className="p-card p-5 space-y-3">
          <SectionHead eyebrow="Attendance" title="Nurses Worked + Doctor on Duty" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--p-ink-500)' }}>Nurses ({activeShifts.length} active · {closedShifts.length} closed)</div>
              <div className="space-y-1.5">
                {[...activeShifts, ...closedShifts].length === 0 ? (
                  <div className="text-sm text-center py-4" style={{ color: 'var(--p-ink-400)' }}>No nurse shifts recorded.</div>
                ) : [...activeShifts, ...closedShifts].map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl px-3 py-2"
                    style={{ background: 'var(--p-surface-tint)' }}>
                    <Avatar name={r1NurseName(s.nurseId)} size={28} tone="navy" />
                    <span className="text-sm font-semibold flex-1" style={{ color: 'var(--p-ink-900)' }}>{r1NurseName(s.nurseId)}</span>
                    <span className="text-xs p-numeric font-bold" style={{ color: 'var(--p-ink-700)' }}>
                      {fmtTime(s.startedAt)} – {s.endedAt ? fmtTime(s.endedAt) : 'present'}
                    </span>
                    <span className="text-xs p-numeric font-bold" style={{ color: 'var(--p-ink-900)' }}>{shiftHours(s.startedAt, s.endedAt).toFixed(1)}h</span>
                    <StatusPill tone={s.status === 'closed' ? 'finalized' : 'cash'}>{s.status === 'closed' ? 'Closed' : 'Active'}</StatusPill>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--p-ink-500)' }}>Doctor on Duty</div>
              <div className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: 'var(--p-teal-soft)', border: '1px solid #A6E2DC' }}>
                <Avatar name={onDuty ? r1DoctorName(onDuty.doctorId) : 'Demo Doctor'} size={36} tone="teal" />
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: '#0A8F87' }}>Today</div>
                  <div className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{onDuty ? r1DoctorName(onDuty.doctorId) : '— Not yet selected —'}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="text-center text-[11px]" style={{ color: 'var(--p-ink-400)' }}>
          UI Concept · No backend connected · Print / Export PDF are placeholders
        </div>
      </div>
    </OperationalShell>
  )
}

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

function sameDay(iso, ymd) {
  if (!iso) return false
  return iso.slice(0, 10) === ymd
}
function byCurrency(cases, listKey) {
  const out = {}
  for (const c of cases) {
    for (const l of c[listKey] || []) {
      const amt = Number(l.actualAmount ?? l.amount) || 0
      if (!amt || l.method === 'Visa / Card') continue
      const cur = l.actualCurrency || l.currency || 'EGP'
      out[cur] = (out[cur] || 0) + amt
    }
  }
  return out
}
function visaByCurrency(cases) {
  let total = 0, count = 0
  for (const c of cases) {
    for (const l of [...(c.paymentLines || []), ...(c.excessLines || [])]) {
      if (l.method !== 'Visa / Card') continue
      const amt = Number(l.actualAmount ?? l.amount) || 0
      if (!amt) continue
      total += amt
      count += 1
    }
  }
  return { total, count }
}
function expensesGroup(expenses, ymd) {
  const out = {}
  for (const e of expenses) {
    if (e.at?.slice(0, 10) !== ymd) continue
    out[e.currency] = (out[e.currency] || 0) + Number(e.amount || 0)
  }
  return out
}
function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
