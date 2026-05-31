import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Users, IdCard, MapPin, Plus, X, CheckCircle2, AlertTriangle, ShieldCheck, ChevronDown, Lock,
} from 'lucide-react'
import { SectionHead } from '../../../../premium/p2cPrimitives'
import { StatusPill, Avatar } from '../../../../premium/primitives'
import {
  fetchLocations, fetchAdminUsers, grantUserScope, revokeUserScope,
  fetchAdminStaff, upsertStaff, assignStaffToClinic, unassignStaff,
} from '../../../../lib/api/portalData'
import { cn } from '../../../../lib/cn'

/* =========================================================================
 * LiveUsersStaffConfig (config-first staging) — supabase mode only.
 *   - Users: portal_user_profiles (read) + portal_user_location_scopes (grant/revoke)
 *   - Staff: portal_staff (read/add/activate) + portal_staff_location_assignments
 *            (assign nurse/doctor to a clinic — drives attendance/duty pickers)
 * NO passwords / auth-user creation here (needs a server-side function).
 * ========================================================================= */

function Banner({ tone, children, onClose }) {
  const s = tone === 'ok'
    ? { bg: 'var(--p-finalized-soft)', fg: '#076D4A', bd: '#9FD4BB', I: CheckCircle2 }
    : { bg: 'var(--p-mixed-soft)', fg: '#B14242', bd: '#F0B5B5', I: AlertTriangle }
  const I = s.I
  return (
    <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]" style={{ background: s.bg, color: s.fg, border: `1px solid ${s.bd}` }}>
      <I className="w-4 h-4 mt-0.5 shrink-0" /><span className="flex-1 font-semibold">{children}</span>
      {onClose && <button onClick={onClose}><X className="w-3.5 h-3.5" /></button>}
    </div>
  )
}

function Select({ value, onChange, children, className }) {
  return (
    <div className={cn('relative', className)}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="p-input appearance-none w-full pr-8 h-9 text-[12px]">{children}</select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
    </div>
  )
}

export default function LiveUsersStaffConfig() {
  const [tab, setTab] = useState('users')
  const [feedback, setFeedback] = useState(null)
  const ok = (m) => setFeedback({ tone: 'ok', m })
  const err = (e) => setFeedback({ tone: 'err', m: e?.message || String(e) })
  return (
    <div className="space-y-5">
      <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]"
        style={{ background: 'var(--p-brand-pale)', color: 'var(--p-ink-800)', border: '1px solid #BCCDE8' }}>
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--p-brand-mid)' }} />
        <span>Live, admin-only. Assign users to clinic/branch <strong>scopes</strong> and nurses/doctors to clinics for attendance.
          <span className="inline-flex items-center gap-1 ml-1"><Lock className="w-3 h-3" /> No passwords here — creating new logins needs owner approval + a server function.</span></span>
      </div>
      <div className="flex items-center gap-1.5">
        {[['users', 'Users & Scopes', Users], ['staff', 'Staff & Assignments', IdCard]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => { setTab(id); setFeedback(null) }}
            className={cn('inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-bold', tab === id ? 'p-btn-primary' : 'p-btn-ghost')}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>
      {feedback && <Banner tone={feedback.tone} onClose={() => setFeedback(null)}>{feedback.m}</Banner>}
      {tab === 'users' ? <UsersConfig onOk={ok} onErr={err} /> : <StaffConfig onOk={ok} onErr={err} />}
    </div>
  )
}

