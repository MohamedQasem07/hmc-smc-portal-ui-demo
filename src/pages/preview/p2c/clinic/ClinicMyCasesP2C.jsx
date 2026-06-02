import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Stethoscope, Search, Building2, Plus,
  Clock, MapPin, Hotel, Eye, Filter, Calendar, Repeat, BedDouble,
} from 'lucide-react'
import { OperationalShell, IdentityHeader } from '../../../../premium/OperationalShell'
import { SectionHead, DemoBanner, FacilityBadge, FinTypePill, RoutePill } from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import { CaseWarningChips } from '../../../../premium/CaseWarnings'
import { useCaseWarnings } from '../../../../lib/useCaseWarnings'
import { useUserMode } from '../../../../context/UserModeContext'
import { useCasesForClinic } from '../../../../context/DemoStateContext'
import { getClinicName } from '../../../../data/p2c'
import { R1_FINANCIAL_TYPES, R1_TODAY_LABEL, encounterSummary, encounterMeta } from '../../../../data/p2cR1'
import { fmtRelative } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

/* =========================================================================
 * P2C.R1 — External Clinic My Cases (table dashboard)
 * -----------------------------------------------------------------------
 * Replaces the card-stack with a real operational table: full-width on
 * desktop, compact action rows on mobile (NOT oversized cards).
 *
 * Columns (desktop):
 *   Time · Demo Ref · Patient · Nationality · Hotel/Room ·
 *   Financial Type · Route · Destination · Billing Facility ·
 *   Collection / Transfer Status · Operational Status · Action
 *
 * Mobile collapses to two-line rows.
 * ========================================================================= */

const FILTERS = ['All', ...R1_FINANCIAL_TYPES]

