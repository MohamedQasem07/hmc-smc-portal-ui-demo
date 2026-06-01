import { useEffect, useState } from 'react'
import { Stethoscope, Plus, CheckCircle2, Clock, AlertTriangle, LogOut, UserCog, BookUser, UserPlus } from 'lucide-react'
import { SectionHead } from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import { insertEncounter, updateEncounter, fetchSpecialistDirectory, fetchInternalDoctors } from '../../../../lib/api/portalData'
import { fmtDMYHM } from '../../../../lib/displayDate'

/* =========================================================================
 * LiveSpecialistVisits (Phase 6 / sprint 2026-06-01) — supabase-mode only.
 * Records specialist visits on a case (portal_encounters, type 'session').
 *
 * Specialists are EXTERNAL visiting doctors by DEFAULT — they are NOT staff:
 * no login, no attendance, no clinic assignment. Three sources:
 *   • External Specialist (default) — type the name + specialty manually.
 *   • From Directory — pick from the admin-managed Specialist Doctors roster
 *     (portal_specialist_doctors); fills name + specialty (still editable).
 *   • Internal Doctor — optional: pick a clinic/duty doctor from staff.
 * Visit name / specialty / source are encoded in the encounter note (no billing).
 * Props: caseId, sessions (mapped c.sessions), onChanged, readOnly, locationCode.
 * ========================================================================= */

function nowLocalDatetime() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const SOURCES = [
  { key: 'external', label: 'External Specialist', icon: UserPlus },
  { key: 'directory', label: 'From Directory', icon: BookUser },
  { key: 'internal', label: 'Internal Doctor', icon: UserCog },
]

