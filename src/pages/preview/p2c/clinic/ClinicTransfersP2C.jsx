import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Send, Clock, MapPin, Hotel, Eye, Filter, Search, Calendar, Repeat, BedDouble,
} from 'lucide-react'
import { OperationalShell, IdentityHeader } from '../../../../premium/OperationalShell'
import { SectionHead, FacilityBadge, FinTypePill, DemoBanner } from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import { useUserMode } from '../../../../context/UserModeContext'
import { useCasesForClinic } from '../../../../context/DemoStateContext'
import { getClinicName } from '../../../../data/p2c'
import { R1_TODAY_LABEL, encounterMeta } from '../../../../data/p2cR1'
import { fmtRelative } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

/* =========================================================================
 * P2C.R2 — External Clinic Transfers (table dashboard)
 * -----------------------------------------------------------------------
 * Replaces card layout with a full-width operational table.
 *
 * Columns: Sent · Demo Ref · Patient · Nationality · Hotel/Room ·
 *          Destination · Financial Type · Facility · Encounter ·
 *          Transfer Status · Action
 * ========================================================================= */

const DEST_FILTERS = ['All', 'Al-Kawther Branch', 'Sheraton Branch', 'Other']
const FIN_FILTERS  = ['All', 'Pending', 'Cash', 'Insurance', 'Free / Complimentary']
const STATUS_FILTERS = ['All', 'Awaiting Receipt', 'Received', 'Closed']
const ENC_FILTERS  = ['All', 'Single Visit', 'Multi-Session', 'Inpatient']

