import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Inbox, Clock, MapPin, Hotel, Filter, Search, Eye,
  Calendar, Repeat, BedDouble, RefreshCw,
} from 'lucide-react'
import { OperationalShell, IdentityHeader, receptionRoute } from '../../../../premium/OperationalShell'
import { SectionHead, DemoBanner, FacilityBadge, FinTypePill } from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import { useIncomingTransfers, useDemoState } from '../../../../context/DemoStateContext'
import { encounterMeta, R1_TODAY_LABEL } from '../../../../data/p2cR1'
import { fmtRelative } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'
import { IS_SUPABASE } from '../../../../lib/api/config'

/* =========================================================================
 * P2C.R2 — Reception Incoming Transfers (table)
 * -----------------------------------------------------------------------
 * Lists all transfers heading to this branch with origin clinic, hotel
 * + hotel room, financial type, billing facility (if any), encounter
 * pattern and live transfer status.
 * ========================================================================= */

function branchConfig(slug) {
  if (slug === 'al-kawther') return { id: 'al_kawther', name: 'Al-Kawther Branch', role: 'reception_kawther' }
  return { id: 'sheraton', name: 'Sheraton Branch', role: 'reception_sheraton' }
}

const STATUS_FILTERS = ['All', 'Awaiting Receipt', 'Received', 'Closed']
const FIN_FILTERS    = ['All', 'Pending', 'Cash', 'Insurance', 'Free / Complimentary']
const ENC_FILTERS    = ['All', 'Single Visit', 'Multi-Session', 'Inpatient']

export default function ReceptionIncomingTransfersP2C() {
  const { branchSlug } = useParams()
  const { id: branchId, name: branchName, role } = branchConfig(branchSlug)
  const incoming = useIncomingTransfers(branchId, { includeReceived: true })
  const { actions } = useDemoState()

  // Phase 6 — light refresh + polling so newly-sent transfers surface without reload.
  const refresh = useCallback(async () => {
    if (!IS_SUPABASE) return
    try { await actions.refreshCases() } catch { /* best-effort */ }
  }, [actions])
  useEffect(() => {
    if (!IS_SUPABASE) return undefined
    const t = setInterval(() => { refresh() }, 25000)
    return () => clearInterval(t)
  }, [refresh])

  const [stat, setStat] = useState('All')
  const [fin,  setFin]  = useState('All')
  const [enc,  setEnc]  = useState('All')
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return incoming.filter((c) => {
      if (stat !== 'All') {
        if (stat === 'Awaiting Receipt' && c.transfer?.receivedAt) return false
        if (stat === 'Received' && !c.transfer?.receivedAt) return false
        if (stat === 'Closed' && c.operationalStatus !== 'Closed') return false
      }
      if (fin !== 'All' && c.financialType !== fin) return false
      if (enc !== 'All') {
        const m = encounterMeta(c.encounterPattern)
        if ((m?.short || '') !== enc) return false
      }
      if (q) {
        const haystack = [
          c.patient.name, c.ourRef, c.registeredAtName, c.patient.nationality,
          c.patient.hotel, c.patient.hotelRoom, c.insurance?.company, c.billingFacility,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [incoming, stat, fin, enc, query])

  const counts = {
    total: incoming.length,
    awaiting: incoming.filter((c) => !c.transfer?.receivedAt).length,
    received: incoming.filter((c) => c.transfer?.receivedAt).length,
  }

  return (
    <OperationalShell role={role} active="transfers"
      identityName={branchName} identitySub="Reception & Rooms Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-5">

        <DemoBanner>
          <strong>Interactive Demo</strong> — new transfers from external clinics appear here. Open one to receive + assign a room.
        </DemoBanner>

        <IdentityHeader
          icon={Inbox} tone="gold"
          label="Incoming Transfers"
          subtitle={`${branchName} · ${R1_TODAY_LABEL}`}
          badges={
            <>
              <StatusPill tone="navy">{counts.total} total</StatusPill>
              {counts.awaiting > 0 && <StatusPill tone="amber"><Clock className="w-3 h-3" /> {counts.awaiting} awaiting receipt</StatusPill>}
              {counts.received > 0 && <StatusPill tone="cash">{counts.received} received</StatusPill>}
            </>
          }
        />

        <div className="p-card p-3 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-500)' }}>
            <Filter className="w-3.5 h-3.5" /> Filter
          </div>
          <Chips label="Status"   value={stat} setValue={setStat} options={STATUS_FILTERS} />
          <Chips label="Fin"      value={fin}  setValue={setFin}  options={FIN_FILTERS} />
          <Chips label="Encounter" value={enc} setValue={setEnc}  options={ENC_FILTERS} />
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--p-ink-400)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by patient, ref, hotel, origin clinic…" className="p-input pl-9 h-9" />
          </div>
          {IS_SUPABASE && (
            <button onClick={refresh}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold p-btn-ghost no-print">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
        </div>

        <section className="hidden md:block p-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
                  {['Sent', 'Demo Ref', 'Patient', 'From Clinic', 'Hotel / Room', 'Financial', 'Facility', 'Encounter', 'Status', ''].map((h) =>
                    <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-[0.08em] text-[10px]"
                      style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr><td colSpan={10} className="px-3 py-12 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No transfers match.</td></tr>
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
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{c.registeredAtName}</td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>
                      <span className="inline-flex items-center gap-1">
                        <Hotel className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} />
                        {c.patient.hotel || '—'}{c.patient.hotelRoom ? <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}> / {c.patient.hotelRoom}</span> : null}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><FinTypePill type={c.financialType} /></td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {c.billingFacility ? <FacilityBadge code={c.billingFacility} size="sm" /> : <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>—</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><EncounterChip code={c.encounterPattern} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><TransferStatusCell c={c} /></td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      <Link to={`${receptionRoute(role, 'incoming-transfers')}/${c.id}`}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold p-btn-primary">
                        <Eye className="w-3.5 h-3.5" /> Open
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
            <div className="p-card p-6 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No transfers match.</div>
          ) : shown.map((c) => (
            <Link key={c.id} to={`${receptionRoute(role, 'incoming-transfers')}/${c.id}`} className="block p-card px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] inline-flex items-center gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
                    <Clock className="w-3 h-3" /> {fmtRelative(c.transfer?.sentAt)} <span className="font-mono ml-1.5">{c.ourRef}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold truncate" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--p-ink-500)' }}>
                    {c.registeredAtName} · {c.patient.hotel || '—'}{c.patient.hotelRoom ? ` / ${c.patient.hotelRoom}` : ''}
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

      </div>
    </OperationalShell>
  )
}

function Chips({ label, value, setValue, options }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
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
  if (!t.receivedAt) return <StatusPill tone="amber"><Clock className="w-3 h-3" /> Awaiting</StatusPill>
  if (t.status === 'Financial Type Confirmed') return <StatusPill tone="teal">Classified</StatusPill>
  return <StatusPill tone="navy">Received</StatusPill>
}
