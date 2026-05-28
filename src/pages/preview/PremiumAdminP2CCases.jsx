import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Send, Filter, ChevronRight, Clock, CheckCircle2, MapPin,
  ShieldCheck, AlertTriangle, Hotel, BedDouble, Heart, Scissors,
  Calendar, Repeat,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import { FacilityBadge, FinTypePill, RoutePill, SectionHead, DemoBanner } from '../../premium/p2cPrimitives'
import { StatusPill, Avatar } from '../../premium/primitives'
import {
  EXTERNAL_CLINICS, RECEIVING_BRANCHES,
} from '../../data/p2c'
import { useCases } from '../../context/DemoStateContext'
import {
  R1_FINANCIAL_TYPES, encounterMeta, encounterSummary,
} from '../../data/p2cR1'
import { fmtRelative, fmtDate } from '../../lib/format'

/* =========================================================================
 * Admin — Clinic & Reception Cases Overview (read-only)
 * Full visibility across all external clinics + both branches.
 * Filters by clinic, financial type, route, transfer status.
 * ========================================================================= */

const ALL_SOURCES = [
  { id: 'all',           label: 'All Sources' },
  ...EXTERNAL_CLINICS.map((c) => ({ id: c.id, label: c.name })),
  ...RECEIVING_BRANCHES.map((b) => ({ id: b.id, label: b.name })),
]

const TRANSFER_FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'direct',   label: 'Direct Only' },
  { id: 'transfer', label: 'Transfers Only' },
  { id: 'pending',  label: 'Awaiting Receipt' },
]

