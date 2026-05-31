import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Repeat, BedDouble, Clock, CheckCircle2, Plus,
  Hotel, Phone, Mail, ShieldCheck, Gift, Send, Square, Heart, Scissors,
  AlertTriangle, Building2,
} from 'lucide-react'
import { OperationalShell } from '../../../../premium/OperationalShell'
import {
  SectionHead, DemoBanner, FacilityBadge, FinTypePill, RoutePill,
} from '../../../../premium/p2cPrimitives'
import { StatusPill, Avatar } from '../../../../premium/primitives'
import { useUserMode } from '../../../../context/UserModeContext'
import { useDemoState, useFindCase } from '../../../../context/DemoStateContext'
import { getClinicName } from '../../../../data/p2c'
import { encounterMeta, R1_ENCOUNTER_PATTERNS } from '../../../../data/p2cR1'
import { fmtDate } from '../../../../lib/format'

/* =========================================================================
 * P2C.R2 — Clinic Case Detail
 * -----------------------------------------------------------------------
 * Patient header, encounter timeline (visit / sessions / admission),
 * collection summary, transfer info. Actions wire to demo-state:
 *   Close Visit · Add Session · Close Session · Discharge.
 * ========================================================================= */

export default function ClinicCaseDetailP2C() {
  const { caseId } = useParams()
  const { clinicId } = useUserMode()
  const clinicName = getClinicName(clinicId)
  const c = useFindCase(caseId)
  const { actions } = useDemoState()
  const [newSessionNote, setNewSessionNote] = useState('')

  if (!c) {
    return (
      <OperationalShell role="clinic_nurse" active="cases" identityName={clinicName} identitySub="External Clinic Workspace">
        <div className="max-w-2xl mx-auto px-4 pt-10 text-center">
          <div className="p-card p-8 space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto" style={{ color: '#A1672A' }} />
            <div className="text-sm font-semibold">Case not found</div>
            <Link to="/clinic/cases" className="text-xs text-[var(--p-teal)] font-semibold">← My Cases</Link>
          </div>
        </div>
      </OperationalShell>
    )
  }

  const enc = encounterMeta(c.encounterPattern) || R1_ENCOUNTER_PATTERNS[0]

  return (
    <OperationalShell role="clinic_nurse" active="cases" identityName={clinicName} identitySub="External Clinic Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-5">

        <DemoBanner>
          <strong>Interactive Demo</strong> — actions are saved in this browser (local preview — not yet on the server).
        </DemoBanner>

        <Link to="/clinic/cases" className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--p-teal)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Cases
        </Link>

        <div className="p-card p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar name={c.patient.name} size={56} tone="navy" />
            <div className="flex-1 min-w-0">
              <h1 className="p-h1 text-xl sm:text-2xl">{c.patient.name}</h1>
              <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--p-ink-400)' }}>{c.ourRef}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <FinTypePill type={c.financialType} />
                <RoutePill route={c.route} routeLabel={c.routeLabel} />
                {c.billingFacility && <FacilityBadge code={c.billingFacility} size="md" />}
                <StatusPill tone={enc.tone}>{enc.label}</StatusPill>
                <StatusPill tone={c.operationalStatus === 'Closed' ? 'finalized' : 'navy'}>{c.operationalStatus}</StatusPill>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <InfoItem icon={Building2} label="Registered At" value={c.registeredAtName} />
                <InfoItem icon={Hotel}     label="Hotel"         value={[c.patient.hotel, c.patient.hotelRoom ? `Rm ${c.patient.hotelRoom}` : ''].filter(Boolean).join(' · ')} />
                <InfoItem icon={Phone}     label="Phone"         value={[c.patient.phoneCode, c.patient.phone].filter(Boolean).join(' ')} />
                <InfoItem icon={Mail}      label="Email"         value={c.patient.email} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

          <section className="p-card p-5 xl:col-span-7 space-y-4">
            <SectionHead eyebrow="Encounter" title={enc.label}
              description="Independent of Route, Financial Type and Treatment Mode." />

            {c.encounterPattern === 'outpatient_single' && (
              <SingleVisitPanel c={c} onCloseVisit={() => actions.closeVisit(c.id)} />
            )}
            {c.encounterPattern === 'outpatient_multi' && (
              <MultiSessionPanel c={c}
                onCloseSession={(sid) => actions.closeSession(c.id, sid)}
                onAddSession={() => { actions.addSession(c.id, newSessionNote || `Session ${(c.sessions?.length || 0) + 1}`); setNewSessionNote('') }}
                newSessionNote={newSessionNote}
                setNewSessionNote={setNewSessionNote}
              />
            )}
            {c.encounterPattern === 'inpatient_admission' && (
              <InpatientPanel c={c} onDischarge={() => actions.discharge(c.id)} />
            )}

            {c.transfer && (
              <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--p-transfer-soft)', border: '1px solid #D7CFF2' }}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#5443A8' }}>
                  <Send className="w-3.5 h-3.5" /> Transfer
                </div>
                <div className="text-sm" style={{ color: 'var(--p-ink-800)' }}>
                  <strong>{c.transfer.toBranchName}</strong> · {c.transfer.status}
                </div>
                {c.transfer.reason && <div className="text-[12px]" style={{ color: 'var(--p-ink-700)' }}>Reason: {c.transfer.reason}</div>}
                {c.transfer.referralNote && <div className="text-[12px]" style={{ color: 'var(--p-ink-700)' }}>Referral: {c.transfer.referralNote}</div>}
                <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
                  Sent: {fmtDate(c.transfer.sentAt, { withTime: true })}
                  {c.transfer.receivedAt && <> · Received: {fmtDate(c.transfer.receivedAt, { withTime: true })}</>}
                </div>
              </div>
            )}
          </section>

          <section className="p-card p-5 xl:col-span-5 space-y-4">
            <SectionHead eyebrow="Financial" title="Collection Summary" />
            <CollectionsSummary c={c} />
          </section>
        </div>
      </div>
    </OperationalShell>
  )
}