// ===================================================================== Users
function UsersConfig({ onOk, onErr }) {
  const [users, setUsers] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try { const [u, l] = await Promise.all([fetchAdminUsers(), fetchLocations()]); setUsers(u); setLocations(l.filter((x) => x.active)) }
    catch (e) { onErr(e) } finally { setLoading(false) }
  }, [onErr])
  useEffect(() => { load() }, [load])

  async function grant(user, locationId) {
    if (!locationId) return
    setBusy(true)
    try { await grantUserScope(user.userId, locationId); onOk(`Scope granted to ${user.displayName}.`); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  async function revoke(scopeId, user) {
    setBusy(true)
    try { await revokeUserScope(scopeId); onOk(`Scope removed from ${user.displayName}.`); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  if (loading) return <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading users…</div>
  return (
    <div className="space-y-3">
      <SectionHead eyebrow="portal_user_profiles + scopes" title={`Users — ${users.length}`} description="Existing portal logins and their clinic/branch scopes. Admins are unscoped (see all)." />
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.userId} className="p-card p-4 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-2.5 min-w-0 lg:w-64">
              <Avatar name={u.displayName} size={32} tone={u.role === 'admin' ? 'teal' : 'navy'} />
              <div className="min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: 'var(--p-ink-900)' }}>{u.displayName}</div>
                <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{u.role}{u.active ? '' : ' · inactive'}</div>
              </div>
            </div>
            <div className="flex-1 flex flex-wrap items-center gap-1.5">
              {u.role === 'admin' ? (
                <span className="text-[12px] italic" style={{ color: 'var(--p-ink-400)' }}>All locations (admin)</span>
              ) : u.scopes.length === 0 ? (
                <span className="text-[12px] italic" style={{ color: 'var(--p-ink-400)' }}>No scope assigned</span>
              ) : u.scopes.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 h-7 rounded-full text-[11px] font-semibold"
                  style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-800)', border: '1px solid var(--p-border)' }}>
                  <MapPin className="w-3 h-3" /> {s.locationName || s.locationCode}
                  <button onClick={() => revoke(s.id, u)} disabled={busy} className="ml-0.5 w-5 h-5 rounded-full inline-flex items-center justify-center" style={{ background: 'var(--p-mixed-soft)', color: '#B14242' }}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            {u.role !== 'admin' && (
              <Select value="" onChange={(v) => grant(u, v)} className="lg:w-56">
                <option value="">+ Add scope…</option>
                {locations.filter((l) => !u.scopes.some((s) => s.locationId === l.id)).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ===================================================================== Staff
const STAFF_ROLES = ['nurse', 'doctor', 'reception', 'other']
function StaffConfig({ onOk, onErr }) {
  const [staff, setStaff] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ fullName: '', role: 'nurse' })
  const load = useCallback(async () => {
    setLoading(true)
    try { const [s, l] = await Promise.all([fetchAdminStaff(), fetchLocations()]); setStaff(s); setLocations(l.filter((x) => x.active)) }
    catch (e) { onErr(e) } finally { setLoading(false) }
  }, [onErr])
  useEffect(() => { load() }, [load])

  async function addStaff() {
    if (!form.fullName.trim()) return
    setBusy(true)
    try { await upsertStaff({ fullName: form.fullName.trim(), role: form.role, active: true }); onOk(`Staff ${form.fullName.trim()} added.`); setForm({ fullName: '', role: 'nurse' }); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  async function assign(s, locationId) {
    if (!locationId) return
    const role = (s.role === 'nurse' || s.role === 'doctor') ? s.role : 'other'
    setBusy(true)
    try { await assignStaffToClinic(s.id, locationId, role); onOk(`${s.fullName} assigned.`); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  async function unassign(a, s) {
    setBusy(true)
    try { await unassignStaff(a.id); onOk(`${s.fullName} unassigned.`); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  if (loading) return <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading staff…</div>
  return (
    <div className="space-y-3">
      <SectionHead eyebrow="portal_staff + assignments" title={`Staff — ${staff.length}`} description="Assign nurses/doctors to clinics — this is exactly what the attendance/duty pickers read." />

      {/* Add staff */}
      <div className="p-card p-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
        <div className="sm:col-span-6 flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Full name</label>
          <input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="e.g. Nurse Mona" className="p-input h-9" />
        </div>
        <div className="sm:col-span-3 flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Role</label>
          <Select value={form.role} onChange={(v) => setForm((p) => ({ ...p, role: v }))}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
        </div>
        <div className="sm:col-span-3">
          <button onClick={addStaff} disabled={busy || !form.fullName.trim()} className={cn('w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-full text-xs font-bold p-btn-primary', (busy || !form.fullName.trim()) && 'opacity-40 cursor-not-allowed')}><Plus className="w-3.5 h-3.5" /> Add Staff</button>
        </div>
      </div>

      <div className="space-y-2">
        {staff.map((s) => (
          <div key={s.id} className={cn('p-card p-4 flex flex-col lg:flex-row lg:items-center gap-3', !s.active && 'opacity-60')}>
            <div className="flex items-center gap-2.5 min-w-0 lg:w-64">
              <Avatar name={s.fullName} size={32} tone={s.role === 'doctor' ? 'teal' : 'navy'} />
              <div className="min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: 'var(--p-ink-900)' }}>{s.fullName}</div>
                <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{s.role} · {s.staffCode}</div>
              </div>
            </div>
            <div className="flex-1 flex flex-wrap items-center gap-1.5">
              {s.assignments.length === 0 ? (
                <span className="text-[12px] italic" style={{ color: 'var(--p-ink-400)' }}>Not assigned to any clinic</span>
              ) : s.assignments.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 h-7 rounded-full text-[11px] font-semibold"
                  style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-800)', border: '1px solid var(--p-border)' }}>
                  <MapPin className="w-3 h-3" /> {a.locationName || a.locationCode} · {a.role}
                  <button onClick={() => unassign(a, s)} disabled={busy} className="ml-0.5 w-5 h-5 rounded-full inline-flex items-center justify-center" style={{ background: 'var(--p-mixed-soft)', color: '#B14242' }}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            {(s.role === 'nurse' || s.role === 'doctor') && (
              <Select value="" onChange={(v) => assign(s, v)} className="lg:w-56">
                <option value="">+ Assign to clinic…</option>
                {locations.filter((l) => !s.assignments.some((a) => a.locationId === l.id)).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
