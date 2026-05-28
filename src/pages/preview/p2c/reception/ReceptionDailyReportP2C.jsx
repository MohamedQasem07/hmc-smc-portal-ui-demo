import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  FileBarChart2, Banknote, ShieldCheck, Gift, Calendar, Repeat, BedDouble,
  Inbox, Heart, Scissors, CreditCard, Hotel, Building2,
} from 'lucide-react'
import { OperationalShell, IdentityHeader } from '../../../../premium/OperationalShell'
import { SectionHead, DemoBanner, ReportActions } from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import {
  useCasesForBranch, useIncomingTransfers, useRoomBoard, useCaseAggregates,
  useTreasuryFor, useVisaBankFor, useHandoversFor,
} from '../../../../context/DemoStateContext'
import {
  R1_TODAY, R1_TODAY_LABEL, R1_CURRENCIES,
} from '../../../../data/p2cR1'

/* =========================================================================
 * P2C.R2 — Branch Daily Report
 * ========================================================================= */

function branchConfig(slug) {
  if (slug === 'al-kawther') return { id: 'al_kawther', name: 'Al-Kawther Branch', role: 'reception_kawther' }
  return { id: 'sheraton', name: 'Sheraton Branch', role: 'reception_sheraton' }
}

export default function ReceptionDailyReportP2C() {
  const { branchSlug } = useParams()
  const { id: branchId, name: branchName, role } = branchConfig(branchSlug)
  const all = useCasesForBranch(branchId)
  const incoming = useIncomingTransfers(branchId, { includeReceived: true })
  const board = useRoomBoard(branchId)
  const kpis = useCaseAggregates(branchId)
  const treasury = useTreasuryFor(branchId)
  const visaBank = useVisaBankFor(branchId)
  const handovers = useHandoversFor(branchId)

  const [date, setDate] = useState(R1_TODAY)

  const dayCases = useMemo(() => all.filter((c) =>
    sameDay(c.visitDate, date)
    || c.sessions?.some((s) => sameDay(s.date, date))
    || sameDay(c.admission?.admittedAt, date) || sameDay(c.admission?.dischargedAt, date)
  ), [all, date])

  const totals = useMemo(() => {
    const sessionsToday = []
    for (const c of all) {
      for (const s of c.sessions || []) {
        if (sameDay(s.date, date) || sameDay(s.checkInAt, date)) sessionsToday.push(s)
      }
    }
    return {
      direct: dayCases.filter((c) => c.registeredAtKind === 'branch').length,
      transfersReceived: incoming.filter((c) => c.transfer?.receivedAt && sameDay(c.transfer.receivedAt, date)).length,
      transfersPending: incoming.filter((c) => !c.transfer?.receivedAt).length,
      admitted: dayCases.filter((c) => sameDay(c.admission?.admittedAt, date)).length,
      discharged: dayCases.filter((c) => sameDay(c.admission?.dischargedAt, date)).length,
      single: dayCases.filter((c) => c.encounterPattern === 'outpatient_single').length,
      multi:  dayCases.filter((c) => c.encounterPattern === 'outpatient_multi').length,
      inpatient: dayCases.filter((c) => c.encounterPattern === 'inpatient_admission').length,
      sessionsToday: sessionsToday.length,
      cash: dayCases.filter((c) => c.financialType === 'Cash').length,
      insurance: dayCases.filter((c) => c.financialType === 'Insurance').length,
      pending: dayCases.filter((c) => c.financialType === 'Pending').length,
      free: dayCases.filter((c) => c.financialType === 'Free / Complimentary').length,
      conservative: dayCases.filter((c) => c.treatmentMode === 'conservative').length,
      surgical: dayCases.filter((c) => c.treatmentMode === 'surgical').length,
      hmc: dayCases.filter((c) => c.billingFacility === 'HMC').length,
      smc: dayCases.filter((c) => c.billingFacility === 'SMC').length,
    }
  }, [all, dayCases, incoming, date])

  const cashByCurrency   = useMemo(() => byCurrency(dayCases, 'paymentLines'), [dayCases])
  const excessByCurrency = useMemo(() => byCurrency(dayCases, 'excessLines'),  [dayCases])
  const visaByLine       = useMemo(() => visaByCurrency(dayCases), [dayCases])

  return (
    <OperationalShell role={role} active="report"
      identityName={branchName} identitySub="Reception & Rooms Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-6">

        <DemoBanner>
          <strong>Interactive Demo</strong> — branch daily report reads live demo state.
        </DemoBanner>

        <IdentityHeader
          icon={FileBarChart2} tone="gold"
          label="Daily Report" subtitle={`${branchName} · ${R1_TODAY_LABEL}`}
          action={
            <div className="flex items-center gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="p-input h-10 w-44" />
              <ReportActions onPrint={() => window.print()} onExport={() => alert('Demo only — no PDF export wired.')} />
            </div>
          }
        />

        {/* KPIs */}
        <section>
          <SectionHead eyebrow="Activity" title={`Activity on ${date}`} />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <Kpi label="Direct Cases"        value={totals.direct}            icon={Building2} tone="navy" />
            <Kpi label="Transfers Received"  value={totals.transfersReceived} icon={Inbox} tone="cash" sub={`${totals.transfersPending} pending`} />
            <Kpi label="Rooms Occupied"      value={kpis.occupied}            icon={Hotel} tone="teal" sub={`${kpis.available} available`} />
            <Kpi label="Pending Room"        value={kpis.waiting}             icon={Calendar} tone="pending" />
            <Kpi label="Admitted Today"      value={totals.admitted}          icon={BedDouble} tone="mixed" sub={`${totals.discharged} discharged`} />
            <Kpi label="Single Visit"        value={totals.single}            icon={Calendar} tone="navy" />
            <Kpi label="Multi-Session"       value={totals.multi}             icon={Repeat} tone="teal" sub={`${totals.sessionsToday} sessions today`} />
            <Kpi label="Conservative / Surgical" value={`${totals.conservative} / ${totals.surgical}`} icon={Heart} tone="teal" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <Kpi label="Cash"        value={totals.cash}      icon={Banknote} tone="cash" />
            <Kpi label="Insurance"   value={totals.insurance} icon={ShieldCheck} tone="teal" sub={`${totals.hmc} HMC · ${totals.smc} SMC`} />
            <Kpi label="Pending Fin." value={totals.pending}  icon={Calendar} tone="pending" />
            <Kpi label="Free"        value={totals.free}      icon={Gift} tone="navy" />
          </div>
        </section>

        {/* Collections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="p-card p-5 lg:col-span-7 space-y-3">
            <SectionHead eyebrow="Cash" title="Collections by Currency" />
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
                <span>Confirmed: <strong>{fmt(visaBank.confirmedInHandover)} EGP</strong></span>
                <span>Pending: <strong>{fmt(visaBank.pending)} EGP</strong></span>
              </div>
            )}
          </section>
        </div>

        {/* Treasury + Handover */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="p-card p-5 lg:col-span-6 space-y-3">
            <SectionHead eyebrow="Treasury" title="Branch Net Available" />
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

          <section className="p-card p-5 lg:col-span-6 space-y-3">
            <SectionHead eyebrow="Handover" title="Period Status" />
            {handovers.length === 0 ? (
              <div className="text-sm text-center py-6" style={{ color: 'var(--p-ink-400)' }}>No handover periods.</div>
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

        <div className="text-center text-[11px]" style={{ color: 'var(--p-ink-400)' }}>
          UI Concept · No backend connected · Print / Export PDF are placeholders
        </div>
      </div>
    </OperationalShell>
  )
}

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
        {Icon && <span className="w-7 h-7 rounded-md inline-flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.fg }}><Icon className="w-3.5 h-3.5" /></span>}
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
      total += amt; count += 1
    }
  }
  return { total, count }
}
function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}
