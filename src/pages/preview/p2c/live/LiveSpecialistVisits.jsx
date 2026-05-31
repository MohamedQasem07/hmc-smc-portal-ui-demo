import { useEffect, useState } from 'react'
import { Stethoscope, Plus, CheckCircle2, Clock, AlertTriangle, LogOut } from 'lucide-react'
import { SectionHead } from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import { insertEncounter, updateEncounter, fetchSpecialistDoctors } from '../../../../lib/api/portalData'
import { fmtDMYHM } from '../../../../lib/displayDate'

/* =========================================================================
 * LiveSpecialistVisits (Phase 6) — supabase-mode only.
 * Add / list / close specialist visits (portal_encounters, type 'session').
 * Multiple per case; specialist name/type + visit date-time + optional
 * departure + note + status. Operational tracking ONLY — no billing.
 * Encounters are children of the case → never creates a duplicate patient.
 * Props: caseId, sessions (mapped c.sessions), onChanged (refresh callback),
 * readOnly (admin view).
 * ========================================================================= */

function nowLocalDatetime() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function LiveSpecialistVisits({ caseId, sessions = [], onChanged, readOnly = false, locationCode = null }) {
  const [specialist, setSpecialist] = useState('')
  const [note, setNote] = useState('')
  const [when, setWhen] = useState(nowLocalDatetime())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [doctors, setDoctors] = useState([])

  // Doctor list comes from the EXISTING staff directory (portal_staff, role=doctor) —
  // no separate specialists table. Falls back to free text if none are visible.
  useEffect(() => {
    let alive = true
    fetchSpecialistDoctors(locationCode).then((d) => { if (alive) setDoctors(d) }).catch(() => {})
    return () => { alive = false }
  }, [locationCode])

  async function add() {
    if (!specialist.trim() && !note.trim()) { setError('Enter a specialist/type or a note.'); return }
    setBusy(true); setError(null)
    try {
      await insertEncounter(caseId, {
        specialist: specialist.trim() || null,
        note: note.trim() || null,
        checkInAt: when ? new Date(when).toISOString() : undefined,
        status: 'active',
      })
      setSpecialist(''); setNote(''); setWhen(nowLocalDatetime())
      onChanged && (await onChanged())
    } catch (e) { setError(e?.message || 'Could not add the visit.') }
    finally { setBusy(false) }
  }

  async function close(id) {
    setBusy(true); setError(null)
    try {
      await updateEncounter(id, { checkOutAt: new Date().toISOString(), status: 'completed' })
      onChanged && (await onChanged())
    } catch (e) { setError(e?.message || 'Could not close the visit.') }
    finally { setBusy(false) }
  }

  return (
    <section className="p-card p-5 space-y-4">
      <SectionHead eyebrow="Specialist Visits · Live" title="Specialist Visits / Sessions"
        description="Operational tracking of specialist encounters for this case. Multiple visits supported. No billing impact." />

      {error && (
        <div className="rounded-xl px-3 py-2 flex items-start gap-2 text-[12px]"
          style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Existing visits */}
      {sessions.length === 0 ? (
        <div className="rounded-xl p-4 text-center text-sm" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
          No specialist visits recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-xl p-3 flex items-start gap-3"
              style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
              <span className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'white', border: '1px solid var(--p-border)', color: 'var(--p-brand-mid)' }}>
                {s.sequenceNo || '•'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{s.note || 'Specialist visit'}</div>
                <div className="text-[11px] mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: 'var(--p-ink-500)' }}>
                  <span>Check-in: {s.checkInAt ? fmtDMYHM(s.checkInAt) : '—'}</span>
                  <span>Check-out: {s.checkOutAt ? fmtDMYHM(s.checkOutAt) : '—'}</span>
                </div>
              </div>
              {s.status === 'active'
                ? <StatusPill tone="amber" icon={Clock}>Active</StatusPill>
                : <StatusPill tone="finalized" icon={CheckCircle2}>Completed</StatusPill>}
              {!readOnly && s.status === 'active' && (
                <button onClick={() => close(s.id)} disabled={busy}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold p-btn-ghost shrink-0">
                  <LogOut className="w-3 h-3" /> Close
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {!readOnly && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-brand-mid)' }}>
            <Stethoscope className="w-4 h-4" /> Add Specialist Visit
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Doctor">
              {doctors.length > 0 ? (
                <select className="p-input" value={specialist} onChange={(e) => setSpecialist(e.target.value)}>
                  <option value="">Select doctor…</option>
                  {doctors.map((d) => <option key={d.staffId} value={d.name}>{d.name}</option>)}
                </select>
              ) : (
                <input className="p-input" value={specialist} onChange={(e) => setSpecialist(e.target.value)} placeholder="e.g. Dr. Ahmed" />
              )}
            </Field>
            <Field label="Visit Date & Time">
              <input type="datetime-local" className="p-input" value={when} onChange={(e) => setWhen(e.target.value)} />
            </Field>
            <Field label="Specialty / Note (optional)">
              <input className="p-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Cardiology — follow-up" />
            </Field>
          </div>
          <div className="flex justify-end">
            <button onClick={add} disabled={busy}
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-sm font-bold p-btn-primary">
              <Plus className="w-4 h-4" /> {busy ? 'Adding…' : 'Add Visit'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</label>
      {children}
    </div>
  )
}