export default function ClinicTransfersP2C() {
  const { clinicId } = useUserMode()
  const clinicName = getClinicName(clinicId)
  const all = useCasesForClinic(clinicId)
  const transfers = useMemo(() => all.filter((c) => !!c.transfer), [all])

  const [dest, setDest] = useState('All')
  const [fin,  setFin]  = useState('All')
  const [stat, setStat] = useState('All')
  const [enc,  setEnc]  = useState('All')
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return transfers.filter((c) => {
      if (dest !== 'All') {
        const dName = c.transfer?.toBranchName || ''
        if (dest === 'Other' && (dName === 'Al-Kawther Branch' || dName === 'Sheraton Branch')) return false
        if (dest !== 'Other' && dName !== dest) return false
      }
      if (fin  !== 'All' && c.financialType !== fin) return false
      if (stat !== 'All') {
        if (stat === 'Awaiting Receipt' && c.transfer?.receivedAt) return false
        if (stat === 'Received' && !c.transfer?.receivedAt) return false
        if (stat === 'Closed' && c.operationalStatus !== 'Closed') return false
      }
      if (enc !== 'All') {
        const m = encounterMeta(c.encounterPattern)
        if ((m?.short || '') !== enc) return false
      }
      if (q) {
        const haystack = [
          c.patient.name, c.ourRef, c.patient.nationality,
          c.patient.hotel, c.patient.hotelRoom, c.insurance?.company, c.transfer?.toBranchName,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [transfers, dest, fin, stat, enc, query])

  const counts = useMemo(() => ({
    total: transfers.length,
    awaiting: transfers.filter((c) => !c.transfer?.receivedAt).length,
    received: transfers.filter((c) => c.transfer?.receivedAt).length,
  }), [transfers])

  return (
    <OperationalShell role="clinic_nurse" active="transfers"
      identityName={clinicName} identitySub="External Clinic Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-5">

        <DemoBanner>
          <strong>Interactive Demo</strong> — new transfers from New Case appear here immediately. Status updates as the receiving branch acts.
        </DemoBanner>

        <IdentityHeader
          icon={Send}
          tone="teal"
          label="Transfers"
          subtitle={`${clinicName} · ${R1_TODAY_LABEL}`}
          badges={
            <>
              <StatusPill tone="navy">{counts.total} total</StatusPill>
              {counts.awaiting > 0 && <StatusPill tone="amber"><Clock className="w-3 h-3" /> {counts.awaiting} awaiting receipt</StatusPill>}
              {counts.received > 0 && <StatusPill tone="cash">{counts.received} received</StatusPill>}
            </>
          }
        />

        {/* Filters */}
        <div className="p-card p-3 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-500)' }}>
            <Filter className="w-3.5 h-3.5" /> Filter
          </div>
          <Chips label="Dest"     value={dest} setValue={setDest} options={DEST_FILTERS} />
          <Chips label="Fin"      value={fin}  setValue={setFin}  options={FIN_FILTERS} />
          <Chips label="Status"   value={stat} setValue={setStat} options={STATUS_FILTERS} />
          <Chips label="Encounter" value={enc} setValue={setEnc}  options={ENC_FILTERS} />
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--p-ink-400)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by patient, ref, hotel, destination, insurer…"
              className="p-input pl-9 h-9" />
          </div>
        </div>

        {/* Desktop table */}
        <section className="hidden md:block p-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
                  {['Sent', 'Demo Ref', 'Patient', 'Nationality', 'Hotel / Room', 'Destination', 'Financial', 'Facility', 'Encounter', 'Status', ''].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-[0.08em] text-[10px]"
                      style={{ color: 'var(--p-ink-500)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr><td colSpan={11} className="px-3 py-12 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No transfers match these filters.</td></tr>
                ) : shown.map((c, i) => (
                  <tr key={c.id}
                    style={{ borderBottom: i < shown.length - 1 ? '1px solid var(--p-border)' : 'none' }}
                    className="hover:bg-[var(--p-surface-tint)] transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Clock className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} /> {fmtRelative(c.transfer?.sentAt)}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--p-ink-500)' }}>{c.ourRef}</td>
                    <td className="px-3 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{c.patient.nationality || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>
                      <span className="inline-flex items-center gap-1">
                        <Hotel className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} />
                        {c.patient.hotel || '—'}{c.patient.hotelRoom ? <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}> / {c.patient.hotelRoom}</span> : null}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} /> {c.transfer?.toBranchName || '—'}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><FinTypePill type={c.financialType} /></td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {c.billingFacility ? <FacilityBadge code={c.billingFacility} size="sm" /> : <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>—</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <EncounterChip code={c.encounterPattern} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><TransferStatusCell c={c} /></td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      <Link to={`/clinic/cases/${c.id}`}
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

        {/* Mobile compact rows */}
        <section className="md:hidden space-y-2">
          {shown.length === 0 ? (
            <div className="p-card p-6 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No transfers match these filters.</div>
          ) : shown.map((c) => (
            <Link key={c.id} to={`/clinic/cases/${c.id}`} className="block p-card px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] inline-flex items-center gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
                    <Clock className="w-3 h-3" /> {fmtRelative(c.transfer?.sentAt)} <span className="font-mono ml-1.5">{c.ourRef}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold truncate" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--p-ink-500)' }}>
                    {c.patient.hotel || '—'}{c.patient.hotelRoom ? ` / ${c.patient.hotelRoom}` : ''} → {c.transfer?.toBranchName || '—'}
                  </div>
                </div>
                {c.billingFacility && <FacilityBadge code={c.billingFacility} size="sm" />}
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <FinTypePill type={c.financialType} />
                <EncounterChip code={c.encounterPattern} />
                <TransferStatusCell c={c} />
              </div>
            </Link>
          ))}
        </section>

        <div className="text-center text-[11px]" style={{ color: 'var(--p-ink-400)' }}>
          Showing {shown.length} of {transfers.length} transfers · UI Concept · No backend connected
        </div>
      </div>
    </OperationalShell>
  )
}

function Chips({ label, value, setValue, options }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</span>
      {options.map((o) => (
        <button key={o} onClick={() => setValue(o)}
          className="h-7 px-2.5 rounded-full text-[11px] font-semibold border-2 transition-colors"
          style={value === o
            ? { background: 'var(--p-teal)', borderColor: 'var(--p-teal)', color: 'white' }
            : { background: 'white', borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }}>
          {o}
        </button>
      ))}
    </div>
  )
}

function EncounterChip({ code }) {
  const m = encounterMeta(code)
  if (!m) return <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>—</span>
  const Icon = code === 'inpatient_admission' ? BedDouble : code === 'outpatient_multi' ? Repeat : Calendar
  return (
    <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-bold"
      style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-700)', border: '1px solid var(--p-border)' }}>
      <Icon className="w-3 h-3" /> {m.short}
    </span>
  )
}

function TransferStatusCell({ c }) {
  const t = c.transfer
  if (!t) return <StatusPill tone="navy">—</StatusPill>
  if (c.operationalStatus === 'Closed') return <StatusPill tone="finalized">Closed</StatusPill>
  if (!t.receivedAt) return <StatusPill tone="amber"><Clock className="w-3 h-3" /> Awaiting Receipt</StatusPill>
  if (t.status === 'Financial Type Confirmed') return <StatusPill tone="teal">Classified</StatusPill>
  return <StatusPill tone="navy">Received</StatusPill>
}