export default function PremiumAdminP2CCases() {
  const [sourceFilter, setSourceFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('All')
  const [transferFilter, setTransferFilter] = useState('all')

  const allCases = useCases()

  const filtered = allCases.filter((c) => {
    if (sourceFilter !== 'all' && c.registeredAtId !== sourceFilter &&
        !(c.transfer && c.transfer.toBranchId === sourceFilter)) return false
    if (typeFilter !== 'All' && c.financialType !== typeFilter) return false
    if (transferFilter === 'direct' && c.route !== 'direct') return false
    if (transferFilter === 'transfer' && c.route === 'direct') return false
    if (transferFilter === 'pending' && !(c.transfer && !c.transfer.receivedAt)) return false
    return true
  })

  const pendingCount = allCases.filter((c) => c.transfer && !c.transfer.receivedAt).length
  const pendingFinType = allCases.filter((c) => c.financialType === 'Pending').length
  const inpatientCount = allCases.filter((c) => c.encounterPattern === 'inpatient_admission' && c.admission && !c.admission.dischargedAt).length
  const noRoomYet = allCases.filter((c) =>
    (c.transfer && c.transfer.receivedAt && !c.centerRoomNumber && c.operationalStatus === 'Open')
    || (c.registeredAtKind === 'branch' && c.encounterPattern === 'inpatient_admission' && !c.centerRoomNumber && c.operationalStatus === 'Open')
  ).length

  return (
    <AdminShell active="p2c-cases">
      <div className="px-5 md:px-8 lg:px-10 pt-6 pb-16 max-w-[1200px] mx-auto space-y-6">

        <DemoBanner>
          Admin read-only view of Clinic &amp; Reception P2C demo cases. No backend — all data is mock.
        </DemoBanner>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="p-eyebrow mb-1">Clinic &amp; Reception</div>
            <h1 className="p-h1 text-2xl sm:text-3xl" style={{ color: 'var(--p-ink-900)' }}>All P2C Cases</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--p-ink-500)' }}>
              Cross-clinic visibility — every external clinic + both branches.
            </p>
          </div>
          <Link to="/design-preview/demo-roles"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold p-btn-ghost">
            Switch to Clinic / Reception role →
          </Link>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Cases (live)',     value: allCases.length,   color: 'var(--p-brand-mid)' },
            { label: 'Pending Classification', value: pendingFinType,    color: '#A1672A' },
            { label: 'Awaiting Receipt',       value: pendingCount,      color: '#5443A8' },
            { label: 'Inpatient + No Room',    value: noRoomYet,         color: '#B14242' },
          ].map((k) => (
            <div key={k.label} className="p-card p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{k.label}</div>
              <div className="text-3xl font-bold p-numeric mt-1" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="p-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--p-ink-500)' }}>
            <Filter className="w-3.5 h-3.5" /> Filters
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Source */}
            <div className="flex flex-wrap gap-1.5">
              {ALL_SOURCES.map((s) => (
                <button key={s.id} onClick={() => setSourceFilter(s.id)}
                  className="h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors"
                  style={{
                    background: sourceFilter === s.id ? 'var(--p-brand-mid)' : 'white',
                    color: sourceFilter === s.id ? 'white' : 'var(--p-ink-600)',
                    borderColor: sourceFilter === s.id ? 'var(--p-brand-mid)' : 'var(--p-border)',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Financial type */}
            {['All', ...R1_FINANCIAL_TYPES].map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className="h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors"
                style={{
                  background: typeFilter === t ? 'var(--p-teal)' : 'white',
                  color: typeFilter === t ? 'white' : 'var(--p-ink-600)',
                  borderColor: typeFilter === t ? 'var(--p-teal)' : 'var(--p-border)',
                }}>
                {t}
              </button>
            ))}
            <span className="w-px h-7 self-center" style={{ background: 'var(--p-border)' }} />
            {TRANSFER_FILTERS.map((f) => (
              <button key={f.id} onClick={() => setTransferFilter(f.id)}
                className="h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors"
                style={{
                  background: transferFilter === f.id ? 'var(--p-transfer-soft)' : 'white',
                  color: transferFilter === f.id ? '#5443A8' : 'var(--p-ink-600)',
                  borderColor: transferFilter === f.id ? '#C4BEEA' : 'var(--p-border)',
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cases table */}
        <section>
          <SectionHead
            eyebrow={`${filtered.length} case${filtered.length !== 1 ? 's' : ''}`}
            title="Case List"
          />

          {filtered.length === 0 ? (
            <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-500)' }}>
              No cases match the selected filters.
            </div>
          ) : (
            <div className="p-card overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--p-border)', background: 'var(--p-surface-tint)' }}>
                      {['Ref', 'Patient', 'Source', 'Hotel / Rm', 'Center Rm', 'Route', 'Financial', 'Facility', 'Encounter', 'Treatment', 'Transfer', 'Op'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap"
                            style={{ color: 'var(--p-ink-500)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={c.id}
                          style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--p-border)' : 'none' }}
                          className="hover:bg-[var(--p-surface-tint)] transition-colors">
                        <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: 'var(--p-ink-400)' }}>
                          {c.ourRef}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={c.patient.name} size={24} tone="navy" />
                            <div>
                              <div className="font-semibold" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
                              <div className="text-[10px]" style={{ color: 'var(--p-ink-400)' }}>{c.patient.nationality} · {c.patient.age}y</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--p-ink-600)' }}>
                          {c.registeredAtName}
                        </td>
                        <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--p-ink-700)' }}>
                          <span className="inline-flex items-center gap-1"><Hotel className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} />
                            {c.patient.hotel || '—'}{c.patient.hotelRoom ? ` / ${c.patient.hotelRoom}` : ''}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {c.centerRoomNumber
                            ? <span className="inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-bold"
                                style={{ background: 'var(--p-teal-soft)', color: '#0A8F87' }}>
                                <BedDouble className="w-3 h-3" /> {String(c.centerRoomNumber).padStart(2, '0')}
                              </span>
                            : <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <RoutePill route={c.route} routeLabel={c.routeLabel} />
                        </td>
                        <td className="px-3 py-2.5">
                          <FinTypePill type={c.financialType} />
                        </td>
                        <td className="px-3 py-2.5">
                          {c.billingFacility
                            ? <FacilityBadge code={c.billingFacility} size="sm" />
                            : <span style={{ color: 'var(--p-ink-300)' }}>—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <AdminEncounterCell c={c} />
                        </td>
                        <td className="px-3 py-2.5">
                          <AdminTreatmentCell c={c} />
                        </td>
                        <td className="px-3 py-2.5">
                          {c.transfer ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                              {c.transfer.receivedAt
                                ? <><CheckCircle2 className="w-3 h-3 text-[#0A8F62]" /> {c.transfer.status}</>
                                : <><Clock className="w-3 h-3 text-[#A1672A]" /> Awaiting</>}
                            </span>
                          ) : (
                            <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>Direct</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <StatusPill tone={c.operationalStatus === 'Closed' ? 'finalized' : 'navy'}>
                              {c.operationalStatus}
                            </StatusPill>
                            {c.hasPatientExcess && !c.settlement && <Clock className="w-3 h-3" style={{ color: '#A1672A' }} title="Excess pending" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y" style={{ borderColor: 'var(--p-border)' }}>
                {filtered.map((c) => (
                  <div key={c.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
                        <div className="text-[11px] font-mono" style={{ color: 'var(--p-ink-400)' }}>{c.ourRef}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{c.registeredAtName}</div>
                      </div>
                      {c.billingFacility && <FacilityBadge code={c.billingFacility} size="sm" />}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <FinTypePill type={c.financialType} />
                      <RoutePill route={c.route} routeLabel={c.routeLabel} />
                      <StatusPill tone={c.operationalStatus === 'Closed' ? 'finalized' : 'navy'}>
                        {c.operationalStatus}
                      </StatusPill>
                    </div>
                    {c.transfer && (
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: c.transfer.receivedAt ? '#0A8F62' : '#A1672A' }}>
                        {c.transfer.receivedAt
                          ? <><CheckCircle2 className="w-3 h-3" /> Received at {c.transfer.toBranchName}</>
                          : <><Clock className="w-3 h-3" /> Awaiting receipt at {c.transfer.toBranchName}</>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Pending attention */}
        {(pendingFinType > 0 || pendingCount > 0 || noRoomYet > 0) && (
          <section>
            <SectionHead eyebrow="Needs Attention" title="Operational Alerts" />
            <div className="space-y-2">
              {allCases.filter((c) => c.financialType === 'Pending').map((c) => (
                <AttentionRow key={`pend-${c.id}`} c={c} reason="Pending financial type classification" tone="pending" />
              ))}
              {allCases.filter((c) => c.transfer && !c.transfer.receivedAt).map((c) => (
                <AttentionRow key={`recv-${c.id}`} c={c} reason={`Awaiting receipt at ${c.transfer.toBranchName}`} tone="transfer" />
              ))}
              {allCases.filter((c) =>
                (c.transfer && c.transfer.receivedAt && !c.centerRoomNumber && c.operationalStatus === 'Open')
                || (c.registeredAtKind === 'branch' && c.encounterPattern === 'inpatient_admission' && !c.centerRoomNumber && c.operationalStatus === 'Open')
              ).map((c) => (
                <AttentionRow key={`room-${c.id}`} c={c} reason="Received without Center Room assignment" tone="mixed" />
              ))}
            </div>
          </section>
        )}

        <div className="text-center text-[11px]" style={{ color: 'var(--p-ink-400)' }}>
          Demo data only — no real patients, no real financial data. P2C prototype view.
        </div>
      </div>
    </AdminShell>
  )
}

function AttentionRow({ c, reason, tone }) {
  const styles = {
    pending:  { bg: 'var(--p-pending-soft)',  fg: '#A1672A',  border: '#F0C97A' },
    transfer: { bg: 'var(--p-transfer-soft)', fg: '#5443A8',  border: '#C4BEEA' },
    mixed:    { bg: 'var(--p-mixed-soft)',    fg: '#B14242',  border: '#F0C0BF' },
  }
  const s = styles[tone] || styles.pending
  return (
    <div className="rounded-xl px-4 py-3 flex items-center gap-3"
         style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: s.fg }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
        <div className="text-[11px]" style={{ color: s.fg }}>{reason}</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-mono" style={{ color: 'var(--p-ink-500)' }}>{c.ourRef}</span>
        {c.billingFacility && <FacilityBadge code={c.billingFacility} size="sm" />}
      </div>
    </div>
  )
}

function AdminEncounterCell({ c }) {
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

function AdminTreatmentCell({ c }) {
  if (!c.treatmentMode || c.treatmentMode === 'pending') {
    return <StatusPill tone="pending"><Clock className="w-3 h-3" /> TBD</StatusPill>
  }
  return c.treatmentMode === 'surgical'
    ? <StatusPill tone="mixed"><Scissors className="w-3 h-3" /> Surgical</StatusPill>
    : <StatusPill tone="teal"><Heart className="w-3 h-3" /> Conservative</StatusPill>
}
