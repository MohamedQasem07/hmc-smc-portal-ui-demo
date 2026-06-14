import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Building2, Search, Filter, Clock, Hotel, MapPin, Eye,
  Calendar, Repeat, BedDouble, Heart, Scissors,
} from 'lucide-react'
import { OperationalShell, IdentityHeader, receptionRoute } from '../../../../premium/OperationalShell'
import {
  SectionHead, DemoBanner, FacilityBadge, FinTypePill, RoutePill,
} from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import { CaseWarningChips } from '../../../../premium/CaseWarnings'
import { useCaseWarnings } from '../../../../lib/useCaseWarnings'
import { useCasesForBranch } from '../../../../context/DemoStateContext'
import {
  R1_FINANCIAL_TYPES, R1_TODAY_LABEL, encounterMeta, encounterSummary,
} from '../../../../data/p2cR1'
import { fmtRelative } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

/* =========================================================================
 * P2C.R2 — Branch Cases (full operational table)
 * -----------------------------------------------------------------------
 * Direct cases + received transfers for the branch, with full-width table
 * showing the operational columns needed by the reception team.
 * ========================================================================= */

function branchConfig(slug) {
  if (slug === 'al-kawther') return { id: 'al_kawther', name: 'Al-Kawther Branch', role: 'reception_kawther' }
  return { id: 'sheraton', name: 'Sheraton Branch', role: 'reception_sheraton' }
}

const FILTERS = ['All', ...R1_FINANCIAL_TYPES]
const ENC_FILTERS = ['All', 'Single Visit', 'Multi-Session', 'Inpatient']