// =====================================================================
function SingleVisitPanel({ c, onCloseVisit }) {
  const v = c.visit || {}
  const closed = !!v.checkOutAt
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>
        <Calendar className="w-3.5 h-3.5" /> Single Outpatient Visit
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Visit Check-In"  value={v.checkInAt ? fmtDate(v.checkInAt, { withTime: true }) : '—'} />
        <Stat label="Visit Check-Out" value={v.checkOutAt ? fmtDate(v.checkOutAt, { withTime: true }) : 'Active'} tone={closed ? 'cash' : 'pending'} />
        <Stat label="Duration"        value={v.checkInAt ? `${duration(v.checkInAt, v.checkOutAt)} hours` : '—'} />
      </div>
      {!closed ? (
        <button onClick={onCloseVisit}
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full text-sm font-bold p-btn-primary">
          <Square className="w-4 h-4" /> Close Visit / Record Check-Out
        </button>
      ) : (
        <div className="rounded-xl px-3 py-2 text-[12px] flex items-center gap-2"
          style={{ background: 'var(--p-finalized-soft)', color: '#076D4A', border: '1px solid #9FD4BB' }}>
          <CheckCircle2 className="w-3.5 h-3.5" /> Visit closed. Case marked Completed.
        </div>
      )}
    </div>
  )
}

