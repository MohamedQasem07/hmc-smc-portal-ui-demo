import { useCallback, useEffect, useState } from 'react'
import {
  Users, IdCard, MapPin, Plus, X, CheckCircle2, AlertTriangle, ShieldCheck, ChevronDown,
  UserPlus, KeyRound, Power, Copy, Link2, Check, Stethoscope,
} from 'lucide-react'
import { SectionHead } from '../../../../premium/p2cPrimitives'
import { Avatar } from '../../../../premium/primitives'
import {
  fetchLocations, fetchAdminUsers, grantUserScope, revokeUserScope,
  fetchAdminStaff, upsertStaff, assignStaffToClinic, unassignStaff,
  createPortalUser, setUserActive, setUserRole, linkUserStaff, generateSetPasswordLink,
} from '../../../../lib/api/portalData'
import { cn } from '../../../../lib/cn'

/* =========================================================================
 * LiveUsersStaffConfig (Sprint 1) — supabase mode only. Admin-only.
 *   Users: create login (Edge Function) · role · enable/disable · scopes ·
 *          staff link · one-time set-password link.
 *   Staff: create/activate · assign nurse/doctor to clinic (drives attendance).
 * No service-role key or plaintext password is handled in the client; user
 * creation + password links go through the admin-users Edge Function.
 * ========================================================================= */

const ROLE_OPTIONS = [
  ['admin', 'Admin — all branches'],
  ['clinic_user', 'Clinic user'],
  ['reception_user', 'Reception user'],
  ['nurse', 'Nurse'],
  ['doctor', 'Doctor'],
  ['treasury', 'Treasury'],
  ['insurance_staff', 'Insurance staff'],
  ['viewer_auditor', 'Viewer / auditor'],
  ['owner', 'Owner'],
]
const SCOPED_ROLE = (role) => role !== 'admin' && role !== 'owner'

function setPwUrl(email, otp) {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`
  return `${base}#/set-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(otp)}`
}

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

function Select({ value, onChange, children, className, disabled }) {
  return (
    <div className={cn('relative', className)}>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="p-input appearance-none w-full pr-8 h-9 text-[12px] disabled:opacity-50">{children}</select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
    </div>
  )
}