export default function ReceptionBranchCasesP2C() {
  const { branchSlug } = useParams()
  const { id: branchId, name: branchName, role } = branchConfig(branchSlug)
  const all = useCasesForBranch(branchId)
  // Pilot Supervision — incompleteness chips, scoped to this branch (RLS + the
  // useCasesForBranch filter); an operate-as admin sees the same branch scope.
  const { warningsFor } = useCaseWarnings()

  const [filter, setFilter] = useState('All')
  const [enc, setEnc] = useState('All')
  const [status, setStatus] = useState('Active')   // P3U — default hides closed/finished cases
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const out = { All: all.length }
    for (const f of R1_FINANCIAL_TYPES) out[f] = all.filter((c) => c.financialType === f).length
    return out
  }, [all])
  const statusCounts = useMemo(() => ({
    Active: all.filter((c) => c.operationalStatus !== 'Closed').length,
    All: all.length,
    Closed: all.filter((c) => c.operationalStatus === 'Closed').length,
  }), [all])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((c) => {
      const closed = c.operationalStatus === 'Closed'
      if (status === 'Active' && closed) return false
      if (status === 'Closed' && !closed) return false
      if (filter !== 'All' && c.financialType !== filter) return false
      if (enc !== 'All') {
        const m = encounterMeta(c.encounterPattern)
        if ((m?.short || '') !== enc) return false
      }
      if (q) {
        const haystack = [
          c.patient.name, c.ourRef, c.patient.nationality,
          c.patient.hotel, c.patient.hotelRoom, c.insurance?.company, c.billingFacility,
          c.registeredAtName,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [all, filter, enc, status, query])

  return (
    <OperationalShell role={role} active="cases"
      identityName={branchName} identitySub="Reception & Rooms Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-5">

        <DemoBanner>
          <strong>Interactive Demo</strong> — direct cases + received transfers (live in this session).
        </DemoBanner>

        <IdentityHeader
          icon={Building2} tone="gold"
          label="Branch Cases" subtitle={`${branchName} · ${R1_TODAY_LABEL}`}
          badges={<StatusPill tone="navy">{all.length} cases</StatusPill>}
        />

        <div className="p-card p-3 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-500)' }}>
            <Filter className="w-3.5 h-3.5" /> Filter
          </div>
          <Chips label="Status" value={status} setValue={setStatus} options={['Active', 'All', 'Closed']} counts={statusCounts} />
          <Chips label="Fin" value={filter} setValue={setFilter} options={FILTERS} counts={counts} />
          <Chips label="Encounter" value={enc} setValue={setEnc} options={ENC_FILTERS} />
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--p-ink-400)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by patient, ref, hotel, insurer, origin clinic…" className="p-input pl-9 h-9" />
          </div>
        </div>

        <section className="hidden md:block p-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
                  {['Time', 'Demo Ref', 'Patient', 'Origin', 'Hotel / Room', 'Center Room', 'Financial', 'Facility', 'Encounter', 'Treatment', 'Status', ''].map((h) =>
                    <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr><td colSpan={12} className="px-3 py-12 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No cases match these filters.</td></tr>
                ) : shown.map((c, i) => (
                  <tr key={c.id}
                    style={{ borderBottom: i < shown.length - 1 ? '1px solid var(--p-border)' : 'none' }}
                    className="hover:bg-[var(--p-surface-tint)] transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>
                      <span className="inline-flex items-center gap-1.5 text-xs"><Clock className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} /> {fmtRelative(c.visitDate)}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--p-ink-500)' }}>{c.ourRef}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold whitespace-nowrap" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
                      <CaseWarningChips warnings={warningsFor(c)} max={2} className="mt-1" />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{c.registeredAtName}</td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>
                      <span className="inline-flex items-center gap-1"><Hotel className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} />
                        {c.patient.hotel || '—'}{c.patient.hotelRoom ? <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}> / {c.patient.hotelRoom}</span> : null}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {c.centerRoomNumber
                        ? <span className="inline-flex items-center gap-1 px-2 h-6 rounded-md text-[11px] font-bold"
                            style={{ background: 'var(--p-teal-soft)', color: '#0A8F87' }}>
                            <BedDouble className="w-3 h-3" /> Room {String(c.centerRoomNumber).padStart(2, '0')}
                          </span>
                        : <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>—</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><FinTypePill type={c.financialType} /></td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {c.billingFacility ? <FacilityBadge code={c.billingFacility} size="sm" /> : <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>—</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><EncounterCell c={c} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><TreatmentCell c={c} /></td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusPill tone={c.operationalStatus === 'Closed' ? 'finalized' : 'navy'}>{c.operationalStatus}</StatusPill>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      <Link to={`${receptionRoute(role, 'cases')}/${c.id}`}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold p-btn-ghost">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="md:hidden space-y-2">
          {shown.length === 0 ? (
            <div className="p-card p-6 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No cases match.</div>
          ) : shown.map((c) => (
            <Link key={c.id} to={`${receptionRoute(role, 'cases')}/${c.id}`} className="block p-card px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] inline-flex items-center gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
                    <Clock className="w-3 h-3" /> {fmtRelative(c.visitDate)} <span className="font-mono ml-1.5">{c.ourRef}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold truncate" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--p-ink-500)' }}>
                    {c.registeredAtName} · {c.patient.hotel || '—'}{c.patient.hotelRoom ? ` / ${c.patient.hotelRoom}` : ''}
                    {c.centerRoomNumber ? ` · Room ${String(c.centerRoomNumber).padStart(2, '0')}` : ''}
                  </div>
                </div>
                {c.billingFacility && <FacilityBadge code={c.billingFacility} size="sm" />}
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <FinTypePill type={c.financialType} />
                <EncounterCell c={c} />
                <TreatmentCell c={c} />
              </div>
              <CaseWarningChips warnings={warningsFor(c)} max={3} className="mt-2" />
            </Link>
          ))}
        </section>

      </div>
    </OperationalShell>
  )
}

function Chips({ label, value, setValue, options, counts }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</span>
      {options.map((o) => (
        <button key={o} onClick={() => setValue(o)}
          className="h-7 px-2.5 rounded-full text-[11px] font-semibold border-2 transition-colors inline-flex items-center gap-1"
          style={value === o
            ? { background: 'var(--p-teal)', borderColor: 'var(--p-teal)', color: 'white' }
            : { background: 'white', borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }}>
          {o}{counts && counts[o] != null && <span className={cn('opacity-75')}>{counts[o]}</span>}
        </button>
      ))}
    </div>
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

function TreatmentCell({ c }) {
  if (!c.treatmentMode || c.treatmentMode === 'pending') {
    return <StatusPill tone="pending"><Clock className="w-3 h-3" /> TBD</StatusPill>
  }
  return c.treatmentMode === 'surgical'
    ? <StatusPill tone="mixed"><Scissors className="w-3 h-3" /> Surgical</StatusPill>
    : <StatusPill tone="teal"><Heart className="w-3 h-3" /> Conservative</StatusPill>
}