function MultiSessionPanel({ c, onCloseSession, onAddSession, newSessionNote, setNewSessionNote }) {
  const sessions = c.sessions || []
  const activeIdx = sessions.findIndex((s) => s.status === 'active')
  const completed = sessions.filter((s) => s.status === 'completed').length
  return (
    <div className="rounded-2xl p-4 space-y-4" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>
          <Repeat className="w-3.5 h-3.5" /> Outpatient Sessions
        </div>
        <StatusPill tone="teal">{sessions.length} Sessions · {completed} Completed · {activeIdx >= 0 ? 1 : 0} Active</StatusPill>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--p-border)' }}>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: 'white' }}>
              {['Session', 'Date', 'Check-In', 'Check-Out', 'Duration', 'Status', 'Notes', ''].map((h) =>
                <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={s.id} style={{ borderTop: '1px solid var(--p-border)', background: i % 2 ? 'var(--p-surface-tint)' : 'white' }}>
                <td className="px-3 py-2.5 font-bold whitespace-nowrap" style={{ color: 'var(--p-ink-900)' }}>Visit {i + 1}</td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{fmtDate(s.date, { dateOnly: true })}</td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{fmtTime(s.checkInAt)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{s.checkOutAt ? fmtTime(s.checkOutAt) : '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{duration(s.checkInAt, s.checkOutAt)}h</td>
                <td className="px-3 py-2.5">
                  <StatusPill tone={s.status === 'completed' ? 'finalized' : 'amber'}>{s.status === 'completed' ? 'Completed' : 'Active'}</StatusPill>
                </td>
                <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-600)' }}>{s.note || '—'}</td>
                <td className="px-3 py-2.5 text-right">
                  {s.status === 'active' && (
                    <button onClick={() => onCloseSession(s.id)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold p-btn-ghost">
                      <Square className="w-3 h-3" /> Close
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
        style={{ background: 'white', border: '1px solid var(--p-border)' }}>
        <div className="sm:col-span-9 flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>New session note (optional)</label>
          <input value={newSessionNote} onChange={(e) => setNewSessionNote(e.target.value)}
            placeholder="e.g. Repeat IV, follow-up dressing" className="p-input h-10" />
        </div>
        <div className="sm:col-span-3 flex justify-end">
          <button onClick={onAddSession}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold p-btn-primary">
            <Plus className="w-3.5 h-3.5" /> Add New Visit / Session
          </button>
        </div>
      </div>
    </div>
  )
}

function InpatientPanel({ c, onDischarge }) {
  const a = c.admission || {}
  const discharged = !!a.dischargedAt
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>
        <BedDouble className="w-3.5 h-3.5" /> Inpatient Admission
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Stat label="Admission"  value={a.admittedAt ? fmtDate(a.admittedAt, { withTime: true }) : '—'} />
        <Stat label="Discharge"  value={a.dischargedAt ? fmtDate(a.dischargedAt, { withTime: true }) : 'Admitted'} tone={discharged ? 'cash' : 'pending'} />
        <Stat label="Length of Stay" value={a.admittedAt ? `${duration(a.admittedAt, a.dischargedAt)} hours` : '—'} />
        <Stat label="Treatment Mode"
          value={c.treatmentMode === 'surgical' ? 'Surgical' : c.treatmentMode === 'conservative' ? 'Conservative' : 'Not Determined'}
          tone={c.treatmentMode === 'surgical' ? 'mixed' : c.treatmentMode === 'conservative' ? 'teal' : 'pending'}
          icon={c.treatmentMode === 'surgical' ? Scissors : c.treatmentMode === 'conservative' ? Heart : Clock} />
      </div>
      {c.centerRoomNumber && (
        <div className="text-[12px] flex items-center gap-1.5" style={{ color: 'var(--p-ink-700)' }}>
          <BedDouble className="w-3.5 h-3.5" />
          Center Room: <strong>Room {String(c.centerRoomNumber).padStart(2, '0')}</strong>
          {c.transfer?.toBranchName && <> at <strong>{c.transfer.toBranchName}</strong></>}
        </div>
      )}
      {!discharged ? (
        <button onClick={onDischarge}
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full text-sm font-bold p-btn-primary">
          <CheckCircle2 className="w-4 h-4" /> Discharge Patient
        </button>
      ) : (
        <div className="rounded-xl px-3 py-2 text-[12px] flex items-center gap-2"
          style={{ background: 'var(--p-finalized-soft)', color: '#076D4A', border: '1px solid #9FD4BB' }}>
          <CheckCircle2 className="w-3.5 h-3.5" /> Patient discharged. Room released back to Available.
        </div>
      )}
    </div>
  )
}

// =====================================================================
function CollectionsSummary({ c }) {
  if (c.financialType === 'Free / Complimentary') {
    return (
      <div className="rounded-xl p-4" style={{ background: 'var(--p-gold-soft)', border: '1px solid #F1E2C9' }}>
        <div className="text-xs font-bold uppercase tracking-[0.12em] mb-1" style={{ color: '#7A4F1F' }}>
          <Gift className="inline w-3.5 h-3.5 mr-1" /> Free / Complimentary
        </div>
        <div className="text-sm" style={{ color: 'var(--p-ink-800)' }}>{c.complimentary?.reason || '—'}</div>
        {c.complimentary?.approvedBy && (
          <div className="text-[11px] mt-1" style={{ color: 'var(--p-ink-500)' }}>Approved by: {c.complimentary.approvedBy}</div>
        )}
      </div>
    )
  }
  if (c.financialType === 'Cash') {
    return <LinesSummary kind="Cash Invoice" lines={c.paymentLines} invoice={c.invoice} settlement={c.settlement} />
  }
  if (c.financialType === 'Insurance') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl p-3" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-brand-mid)' }}>
            <ShieldCheck className="w-3.5 h-3.5" /> Insurance
          </div>
          <div className="text-sm mt-1 flex items-center gap-2 flex-wrap" style={{ color: 'var(--p-ink-800)' }}>
            {c.insurance?.company || '—'}
            {c.billingFacility && <FacilityBadge code={c.billingFacility} size="sm" />}
          </div>
          {c.insurance?.ref && <div className="text-[11px] mt-1 font-mono" style={{ color: 'var(--p-ink-500)' }}>Ref: {c.insurance.ref}</div>}
        </div>
        {c.hasPatientExcess
          ? <LinesSummary kind="Patient Excess" lines={c.excessLines} due={c.excessAmount} dueCurrency={c.excessCurrency} settlement={c.settlement} />
          : <div className="rounded-xl px-3 py-2 text-[12px]" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>No Patient Excess on this case.</div>}
      </div>
    )
  }
  return (
    <div className="rounded-xl px-3 py-3 text-[12px] flex items-start gap-2"
      style={{ background: 'var(--p-pending-soft)', color: '#A1672A', border: '1px solid #F0C97A' }}>
      <Clock className="w-3.5 h-3.5 mt-0.5" />
      <span>Financial classification still <strong>Pending</strong>. Will be confirmed at the receiving branch (if transferred) or by Mohamed.</span>
    </div>
  )
}

function LinesSummary({ kind, lines = [], invoice, due, dueCurrency, settlement }) {
  const totals = {}
  for (const l of lines) {
    const amt = Number(l.actualAmount ?? l.amount) || 0
    if (!amt) continue
    const cur = l.method === 'Visa / Card' ? 'EGP' : (l.actualCurrency || l.currency || 'EGP')
    totals[cur] = (totals[cur] || 0) + amt
  }
  const entries = Object.entries(totals)
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>{kind}</div>
        {settlement && <StatusPill tone={settlement === 'Paid' ? 'finalized' : settlement === 'Partially Paid' ? 'amber' : 'pending'}>{settlement}</StatusPill>}
      </div>
      {(invoice || due) && (
        <div className="text-[12px]" style={{ color: 'var(--p-ink-600)' }}>
          {invoice && <>Invoice <strong>{invoice.number}</strong> · {fmt(invoice.amount)} {invoice.currency}</>}
          {due && <>Due <strong>{fmt(due)} {dueCurrency}</strong></>}
        </div>
      )}
      {lines.length === 0 ? (
        <div className="text-[12px]" style={{ color: 'var(--p-ink-400)' }}>No payment lines recorded.</div>
      ) : (
        <ul className="space-y-1.5">
          {lines.map((l, i) => (
            <li key={l.id || i} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
              style={{ background: 'var(--p-surface-tint)' }}>
              <span className="text-[12px] flex items-center gap-1.5">
                <StatusPill tone={l.method === 'Visa / Card' ? 'navy' : 'cash'}>{l.method}</StatusPill>
                {l.note && <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>· {l.note}</span>}
              </span>
              <span className="font-bold p-numeric text-[12px]" style={{ color: 'var(--p-ink-900)' }}>
                {fmt(l.actualAmount ?? l.amount)} {l.method === 'Visa / Card' ? 'EGP' : (l.actualCurrency || l.currency || 'EGP')}
              </span>
            </li>
          ))}
        </ul>
      )}
      {entries.length > 0 && (
        <div className="text-[11px] flex flex-wrap gap-1.5 pt-1 border-t" style={{ color: 'var(--p-ink-600)', borderColor: 'var(--p-border)' }}>
          <span className="font-bold">Totals:</span>
          {entries.map(([cur, val], i) => (
            <span key={cur} className="font-mono">{i > 0 ? ' · ' : ''}{fmt(val)} {cur}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, tone, icon: Icon }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold flex items-center gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
      <div className="text-sm font-bold mt-0.5"
        style={{ color: tone === 'cash' ? '#0A8F62' : tone === 'pending' ? '#A1672A' : tone === 'mixed' ? '#B14242' : tone === 'teal' ? '#0A8F87' : 'var(--p-ink-900)' }}>
        {value}
      </div>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold flex items-center gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
      <div className="text-[13px] font-semibold mt-0.5 truncate" style={{ color: 'var(--p-ink-800)' }}>{value || '—'}</div>
    </div>
  )
}

function duration(startIso, endIso) {
  if (!startIso) return '—'
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const start = new Date(startIso).getTime()
  return Math.max(0, (end - start) / 36e5).toFixed(1)
}
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}