/** One-time set-password link box (copyable). Shown after create / generate. */
function LinkBox({ email, otp, link, onClose }) {
  const [copied, setCopied] = useState(false)
  const url = otp ? setPwUrl(email, otp) : link
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }
  return (
    <div className="rounded-xl p-3 space-y-2 text-[12px]" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
      <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--p-ink-800)' }}>
        <Link2 className="w-3.5 h-3.5" /> One-time set / reset-password link for {email}
        {onClose && <button className="ml-auto" onClick={onClose}><X className="w-3.5 h-3.5" /></button>}
      </div>
      <div className="flex items-center gap-2">
        <input readOnly value={url} className="p-input h-8 flex-1 text-[11px]" onFocus={(e) => e.target.select()} />
        <button onClick={copy} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-bold p-btn-primary">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p style={{ color: 'var(--p-ink-500)' }}>Send this to the user. It is one-time and time-limited; they choose their own password (no password is stored here).</p>
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
        <span>Live, admin-only. Create logins, set roles &amp; branch <strong>scopes</strong>, link staff, and issue one-time <strong>set / reset-password</strong> links (first-time setup or forgotten-password reset — each fresh link invalidates the prior code).
          Passwords are never stored here — users set their own via a secure server-issued link that always targets their real login email.</span>
      </div>
      <div className="flex items-center gap-1.5">
        {[['users', 'Users & Access', Users], ['staff', 'Staff & Assignments', IdCard]].map(([id, label, Icon]) => (
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
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  // Persist the generated one-time link in sessionStorage so it survives any
  // re-render/remount and can't be lost before the admin copies it.
  const [linkBox, setLinkBoxState] = useState(() => {
    try { const r = sessionStorage.getItem('aegis-last-setpw-link'); return r ? JSON.parse(r) : null } catch { return null }
  })
  const setLinkBox = useCallback((box) => {
    setLinkBoxState(box)
    try { box ? sessionStorage.setItem('aegis-last-setpw-link', JSON.stringify(box)) : sessionStorage.removeItem('aegis-last-setpw-link') } catch { /* ignore */ }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, l, s] = await Promise.all([fetchAdminUsers(), fetchLocations(), fetchAdminStaff()])
      setUsers(u); setLocations(l.filter((x) => x.active)); setStaff(s)
    } catch (e) { onErr(e) } finally { setLoading(false) }
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
  async function changeRole(user, role) {
    if (role === user.role) return
    setBusy(true)
    try { const r = await setUserRole(user.userId, role); if (!r.ok) throw new Error(r.error); onOk(`${user.displayName} is now ${role}.`); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  async function toggleActive(user) {
    setBusy(true)
    try { const r = await setUserActive(user.userId, !user.active); if (!r.ok) throw new Error(r.error); onOk(`${user.displayName} ${user.active ? 'disabled' : 'enabled'}.`); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  async function changeStaffLink(user, staffId) {
    setBusy(true)
    try { const r = await linkUserStaff(user.userId, staffId || null); if (!r.ok) throw new Error(r.error); onOk(`Staff link updated for ${user.displayName}.`); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  async function genLink(user) {
    setBusy(true)
    try {
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}#/set-password`
      const r = await generateSetPasswordLink({ userId: user.userId, redirectTo })
      if (!r.ok) throw new Error(r.error)
      // Use the authoritative login email the Edge Function resolved from auth.users —
      // NEVER the display name (not a valid email; it breaks the set-password page).
      const loginEmail = r.email || user.email
      if (!loginEmail) throw new Error("Could not resolve this user's login email.")
      setLinkBox({ email: loginEmail, otp: r.email_otp, link: r.action_link })
      onOk(`Set / reset-password link generated for ${user.displayName}.`)
    } catch (e) { onErr(e) } finally { setBusy(false) }
  }

  if (loading) return <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading users…</div>
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SectionHead eyebrow="portal_user_profiles + scopes" title={`Users — ${users.length}`} description="Logins, roles, branch scopes, and staff links. Admins/owners are unscoped (see all)." />
        <button onClick={() => { setShowAdd((s) => !s); setLinkBox(null) }}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-bold p-btn-primary shrink-0">
          <UserPlus className="w-3.5 h-3.5" /> {showAdd ? 'Close' : 'Add User'}
        </button>
      </div>

      {showAdd && <AddUserForm locations={locations} staff={staff} busy={busy} setBusy={setBusy}
        onErr={onErr} onCreated={(res, email) => { setShowAdd(false); setLinkBox({ email: res.email || email, otp: res.email_otp, link: res.action_link }); onOk('User created.'); load() }} />}

      {linkBox && <LinkBox {...linkBox} onClose={() => setLinkBox(null)} />}

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.userId} className={cn('p-card p-4 space-y-3', !u.active && 'opacity-70')}>
            {/* header row */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex items-center gap-2.5 min-w-0 lg:w-72">
                <Avatar name={u.displayName} size={32} tone={SCOPED_ROLE(u.role) ? 'navy' : 'teal'} />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: 'var(--p-ink-900)' }}>{u.displayName}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--p-ink-500)' }}>{u.email || u.userId.slice(0, 8)}{u.active ? '' : ' · disabled'}</div>
                </div>
              </div>
              <Select value={u.role} onChange={(v) => changeRole(u, v)} disabled={busy} className="lg:w-56">
                {ROLE_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </Select>
              <button onClick={() => toggleActive(u)} disabled={busy}
                className={cn('inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-bold',
                  u.active ? 'p-btn-ghost' : 'p-btn-primary')}>
                <Power className="w-3.5 h-3.5" /> {u.active ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => genLink(u)} disabled={busy} title="First-time setup OR forgotten-password reset. Issues a fresh one-time link to the user's login email and invalidates any previous pending code."
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-bold p-btn-ghost">
                <KeyRound className="w-3.5 h-3.5" /> Set / Reset password link
              </button>
            </div>

            {/* scopes row */}
            {SCOPED_ROLE(u.role) && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.12em] font-bold mr-1" style={{ color: 'var(--p-ink-400)' }}>Branches</span>
                {u.scopes.length === 0
                  ? <span className="text-[12px] italic" style={{ color: 'var(--p-ink-400)' }}>none</span>
                  : u.scopes.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 h-7 rounded-full text-[11px] font-semibold"
                      style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-800)', border: '1px solid var(--p-border)' }}>
                      <MapPin className="w-3 h-3" /> {s.locationName || s.locationCode}
                      <button onClick={() => revoke(s.id, u)} disabled={busy} className="ml-0.5 w-7 h-7 rounded-full inline-flex items-center justify-center" style={{ background: 'var(--p-mixed-soft)', color: '#B14242' }}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                <Select value="" onChange={(v) => grant(u, v)} className="w-48">
                  <option value="">+ Add branch…</option>
                  {locations.filter((l) => !u.scopes.some((s) => s.locationId === l.id)).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
              </div>
            )}

            {/* staff link row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.12em] font-bold mr-1" style={{ color: 'var(--p-ink-400)' }}>Staff link</span>
              <Select value={u.linkedStaffId || ''} onChange={(v) => changeStaffLink(u, v)} disabled={busy} className="w-64">
                <option value="">— not linked —</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.role})</option>)}
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddUserForm({ locations, staff, busy, setBusy, onErr, onCreated }) {
  const [form, setForm] = useState({ fullName: '', email: '', role: 'clinic_user', active: true, linkedStaffId: '', scopeCodes: [] })
  const set = (patch) => setForm((p) => ({ ...p, ...patch }))
  const toggleScope = (code) => setForm((p) => ({ ...p, scopeCodes: p.scopeCodes.includes(code) ? p.scopeCodes.filter((c) => c !== code) : [...p.scopeCodes, code] }))

  async function submit() {
    if (!form.email.trim() || !form.fullName.trim()) { onErr(new Error('Full name and email are required.')); return }
    setBusy(true)
    try {
      const r = await createPortalUser({
        email: form.email.trim(), display_name: form.fullName.trim(), role: form.role, active: form.active,
        scope_location_codes: SCOPED_ROLE(form.role) ? form.scopeCodes : [],
        linked_staff_id: form.linkedStaffId || null,
      })
      if (!r.ok) throw new Error(r.error)
      onCreated(r, form.email.trim())
    } catch (e) { onErr(e) } finally { setBusy(false) }
  }

  return (
    <div className="p-card p-4 space-y-3" style={{ border: '1px solid var(--p-brand-mid)' }}>
      <div className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>New login</div>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <div className="sm:col-span-5 flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Full name</label>
          <input value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} placeholder="e.g. Sara Ahmed" className="p-input h-9" />
        </div>
        <div className="sm:col-span-4 flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Email (login)</label>
          <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="user@example.com" className="p-input h-9" />
        </div>
        <div className="sm:col-span-3 flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Role</label>
          <Select value={form.role} onChange={(v) => set({ role: v })}>{ROLE_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</Select>
        </div>
      </div>

      {SCOPED_ROLE(form.role) && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Branches (one or more)</label>
          <div className="flex flex-wrap gap-1.5">
            {locations.map((l) => (
              <button key={l.id} type="button" onClick={() => toggleScope(l.code)}
                className={cn('inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold border',
                  form.scopeCodes.includes(l.code) ? 'p-btn-primary' : '')}
                style={form.scopeCodes.includes(l.code) ? {} : { background: 'var(--p-surface-tint)', color: 'var(--p-ink-700)', borderColor: 'var(--p-border)' }}>
                {form.scopeCodes.includes(l.code) ? <Check className="w-3 h-3" /> : <MapPin className="w-3 h-3" />} {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
        <div className="sm:col-span-6 flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Link to staff (optional)</label>
          <Select value={form.linkedStaffId} onChange={(v) => set({ linkedStaffId: v })}>
            <option value="">— not linked —</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.role})</option>)}
          </Select>
        </div>
        <div className="sm:col-span-3">
          <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: 'var(--p-ink-700)' }}>
            <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active
          </label>
        </div>
        <div className="sm:col-span-3">
          <button onClick={submit} disabled={busy || !form.email.trim() || !form.fullName.trim()}
            className={cn('w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-full text-xs font-bold p-btn-primary',
              (busy || !form.email.trim() || !form.fullName.trim()) && 'opacity-40 cursor-not-allowed')}>
            <UserPlus className="w-3.5 h-3.5" /> Create user
          </button>
        </div>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>A one-time set-password link is generated on create — copy it and send it to the user.</p>
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
  const [form, setForm] = useState({ fullName: '', role: 'nurse', specialty: '' })
  const load = useCallback(async () => {
    setLoading(true)
    try { const [s, l] = await Promise.all([fetchAdminStaff(), fetchLocations()]); setStaff(s); setLocations(l.filter((x) => x.active)) }
    catch (e) { onErr(e) } finally { setLoading(false) }
  }, [onErr])
  useEffect(() => { load() }, [load])

  async function addStaff() {
    if (!form.fullName.trim()) return
    setBusy(true)
    try {
      await upsertStaff({ fullName: form.fullName.trim(), role: form.role, specialty: form.role === 'doctor' ? form.specialty.trim() : '', active: true })
      onOk(`Staff ${form.fullName.trim()} added.`); setForm({ fullName: '', role: 'nurse', specialty: '' }); await load()
    } catch (e) { onErr(e) } finally { setBusy(false) }
  }
  async function saveSpecialty(s, specialty) {
    setBusy(true)
    try { await upsertStaff({ id: s.id, fullName: s.fullName, role: s.role, phone: s.phone, active: s.active, specialty }); onOk(`Specialty updated for ${s.fullName}.`); await load() }
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
  async function toggleActive(s) {
    setBusy(true)
    try { await upsertStaff({ id: s.id, fullName: s.fullName, role: s.role, phone: s.phone, active: !s.active }); onOk(`${s.fullName} ${s.active ? 'deactivated' : 'activated'}.`); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  if (loading) return <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading staff…</div>
  return (
    <div className="space-y-3">
      <SectionHead eyebrow="portal_staff + assignments" title={`Staff — ${staff.length}`} description="Real people for attendance/operations. Assign nurses/doctors to clinics — this is what the attendance/duty pickers read." />

      <div className="p-card p-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
        <div className="sm:col-span-6 flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Full name</label>
          <input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="e.g. Nurse Mona" className="p-input h-9" />
        </div>
        <div className="sm:col-span-3 flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Type</label>
          <Select value={form.role} onChange={(v) => setForm((p) => ({ ...p, role: v }))}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
        </div>
        <div className="sm:col-span-3">
          <button onClick={addStaff} disabled={busy || !form.fullName.trim()} className={cn('w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-full text-xs font-bold p-btn-primary', (busy || !form.fullName.trim()) && 'opacity-40 cursor-not-allowed')}><Plus className="w-3.5 h-3.5" /> Add Staff</button>
        </div>
        {form.role === 'doctor' && (
          <div className="sm:col-span-12 flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Specialty (doctor)</label>
            <input value={form.specialty} onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))} placeholder="e.g. General Surgery, Cardiology, Pediatrics" className="p-input h-9" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {staff.map((s) => (
          <div key={s.id} className={cn('p-card p-4 flex flex-col lg:flex-row lg:items-center gap-3', !s.active && 'opacity-60')}>
            <div className="flex items-center gap-2.5 min-w-0 lg:w-64">
              <Avatar name={s.fullName} size={32} tone={s.role === 'doctor' ? 'teal' : 'navy'} />
              <div className="min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: 'var(--p-ink-900)' }}>{s.fullName}</div>
                <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
                  {s.role}{s.role === 'doctor' && s.specialty ? ` · ${s.specialty}` : ''} · {s.staffCode}{s.active ? '' : ' · inactive'}
                </div>
              </div>
            </div>
            {s.role === 'doctor' && <SpecialtyInline s={s} busy={busy} onSave={saveSpecialty} />}
            <div className="flex-1 flex flex-wrap items-center gap-1.5">
              {s.assignments.length === 0 ? (
                <span className="text-[12px] italic" style={{ color: 'var(--p-ink-400)' }}>Not assigned to any clinic</span>
              ) : s.assignments.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 h-7 rounded-full text-[11px] font-semibold"
                  style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-800)', border: '1px solid var(--p-border)' }}>
                  <MapPin className="w-3 h-3" /> {a.locationName || a.locationCode} · {a.role}
                  <button onClick={() => unassign(a, s)} disabled={busy} className="ml-0.5 w-7 h-7 rounded-full inline-flex items-center justify-center" style={{ background: 'var(--p-mixed-soft)', color: '#B14242' }}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <button onClick={() => toggleActive(s)} disabled={busy}
              className={cn('inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-bold', s.active ? 'p-btn-ghost' : 'p-btn-primary')}>
              <Power className="w-3.5 h-3.5" /> {s.active ? 'Deactivate' : 'Activate'}
            </button>
            {(s.role === 'nurse' || s.role === 'doctor') && (
              <Select value="" onChange={(v) => assign(s, v)} className="lg:w-52">
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

/** Inline specialty editor for a doctor staff row (reuses portal_staff.specialty). */
function SpecialtyInline({ s, busy, onSave }) {
  const [val, setVal] = useState(s.specialty || '')
  const dirty = (val || '') !== (s.specialty || '')
  return (
    <div className="flex items-center gap-1.5 w-full lg:w-72">
      <Stethoscope className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--p-ink-400)' }} />
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Specialty"
        className="p-input h-8 text-[12px] flex-1" />
      {dirty && (
        <button onClick={() => onSave(s, val.trim())} disabled={busy}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-bold p-btn-primary shrink-0">
          <Check className="w-3.5 h-3.5" /> Save
        </button>
      )}
    </div>
  )
}
