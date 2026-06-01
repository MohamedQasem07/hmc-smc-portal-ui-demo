import { useEffect, useMemo, useState } from 'react'
import { Stethoscope, Search, Check, X, Power, Pencil, AlertTriangle, CheckCircle2, UserPlus } from 'lucide-react'
import { fetchSpecialistDirectory, upsertSpecialistDoctor, setSpecialistDoctorActive } from '../../../../lib/api/portalData'

/* =========================================================================
 * LiveSpecialistDirectory — admin CRUD for EXTERNAL visiting specialists
 * (portal_specialist_doctors, migration 030). NOT staff. supabase-mode only.
 * Add / edit / deactivate / reactivate · search by name · filter by specialty
 * + status. Read by any active user for the case specialist-visit picker.
 * ========================================================================= */

const COMMON_SPECIALTIES = [
  'Cardiology', 'General Surgery', 'Orthopedic', 'Pediatrics', 'Internal Medicine',
  'ENT', 'Dermatology', 'Urology', 'Neurology', 'Ophthalmology', 'Dental', 'Anesthesia',
]

export default function LiveSpecialistDirectory() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [specFilter, setSpecFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)

  async function load() {
    setLoading(true)
    try { setRows(await fetchSpecialistDirectory({})); setErr(null) }
    catch (e) { setErr(e?.message || 'Could not load specialists.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const specialties = useMemo(
    () => Array.from(new Set(rows.map((r) => r.specialty).filter(Boolean))).sort(),
    [rows],
  )
  const filtered = useMemo(() => rows.filter((r) =>
    (!search || (r.name || '').toLowerCase().includes(search.toLowerCase())) &&
    (!specFilter || r.specialty === specFilter) &&
    (statusFilter === 'all' || (statusFilter === 'active' ? r.active : !r.active)),
  ), [rows, search, specFilter, statusFilter])

  const activeCount = rows.filter((r) => r.active).length
  function flash(msg) { setOk(msg); setTimeout(() => setOk(null), 2500) }

  async function save(payload) {
    setBusy(true); setErr(null)
    try {
      await upsertSpecialistDoctor(payload)
      flash(payload.id ? 'Specialist updated.' : `Added ${payload.doctorName}.`)
      setAdding(false); setEditing(null)
      await load()
    } catch (e) { setErr(e?.message || 'Save failed.') }
    finally { setBusy(false) }
  }
  async function toggleActive(r) {
    setBusy(true); setErr(null)
    try { await setSpecialistDoctorActive(r.id, !r.active); flash(`${r.name} ${r.active ? 'deactivated' : 'reactivated'}.`); await load() }
    catch (e) { setErr(e?.message || 'Update failed.') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      {err && <Banner tone="err">{err}</Banner>}
      {ok && <Banner tone="ok">{ok}</Banner>}

      {/* header / stats / add */}
      <div className="p-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5">
          <Stat label="Specialists" value={rows.length} />
          <Stat label="Active" value={activeCount} />
          <Stat label="Inactive" value={rows.length - activeCount} />
        </div>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditing(null) }}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-bold p-btn-primary">
            <UserPlus className="w-4 h-4" /> Add Specialist
          </button>
        )}
      </div>

      {adding && <SpecialistForm busy={busy} onCancel={() => setAdding(false)} onSave={save} />}

      {/* filters */}
      <div className="p-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Labeled label="Search by name">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--p-ink-400, #94A3B8)' }} />
            <input className="p-input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Doctor name…" />
          </div>
        </Labeled>
        <Labeled label="Specialty">
          <select className="p-input" value={specFilter} onChange={(e) => setSpecFilter(e.target.value)}>
            <option value="">All specialties</option>
            {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Labeled>
        <Labeled label="Status">
          <select className="p-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </Labeled>
      </div>

      {/* list */}
      {loading ? (
        <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-500)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="p-card p-10 text-center" style={{ color: 'var(--p-ink-500)' }}>
          <Stethoscope className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--p-ink-300, #CBD5E1)' }} />
          <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-700, #334155)' }}>
            {rows.length === 0 ? 'No specialist doctors yet.' : 'No specialists match the filters.'}
          </div>
          {rows.length === 0 && <div className="text-[13px] mt-1">Click “Add Specialist” to build the directory.</div>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => editing === r.id ? (
            <SpecialistForm key={r.id} initial={r} busy={busy} onCancel={() => setEditing(null)} onSave={save} />
          ) : (
            <div key={r.id} className="p-card p-4 flex flex-wrap items-center gap-3 transition-shadow hover:shadow-md" style={{ opacity: r.active ? 1 : 0.65 }}>
              <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0"
                style={{ background: 'rgba(15,181,169,0.12)', color: '#0A7A72' }}>
                <Stethoscope className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-[160px]">
                <div className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{r.name}</div>
                <div className="text-[12px]" style={{ color: 'var(--p-ink-500)' }}>
                  {r.specialty}{r.phone ? ` · ${r.phone}` : ''}{r.notes ? ` · ${r.notes}` : ''}
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-full shrink-0"
                style={r.active ? { background: 'rgba(15,181,169,0.14)', color: '#0A7A72' } : { background: 'var(--p-subtle, #F1F5F9)', color: 'var(--p-ink-500)' }}>
                {r.active ? 'Active' : 'Inactive'}
              </span>
              <button onClick={() => { setEditing(r.id); setAdding(false) }} disabled={busy}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-[11px] font-semibold p-btn-ghost shrink-0">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => toggleActive(r)} disabled={busy}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-[11px] font-semibold shrink-0"
                style={{ border: '1px solid var(--p-border)', color: r.active ? '#B14242' : '#0A7A72', background: 'white' }}>
                <Power className="w-3.5 h-3.5" /> {r.active ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SpecialistForm({ initial = null, onSave, onCancel, busy }) {
  const [doctorName, setDoctorName] = useState(initial?.name || '')
  const [specialty, setSpecialty] = useState(initial?.specialty || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const canSave = doctorName.trim() && specialty.trim()
  return (
    <div className="p-card p-4 space-y-3" style={{ border: '1px solid var(--p-brand-sky, #5E83B5)' }}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-brand-mid)' }}>
        <Stethoscope className="w-4 h-4" /> {initial ? 'Edit Specialist' : 'New Specialist'}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Labeled label="Doctor name *">
          <input className="p-input" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="e.g. Dr. Ahmed Sami" />
        </Labeled>
        <Labeled label="Specialty *">
          <input className="p-input" list="spec-suggestions" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Cardiology" />
          <datalist id="spec-suggestions">{COMMON_SPECIALTIES.map((s) => <option key={s} value={s} />)}</datalist>
        </Labeled>
        <Labeled label="Phone (optional)">
          <input className="p-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +20 ..." />
        </Labeled>
        <Labeled label="Notes (optional)">
          <input className="p-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. On-call, visits on request" />
        </Labeled>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={busy} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold p-btn-ghost">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button onClick={() => onSave({ id: initial?.id, doctorName, specialty, phone, notes, active: initial ? initial.active : true })}
          disabled={busy || !canSave}
          className="inline-flex items-center gap-1.5 h-9 px-5 rounded-full text-xs font-bold p-btn-primary" style={{ opacity: canSave ? 1 : 0.5 }}>
          <Check className="w-3.5 h-3.5" /> {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xl font-bold" style={{ color: 'var(--p-ink-900)' }}>{value}</div>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
    </div>
  )
}
function Labeled({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</label>
      {children}
    </div>
  )
}
function Banner({ tone, children }) {
  const ok = tone === 'ok'
  return (
    <div className="rounded-xl px-3 py-2 flex items-start gap-2 text-[12px] font-semibold"
      style={ok ? { background: 'rgba(15,181,169,0.12)', color: '#0A7A72', border: '1px solid rgba(15,181,169,0.3)' }
                : { background: 'var(--p-mixed-soft, #FFF1F1)', color: '#B14242', border: '1px solid #F0B5B5' }}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  )
}