export default function ClinicMyCasesP2C() {
  const { clinicId } = useUserMode()
  const clinicName = getClinicName(clinicId)
  const all = useCasesForClinic(clinicId)
  // Pilot Supervision — incompleteness chips, scoped to this clinic (RLS + the
  // useCasesForClinic filter); an operate-as admin sees the same clinic scope.
  const { warningsFor } = useCaseWarnings()

  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const out = { All: all.length }
    for (const f of R1_FINANCIAL_TYPES) {
      out[f] = all.filter((c) => c.financialType === f).length
    }
    return out
  }, [all])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((c) => {
      if (filter !== 'All' && c.financialType !== filter) return false
      if (!q) return true
      const haystack = [
        c.patient.name, c.ourRef, c.patient.nationality,
        c.patient.hotel, c.patient.hotelRoom, c.insurance?.company, c.billingFacility,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [all, filter, query])

  return (
    <OperationalShell role="clinic_nurse" active="cases"
      identityName={clinicName} identitySub="External Clinic Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-5">

        <DemoBanner>
          UI Concept — All cases are placeholders. Showing cases registered at <strong>{clinicName}</strong>. Switch clinics in the top bar.
        </DemoBanner>

        <IdentityHeader
          icon={Stethoscope}
          tone="teal"
          label="My Cases"
          subtitle={`${clinicName} · ${R1_TODAY_LABEL}`}
          action={
            <Link to="/clinic/new-case"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold p-btn-primary">
              <Plus className="w-4 h-4" /> New Case
            </Link>
          }
          badges={
            <>
              <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-bold"
                style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-700)', border: '1px solid var(--p-border)' }}>
                <Building2 className="w-3 h-3" /> {all.length} cases total
              </span>
            </>
          }
        />

        {/* Filter bar */}
        <div className="p-card p-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-500)' }}>
            <Filter className="w-3.5 h-3.5" /> Filter
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border-2 transition-colors"
                style={{
                  background: filter === f ? 'var(--p-teal)' : 'white',
                  color: filter === f ? 'white' : 'var(--p-ink-700)',
                  borderColor: filter === f ? 'var(--p-teal)' : 'var(--p-border)',
                }}>
                {f}
                <span className={cn('ml-0.5 h-4 px-1.5 rounded-full text-[10px] inline-flex items-center', filter === f ? 'bg-white/20' : 'bg-[var(--p-surface-tint)]')}
                  style={filter === f ? { color: 'white' } : { color: 'var(--p-ink-500)' }}>{counts[f] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--p-ink-400)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by patient, ref, hotel, insurer…"
              className="p-input pl-9 h-9" />
          </div>
        </div>

        {/* Desktop table */}
        <section className="hidden md:block p-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
                  {['Time', 'Demo Ref', 'Patient', 'Nationality', 'Hotel / Room', 'Financial', 'Route', 'Destination', 'Facility', 'Encounter', 'Status', 'Op', ''].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-[0.08em] text-[10px]"
                      style={{ color: 'var(--p-ink-500)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-12 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>
                      No cases match this filter.
                    </td>
                  </tr>
                ) : (
                  shown.map((c, i) => (
                    <tr key={c.id}
                      style={{ borderBottom: i < shown.length - 1 ? '1px solid var(--p-border)' : 'none' }}
                      className="hover:bg-[var(--p-surface-tint)] transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>
                        <div className="flex items-center gap-1.5 text-xs"><Clock className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} /> {fmtRelative(c.visitDate)}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--p-ink-500)' }}>{c.ourRef}</td>
                      <td className="px-3 py-3">
                        <div className="font-semibold whitespace-nowrap" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
                        <CaseWarningChips warnings={warningsFor(c)} max={2} className="mt-1" />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{c.patient.nationality || '—'}</td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>
                        {c.patient.hotel ? (
                          <span className="inline-flex items-center gap-1"><Hotel className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} />
                            {c.patient.hotel}{c.patient.hotelRoom ? <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}> / {c.patient.hotelRoom}</span> : null}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap"><FinTypePill type={c.financialType} /></td>
                      <td className="px-3 py-3 whitespace-nowrap"><RoutePill route={c.route} routeLabel={c.routeLabel} /></td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>
                        {c.transfer
                          ? <span className="inline-flex items-center gap-1 text-[11px]"><MapPin className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} />{c.transfer.toBranchName}</span>
                          : <span style={{ color: 'var(--p-ink-400)' }}>—</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {c.billingFacility
                          ? <FacilityBadge code={c.billingFacility} size="sm" />
                          : <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>—</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap"><EncounterCell c={c} /></td>
                      <td className="px-3 py-3 whitespace-nowrap"><StatusCell c={c} /></td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusPill tone={c.operationalStatus === 'Closed' ? 'finalized' : 'navy'}>{c.operationalStatus}</StatusPill>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <Link to={`/clinic/cases/${c.id}`}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold p-btn-ghost">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Mobile compact rows */}
        <section className="md:hidden space-y-2">
          {shown.length === 0 ? (
            <div className="p-card p-6 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>
              No cases match this filter.
            </div>
          ) : (
            shown.map((c) => (
              <Link key={c.id} to={`/clinic/cases/${c.id}`}
                className="block p-card px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
                      <Clock className="w-3 h-3" /> {fmtRelative(c.visitDate)}
                      <span className="font-mono ml-1.5">{c.ourRef}</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold truncate" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
                    <div className="mt-0.5 text-[11px] truncate" style={{ color: 'var(--p-ink-500)' }}>
                      {c.patient.nationality || '—'} · {c.patient.hotel || '—'}{c.patient.hotelRoom ? ` / ${c.patient.hotelRoom}` : ''}
                    </div>
                  </div>
                  {c.billingFacility && <FacilityBadge code={c.billingFacility} size="sm" />}
                </div>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <FinTypePill type={c.financialType} />
                  <RoutePill route={c.route} routeLabel={c.routeLabel} />
                  <StatusPill tone={c.operationalStatus === 'Closed' ? 'finalized' : 'navy'}>{c.operationalStatus}</StatusPill>
                  {c.transfer?.toBranchName && (
                    <span className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--p-ink-500)' }}>
                      <MapPin className="w-3 h-3" /> {c.transfer.toBranchName}
                    </span>
                  )}
                </div>
                <CaseWarningChips warnings={warningsFor(c)} max={3} className="mt-2" />
              </Link>
            ))
          )}
        </section>

        {/* Footer count */}
        <div className="text-center text-[11px]" style={{ color: 'var(--p-ink-400)' }}>
          Showing {shown.length} of {all.length} cases · UI Concept · No backend connected
        </div>

      </div>
    </OperationalShell>
  )
}

function EncounterCell({ c }) {
  const meta = encounterMeta(c.encounterPattern)
  const Icon = c.encounterPattern === 'inpatient_admission' ? BedDouble : c.encounterPattern === 'outpatient_multi' ? Repeat : Calendar
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: 'var(--p-ink-700)' }}>
        <Icon className="w-3 h-3" /> {meta?.short || '—'}
      </span>
      <span className="text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{encounterSummary(c)}</span>
    </div>
  )
}

function StatusCell({ c }) {
  if (c.financialType === 'Cash') {
    return <StatusPill tone={c.settlement === 'Paid' ? 'finalized' : c.settlement === 'Partially Paid' ? 'amber' : 'pending'}>{c.settlement || 'Pending'}</StatusPill>
  }
  if (c.financialType === 'Insurance') {
    return c.hasPatientExcess
      ? <StatusPill tone="teal">Excess: {c.settlement || 'Pending'}</StatusPill>
      : <StatusPill tone="teal">No Excess</StatusPill>
  }
  if (c.financialType === 'Free / Complimentary') {
    return <StatusPill tone="navy">Complimentary</StatusPill>
  }
  if (c.transfer && !c.transfer.receivedAt) return <StatusPill tone="amber">Awaiting Receipt</StatusPill>
  if (c.transfer && c.transfer.receivedAt) return <StatusPill tone="navy">Received</StatusPill>
  return <StatusPill tone="pending">Pending</StatusPill>
}