export default function LiveSpecialistVisits({ caseId, sessions = [], onChanged, readOnly = false, locationCode = null }) {
  const [mode, setMode] = useState('external')        // external (default) | directory | internal
  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [note, setNote] = useState('')
  const [when, setWhen] = useState(nowLocalDatetime())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [directory, setDirectory] = useState([])
  const [internal, setInternal] = useState([])

  // External specialist directory (always) + internal duty doctors (optional source).
  useEffect(() => {
    let alive = true
    fetchSpecialistDirectory({ activeOnly: true }).then((d) => { if (alive) setDirectory(d) }).catch(() => {})
    fetchInternalDoctors(locationCode).then((d) => { if (alive) setInternal(d) }).catch(() => {})
    return () => { alive = false }
  }, [locationCode])

  function pickDirectory(id) {
    const d = directory.find((x) => x.id === id)
    if (!d) return
    setName(d.name); setSpecialty(d.specialty || '')
  }
  function pickInternal(staffName) {
    const d = internal.find((x) => x.name === staffName)
    setName(staffName)
    if (d?.specialty) setSpecialty(d.specialty)
  }
  function switchMode(m) { setMode(m); setName(''); setSpecialty('') }

  async function add() {
    if (!name.trim()) { setError('Enter the specialist doctor name.'); return }
    setBusy(true); setError(null)
    try {
      await insertEncounter(caseId, {
        specialist: name.trim() || null,
        specialty: specialty.trim() || null,
        source: mode === 'internal' ? 'internal' : 'external',
        note: note.trim() || null,
        checkInAt: when ? new Date(when).toISOString() : undefined,
        status: 'active',
      })
      setName(''); setSpecialty(''); setNote(''); setWhen(nowLocalDatetime())
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
        description="External visiting specialists recorded per case. Specialists are not staff — no login or attendance. Operational tracking only; no billing impact." />

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
          {sessions.map((s) => {
            const title = s.specialistName
              ? s.specialistName + (s.specialty ? ` — ${s.specialty}` : '')
              : (s.visitNote || s.note || 'Specialist visit')
            const isInternal = s.source === 'Internal'
            return (
              <div key={s.id} className="rounded-xl p-3 flex items-start gap-3"
                style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                <span className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'white', border: '1px solid var(--p-border)', color: 'var(--p-brand-mid)' }}>
                  {s.sequenceNo || '•'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex flex-wrap items-center gap-2" style={{ color: 'var(--p-ink-900)' }}>
                    <span className="truncate">{title}</span>
                    {s.source && (
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded"
                        style={isInternal
                          ? { background: 'rgba(18,43,83,0.10)', color: 'var(--p-brand-mid)' }
                          : { background: 'rgba(15,181,169,0.14)', color: '#0A7A72' }}>
                        {isInternal ? 'Internal' : 'External'}
                      </span>
                    )}
                  </div>
                  {s.specialistName && s.visitNote && (
                    <div className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-600, #475569)' }}>{s.visitNote}</div>
                  )}
                  <div className="text-[11px] mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: 'var(--p-ink-500)' }}>
                    <span>Check-in: {s.checkInAt ? fmtDMYHM(s.checkInAt) : '—'}</span>
                    <span>Check-out: {s.checkOutAt ? fmtDMYHM(s.checkOutAt) : (s.status === 'active' ? 'In progress' : '—')}</span>
                    {s.checkInAt && s.checkOutAt && (() => { const mins = Math.max(0, Math.round((new Date(s.checkOutAt) - new Date(s.checkInAt)) / 60000)); const h = Math.floor(mins / 60), m = mins % 60; return <span>· {h ? `${h}h ` : ''}{m}m</span> })()}
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
            )
          })}
        </div>
      )}

      {/* Add form */}
      {!readOnly && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-brand-mid)' }}>
            <Stethoscope className="w-4 h-4" /> Add Specialist Visit
          </div>

          {/* Source selector — External is the default workflow */}
          <div className="flex flex-wrap gap-1.5">
            {SOURCES.map((s) => {
              const active = mode === s.key
              const Icon = s.icon
              return (
                <button key={s.key} type="button" onClick={() => switchMode(s.key)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold transition-all"
                  style={active
                    ? { background: 'var(--p-brand-mid)', color: 'white', boxShadow: '0 2px 8px rgba(18,43,83,0.25)' }
                    : { background: 'white', color: 'var(--p-ink-600, #475569)', border: '1px solid var(--p-border)' }}>
                  <Icon className="w-3.5 h-3.5" /> {s.label}
                </button>
              )
            })}
          </div>

          {/* Directory / internal pickers (fill the fields below; still editable) */}
          {mode === 'directory' && (
            <Field label="Choose from Specialist Directory">
              {directory.length > 0 ? (
                <select className="p-input" defaultValue="" onChange={(e) => pickDirectory(e.target.value)}>
                  <option value="">Select specialist…</option>
                  {directory.map((d) => <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ''}</option>)}
                </select>
              ) : (
                <div className="text-[12px] rounded-lg px-3 py-2" style={{ background: 'white', border: '1px dashed var(--p-border-strong)', color: 'var(--p-ink-500)' }}>
                  No specialists in the directory yet. Add them in Admin → Specialist Doctors, or just type the name below.
                </div>
              )}
            </Field>
          )}
          {mode === 'internal' && (
            <Field label="Choose Internal Clinic / Duty Doctor">
              {internal.length > 0 ? (
                <select className="p-input" defaultValue="" onChange={(e) => pickInternal(e.target.value)}>
                  <option value="">Select doctor…</option>
                  {internal.map((d) => <option key={d.staffId} value={d.name}>{d.name}{d.specialty ? ` — ${d.specialty}` : ''}</option>)}
                </select>
              ) : (
                <div className="text-[12px] rounded-lg px-3 py-2" style={{ background: 'white', border: '1px dashed var(--p-border-strong)', color: 'var(--p-ink-500)' }}>
                  No internal duty doctors assigned to this clinic. Use External Specialist instead.
                </div>
              )}
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Specialist Doctor Name">
              <input className="p-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dr. Ahmed Sami" />
            </Field>
            <Field label="Specialty">
              <input className="p-input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Cardiology" />
            </Field>
            <Field label="Visit Date & Time">
              <input type="datetime-local" className="p-input" value={when} onChange={(e) => setWhen(e.target.value)} />
            </Field>
            <Field label="Note (optional)">
              <input className="p-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Reviewed ECG, advised admission" />
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
