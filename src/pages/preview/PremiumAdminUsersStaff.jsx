import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Users, UserPlus, UserCog, ShieldCheck, Building2, X, CheckCircle2,
  AlertTriangle, Search, KeyRound, PowerOff, Power, Pencil, Link2,
  ChevronDown,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import { PremiumKpi, StatusPill, PremiumButton, PremiumField, PremiumInput } from '../../premium/primitives'
import { useDemoState, useStaff, useUsers } from '../../context/DemoStateContext'
import { useUserMode } from '../../context/UserModeContext'
import {
  STAFF_CLINICS, STAFF_ROLES, USER_ROLE_LABELS, nextStaffCode,
} from '../../data/staffUsers'
import { cn } from '../../lib/cn'
import { IS_SUPABASE } from '../../lib/api/config'
import LiveUsersStaffConfig from './p2c/live/LiveUsersStaffConfig'

/* =========================================================================
 * P2C.R4 — Admin Users & Staff Workspace
 * -----------------------------------------------------------------------
 * Manages two related collections:
 *
 *   STAFF (employees that may appear in attendance) — nurses, doctors,
 *   reception, admin. Each is assigned to a single clinic / branch and
 *   carries an active/inactive flag.
 *
 *   PORTAL USERS (login accounts) — Admin, External Clinic, Branch
 *   Reception. Each clinic/branch user is scoped to one clinic / branch.
 *   Admin sees everything.
 *
 *   CLINIC ASSIGNMENT MATRIX — at-a-glance count of who is assigned where.
 *
 * This page is Admin-only. Non-admin sessions are redirected to login.
 * ========================================================================= */

export default function PremiumAdminUsersStaff() {
  const { currentUser, isSignedIn } = useUserMode()
  if (!isSignedIn) return <Navigate to="/login" replace />
  if (currentUser?.role !== 'admin') return <Navigate to={defaultPathFor(currentUser)} replace />

  return (
    <AdminShell active="users-staff" searchPlaceholder="Search staff or portal user…">
      {IS_SUPABASE ? <LiveUsersStaffConfigWrap /> : <UsersStaffBody />}
    </AdminShell>
  )
}

function LiveUsersStaffConfigWrap() {
  return (
    <div className="px-5 md:px-8 lg:px-10 pt-6 pb-16 max-w-[1200px] mx-auto space-y-5">
      <div>
        <div className="p-eyebrow mb-1">Users &amp; Staff · Live</div>
        <h1 className="p-h1 text-2xl sm:text-3xl" style={{ color: 'var(--p-ink-900)' }}>Users, Scopes &amp; Staff Assignments</h1>
      </div>
      <LiveUsersStaffConfig />
    </div>
  )
}

function defaultPathFor(u) {
  if (!u) return '/login'
  switch (u.role) {
    case 'clinic_nurse':       return '/clinic/dashboard'
    case 'reception_kawther':  return '/reception/al-kawther/dashboard'
    case 'reception_sheraton': return '/reception/sheraton/dashboard'
    default:                   return '/admin-dashboard'
  }
}

// ---------------------------------------------------------------------------
function UsersStaffBody() {
  const staff = useStaff()
  const users = useUsers()
  const [tab, setTab] = useState('staff')
  const [staffQuery, setStaffQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [editingStaff, setEditingStaff] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const filteredStaff = useMemo(() => {
    const q = staffQuery.trim().toLowerCase()
    if (!q) return staff
    return staff.filter((s) =>
      s.fullName.toLowerCase().includes(q) ||
      s.staffCode.toLowerCase().includes(q) ||
      (s.role || '').toLowerCase().includes(q),
    )
  }, [staff, staffQuery])

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      u.username.toLowerCase().includes(q) ||
      (u.displayName || '').toLowerCase().includes(q),
    )
  }, [users, userQuery])

  const kpis = useMemo(() => {
    const active = staff.filter((s) => s.status === 'Active')
    return {
      activeStaff:   active.length,
      nurses:        active.filter((s) => s.role === 'Nurse').length,
      doctors:       active.filter((s) => s.role === 'Doctor').length,
      portalUsers:   users.filter((u) => u.status === 'Active').length,
      clinicsCovered: new Set(active.filter((s) => s.assignedClinicId).map((s) => s.assignedClinicId)).size,
      unassigned:    active.filter((s) => !s.assignedClinicId && s.role !== 'Admin').length,
    }
  }, [staff, users])

  return (
    <div className="w-full px-5 lg:px-10 py-6 max-w-[1500px] mx-auto space-y-6">
      {/* ── Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="p-eyebrow">Administration</div>
          <h1 className="p-h1 text-2xl lg:text-3xl mt-1" style={{ color: 'var(--p-ink-900)' }}>Users &amp; Staff</h1>
          <p className="text-sm mt-1 max-w-2xl" style={{ color: 'var(--p-ink-500)' }}>
            Manage employees that appear in clinic attendance and portal accounts that log into the workspace.
            Each staff member belongs to one clinic or branch; portal users are scoped accordingly.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PremiumButton
            variant="ghost"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => setEditingStaff({ __new: true, staffId: null, staffCode: '', fullName: '', role: 'Nurse', assignedClinicId: 'tropitel', status: 'Active', phone: '', note: '' })}
          >
            Add Staff
          </PremiumButton>
          <PremiumButton
            leftIcon={<UserCog className="w-4 h-4" />}
            onClick={() => setEditingUser({ __new: true, userId: null, username: '', displayName: '', role: 'clinic_nurse', assignedClinicId: 'tropitel', linkedStaffId: null, status: 'Active', demoPassword: 'demo1234' })}
          >
            Create Portal User
          </PremiumButton>
        </div>
      </header>

      {/* ── KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <PremiumKpi tone="navy"    icon={Users}        label="Active Staff"      value={kpis.activeStaff}     hint={`${staff.length} total`} />
        <PremiumKpi tone="teal"    icon={Users}        label="Nurses"            value={kpis.nurses}          hint="Active only" />
        <PremiumKpi tone="cash"    icon={Users}        label="Doctors"           value={kpis.doctors}         hint="Active only" />
        <PremiumKpi tone="navy"    icon={ShieldCheck}  label="Portal Users"      value={kpis.portalUsers}     hint={`${users.length} total`} />
        <PremiumKpi tone="gold"    icon={Building2}    label="Clinics Covered"   value={`${kpis.clinicsCovered} / ${STAFF_CLINICS.length}`} hint="With assigned staff" />
        <PremiumKpi tone="pending" icon={AlertTriangle} label="Unassigned Staff" value={kpis.unassigned}      hint="Need a clinic" />
      </section>

      {/* ── Runtime feedback (e.g. duplicate username) */}
      {feedback && <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />}

      {/* ── Tabs */}
      <nav className="p-card p-1 inline-flex gap-1">
        <TabButton active={tab === 'staff'}     onClick={() => setTab('staff')}     icon={Users}      label="Staff Directory" />
        <TabButton active={tab === 'users'}     onClick={() => setTab('users')}     icon={UserCog}    label="Portal Users" />
        <TabButton active={tab === 'matrix'}    onClick={() => setTab('matrix')}    icon={Building2}  label="Clinic Assignment Matrix" />
      </nav>

      {tab === 'staff' && (
        <StaffTable
          staff={filteredStaff}
          allStaff={staff}
          users={users}
          query={staffQuery}
          onQuery={setStaffQuery}
          onEdit={(s) => setEditingStaff(s)}
        />
      )}
      {tab === 'users' && (
        <UsersTable
          users={filteredUsers}
          staff={staff}
          query={userQuery}
          onQuery={setUserQuery}
          onEdit={(u) => setEditingUser(u)}
        />
      )}
      {tab === 'matrix' && <AssignmentMatrix staff={staff} users={users} />}

      {/* Drawers */}
      {editingStaff && (
        <StaffDrawer
          staff={editingStaff}
          existingStaff={staff}
          onClose={() => setEditingStaff(null)}
          onSaved={(msg) => { setEditingStaff(null); setFeedback({ tone: 'ok', message: msg }) }}
        />
      )}
      {editingUser && (
        <UserDrawer
          user={editingUser}
          staff={staff}
          existingUsers={users}
          onClose={() => setEditingUser(null)}
          onSaved={(msg) => { setEditingUser(null); setFeedback({ tone: 'ok', message: msg }) }}
          onReject={(msg) => setFeedback({ tone: 'reject', message: msg })}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Staff directory
// ---------------------------------------------------------------------------
function StaffTable({ staff, allStaff, users, query, onQuery, onEdit }) {
  const { actions } = useDemoState()
  return (
    <section className="p-card overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b" style={{ borderColor: 'var(--p-border)' }}>
        <div>
          <div className="p-eyebrow">Employees</div>
          <h2 className="p-h2 text-base mt-0.5">Staff Directory</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{staff.length} of {allStaff.length} record{allStaff.length === 1 ? '' : 's'}</p>
        </div>
        <SearchInput value={query} onChange={onQuery} placeholder="Search by name, code, role…" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[820px]">
          <thead>
            <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
              {['Staff Code', 'Employee Name', 'Role', 'Assigned Clinic / Branch', 'Login Linked?', 'Status', 'Actions'].map((h) =>
                <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>,
              )}
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No staff match this search.</td>
              </tr>
            )}
            {staff.map((s) => {
              const linkedUser = users.find((u) => u.linkedStaffId === s.staffId)
              return (
                <tr key={s.staffId} style={{ borderTop: '1px solid var(--p-border)' }}>
                  <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{s.staffCode}</td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--p-ink-900)' }}>{s.fullName}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-700)' }}>{s.role}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-700)' }}>{labelForClinicId(s.assignedClinicId)}</td>
                  <td className="px-3 py-2.5">
                    {linkedUser
                      ? <StatusPill tone="teal" icon={CheckCircle2}>Yes · {linkedUser.username}</StatusPill>
                      : <StatusPill tone="navy">No</StatusPill>}
                  </td>
                  <td className="px-3 py-2.5">
                    {s.status === 'Active' ? <StatusPill tone="cash">Active</StatusPill> : <StatusPill tone="mixed">Inactive</StatusPill>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <RowButton icon={Pencil} onClick={() => onEdit(s)}>Edit</RowButton>
                      {s.status === 'Active'
                        ? <RowButton icon={PowerOff} tone="mixed" onClick={() => actions.setStaffStatus(s.staffId, 'Inactive')}>Deactivate</RowButton>
                        : <RowButton icon={Power} tone="cash" onClick={() => actions.setStaffStatus(s.staffId, 'Active')}>Activate</RowButton>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Portal users
// ---------------------------------------------------------------------------
function UsersTable({ users, staff, query, onQuery, onEdit }) {
  const { actions } = useDemoState()
  return (
    <section className="p-card overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b" style={{ borderColor: 'var(--p-border)' }}>
        <div>
          <div className="p-eyebrow">Portal Logins</div>
          <h2 className="p-h2 text-base mt-0.5">Portal Users</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{users.length} login{users.length === 1 ? '' : 's'} · scope-aware after sign-in</p>
        </div>
        <SearchInput value={query} onChange={onQuery} placeholder="Search by username, name…" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[920px]">
          <thead>
            <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
              {['Username', 'Linked Staff / Account', 'Role / Permission Scope', 'Assigned Clinic / Branch', 'Status', 'Last Login', 'Actions'].map((h) =>
                <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>,
              )}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No portal users match this search.</td>
              </tr>
            )}
            {users.map((u) => {
              const linkedStaff = staff.find((s) => s.staffId === u.linkedStaffId)
              return (
                <tr key={u.userId} style={{ borderTop: '1px solid var(--p-border)' }}>
                  <td className="px-3 py-2.5 font-mono text-[12px] font-semibold" style={{ color: 'var(--p-ink-900)' }}>{u.username}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-700)' }}>{linkedStaff ? linkedStaff.fullName : (u.displayName || '—')}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-700)' }}>{USER_ROLE_LABELS[u.role] || u.role}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-700)' }}>{u.role === 'admin' ? <em>All clinics &amp; branches</em> : labelForClinicId(u.assignedClinicId)}</td>
                  <td className="px-3 py-2.5">
                    {u.status === 'Active' ? <StatusPill tone="cash">Active</StatusPill> : <StatusPill tone="mixed">Inactive</StatusPill>}
                  </td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-500)' }}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-GB') : '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <RowButton icon={Pencil} onClick={() => onEdit(u)}>Edit</RowButton>
                      <RowButton icon={KeyRound} onClick={() => actions.resetUserPassword(u.userId, 'demo1234')} title="Resets to local demo password (placeholder)">Reset password</RowButton>
                      {u.status === 'Active'
                        ? <RowButton icon={PowerOff} tone="mixed" onClick={() => actions.setUserStatus(u.userId, 'Inactive')}>Deactivate</RowButton>
                        : <RowButton icon={Power} tone="cash" onClick={() => actions.setUserStatus(u.userId, 'Active')}>Activate</RowButton>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Clinic assignment matrix
// ---------------------------------------------------------------------------
function AssignmentMatrix({ staff, users }) {
  const rows = STAFF_CLINICS.map((c) => {
    const cl = c.id
    const nurses = staff.filter((s) => s.role === 'Nurse'     && s.status === 'Active' && s.assignedClinicId === cl)
    const doctors = staff.filter((s) => s.role === 'Doctor'   && s.status === 'Active' && s.assignedClinicId === cl)
    const reception = staff.filter((s) => s.role === 'Reception' && s.status === 'Active' && s.assignedClinicId === cl)
    const portalUsers = users.filter((u) => u.assignedClinicId === cl && u.status === 'Active')
    return { clinic: c, nurses, doctors, reception, portalUsers }
  })
  return (
    <section className="p-card overflow-hidden">
      <div className="p-4 sm:p-5 border-b" style={{ borderColor: 'var(--p-border)' }}>
        <div className="p-eyebrow">Coverage</div>
        <h2 className="p-h2 text-base mt-0.5">Clinic Assignment Matrix</h2>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>
          One row per configured clinic / branch. Counts show the active staff each clinic sees in its Attendance dropdowns.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[920px]">
          <thead>
            <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
              {['Clinic / Branch', 'Portal User(s)', 'Assigned Nurses', 'Assigned Doctor(s)', 'Reception Staff'].map((h) =>
                <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>,
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.clinic.id} style={{ borderTop: '1px solid var(--p-border)' }}>
                <td className="px-3 py-3">
                  <div className="font-semibold" style={{ color: 'var(--p-ink-900)' }}>{r.clinic.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{r.clinic.kind === 'branch' ? 'Main branch' : 'External clinic'}</div>
                </td>
                <td className="px-3 py-3">
                  {r.portalUsers.length === 0
                    ? <span className="italic" style={{ color: 'var(--p-mixed)' }}>None — assign a portal user</span>
                    : <ul className="space-y-0.5">{r.portalUsers.map((u) => <li key={u.userId} className="font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{u.username}</li>)}</ul>}
                </td>
                <Cell roleLabel="Nurse" people={r.nurses} />
                <Cell roleLabel="Doctor" people={r.doctors} />
                <Cell roleLabel="Reception" people={r.reception} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Cell({ roleLabel, people }) {
  return (
    <td className="px-3 py-3">
      {people.length === 0
        ? <span className="italic" style={{ color: 'var(--p-ink-400)' }}>None</span>
        : (
          <div className="flex flex-wrap gap-1">
            <span className="text-[11px] font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{people.length}×</span>
            {people.slice(0, 4).map((p) => (
              <span key={p.staffId} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-700)', border: '1px solid var(--p-border)' }}>{p.fullName}</span>
            ))}
            {people.length > 4 && <span className="text-[10px]" style={{ color: 'var(--p-ink-500)' }}>+{people.length - 4} more</span>}
          </div>
        )}
    </td>
  )
}

// ---------------------------------------------------------------------------
// Staff drawer (Add / Edit)
// ---------------------------------------------------------------------------
function StaffDrawer({ staff, existingStaff, onClose, onSaved }) {
  const { actions } = useDemoState()
  const [form, setForm] = useState({
    fullName:         staff.fullName || '',
    role:             staff.role || 'Nurse',
    assignedClinicId: staff.assignedClinicId || 'tropitel',
    status:           staff.status || 'Active',
    phone:            staff.phone || '',
    note:             staff.note || '',
  })
  const [error, setError] = useState(null)
  const isNew = !!staff.__new

  const previewCode = useMemo(() => {
    if (!isNew) return staff.staffCode
    return nextStaffCode(existingStaff, form.role, form.assignedClinicId)
  }, [isNew, staff.staffCode, existingStaff, form.role, form.assignedClinicId])

  function submit(e) {
    e.preventDefault()
    if (!form.fullName.trim()) { setError('Employee name is required.'); return }
    if (form.role !== 'Admin' && !form.assignedClinicId) { setError('Pick an assigned clinic or branch.'); return }
    if (isNew) {
      actions.addStaff({
        fullName: form.fullName,
        role: form.role,
        assignedClinicId: form.role === 'Admin' ? null : form.assignedClinicId,
        status: form.status,
        phone: form.phone,
        note: form.note,
      })
      onSaved(`Added ${form.fullName} to ${labelForClinicId(form.assignedClinicId)}.`)
    } else {
      actions.updateStaff(staff.staffId, {
        fullName: form.fullName.trim(),
        role: form.role,
        assignedClinicId: form.role === 'Admin' ? null : form.assignedClinicId,
        status: form.status,
        phone: form.phone,
        note: form.note,
      })
      onSaved(`Updated ${form.fullName}.`)
    }
  }

  return (
    <Drawer title={isNew ? 'Add Staff' : 'Edit Staff'} subtitle={isNew ? 'Create a new employee record' : staff.staffCode} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PremiumField label="Staff Code" hint={isNew ? 'Auto-generated on save' : 'Locked'}>
            <PremiumInput value={previewCode} readOnly disabled className="font-mono" />
          </PremiumField>
          <PremiumField label="Role" required>
            <SelectField value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} options={STAFF_ROLES.map((r) => ({ value: r, label: r }))} />
          </PremiumField>
        </div>
        <PremiumField label="Full Name" required>
          <PremiumInput value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Demo Nurse Alia" autoFocus />
        </PremiumField>
        {form.role !== 'Admin' && (
          <PremiumField label="Assigned Clinic / Branch" required>
            <SelectField value={form.assignedClinicId || ''} onChange={(v) => setForm((f) => ({ ...f, assignedClinicId: v }))} options={STAFF_CLINICS.map((c) => ({ value: c.id, label: c.name }))} />
          </PremiumField>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PremiumField label="Status">
            <SelectField value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} />
          </PremiumField>
          <PremiumField label="Phone (optional)">
            <PremiumInput value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+20 100 000 0000" />
          </PremiumField>
        </div>
        <PremiumField label="Note (optional)">
          <PremiumInput value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Internal note for Admin only" />
        </PremiumField>

        {error && <ErrorRow message={error} />}

        <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--p-border)' }}>
          <PremiumButton variant="ghost" type="button" onClick={onClose}>Cancel</PremiumButton>
          <PremiumButton type="submit">{isNew ? 'Add Staff' : 'Save Changes'}</PremiumButton>
        </div>
      </form>
    </Drawer>
  )
}

// ---------------------------------------------------------------------------
// User drawer (Create / Edit)
// ---------------------------------------------------------------------------
function UserDrawer({ user, staff, existingUsers, onClose, onSaved, onReject }) {
  const { actions } = useDemoState()
  const isNew = !!user.__new

  const [form, setForm] = useState({
    username:         user.username || '',
    displayName:      user.displayName || '',
    role:             user.role || 'clinic_nurse',
    assignedClinicId: user.assignedClinicId || (user.role === 'admin' ? null : 'tropitel'),
    linkedStaffId:    user.linkedStaffId || '',
    status:           user.status || 'Active',
    demoPassword:     user.demoPassword || 'demo1234',
  })
  const [error, setError] = useState(null)

  const linkableStaff = useMemo(() => {
    if (form.role === 'admin') return staff.filter((s) => s.role === 'Admin')
    if (form.role === 'reception_kawther') return staff.filter((s) => s.role === 'Reception' && s.assignedClinicId === 'al_kawther')
    if (form.role === 'reception_sheraton') return staff.filter((s) => s.role === 'Reception' && s.assignedClinicId === 'sheraton')
    // clinic_nurse: no required staff link (a clinic user is shared)
    return staff.filter((s) => s.role === 'Reception' && s.assignedClinicId === form.assignedClinicId)
  }, [form.role, form.assignedClinicId, staff])

  function submit(e) {
    e.preventDefault()
    if (!form.username.trim()) { setError('Username is required.'); return }
    if (form.role !== 'admin' && !form.assignedClinicId) { setError('Pick an assigned clinic or branch.'); return }
    if (isNew) {
      const exists = existingUsers.find((u) => u.username.trim().toLowerCase() === form.username.trim().toLowerCase())
      if (exists) { setError(`Username "${form.username}" already exists.`); return }
      actions.addUser({
        username: form.username,
        displayName: form.displayName || form.username,
        role: form.role,
        assignedClinicId: form.role === 'admin' ? null : form.assignedClinicId,
        linkedStaffId: form.linkedStaffId || null,
        status: form.status,
        demoPassword: form.demoPassword || 'demo1234',
      })
      onSaved(`Created portal user "${form.username}".`)
    } else {
      actions.updateUser(user.userId, {
        displayName: form.displayName || form.username,
        role: form.role,
        assignedClinicId: form.role === 'admin' ? null : form.assignedClinicId,
        linkedStaffId: form.linkedStaffId || null,
        status: form.status,
        demoPassword: form.demoPassword || 'demo1234',
      })
      onSaved(`Updated portal user "${form.username}".`)
    }
  }

  return (
    <Drawer title={isNew ? 'Create Portal User' : 'Edit Portal User'} subtitle={isNew ? 'New login account' : `@${user.username}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PremiumField label="Username" required hint={isNew ? 'Used at the Login screen' : 'Locked after creation'}>
            <PremiumInput
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              readOnly={!isNew}
              disabled={!isNew}
              placeholder="e.g. tropitel"
              autoFocus={isNew}
            />
          </PremiumField>
          <PremiumField label="Display Name (optional)">
            <PremiumInput value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="e.g. Tropitel Clinic — Reception" />
          </PremiumField>
        </div>

        <PremiumField label="Account Type / Permission Scope" required>
          <SelectField
            value={form.role}
            onChange={(v) => setForm((f) => ({
              ...f,
              role: v,
              assignedClinicId: v === 'admin' ? null
                : v === 'reception_kawther' ? 'al_kawther'
                : v === 'reception_sheraton' ? 'sheraton'
                : (f.assignedClinicId || 'tropitel'),
              linkedStaffId: '',
            }))}
            options={[
              { value: 'admin',              label: 'Admin — All clinics & branches' },
              { value: 'clinic_nurse',       label: 'External Clinic User — assigned clinic only' },
              { value: 'reception_kawther',  label: 'Al-Kawther Reception — branch only' },
              { value: 'reception_sheraton', label: 'Sheraton Reception — branch only' },
            ]}
          />
        </PremiumField>

        {form.role === 'clinic_nurse' && (
          <PremiumField label="Assigned Clinic" required>
            <SelectField value={form.assignedClinicId || ''} onChange={(v) => setForm((f) => ({ ...f, assignedClinicId: v }))} options={STAFF_CLINICS.filter((c) => c.kind === 'external').map((c) => ({ value: c.id, label: c.name }))} />
          </PremiumField>
        )}

        <PremiumField label="Linked Staff (optional)" hint="Useful for branch reception accounts">
          <SelectField
            value={form.linkedStaffId || ''}
            onChange={(v) => setForm((f) => ({ ...f, linkedStaffId: v }))}
            options={[{ value: '', label: '— None —' }, ...linkableStaff.map((s) => ({ value: s.staffId, label: `${s.fullName} · ${s.staffCode}` }))]}
          />
        </PremiumField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PremiumField label="Status">
            <SelectField value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} />
          </PremiumField>
          <PremiumField label="Temporary Demo Password" hint="Used only for the local Login screen">
            <PremiumInput value={form.demoPassword} onChange={(e) => setForm((f) => ({ ...f, demoPassword: e.target.value }))} placeholder="demo1234" />
          </PremiumField>
        </div>

        {error && <ErrorRow message={error} />}

        <div className="text-[11px] flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--p-brand-pale)', color: 'var(--p-ink-700)', border: '1px solid var(--p-border)' }}>
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--p-brand-mid)' }} />
          <span>Authentication and permanent user storage will be enabled in the approved backend phase. These records live in the current session only.</span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--p-border)' }}>
          <PremiumButton variant="ghost" type="button" onClick={onClose}>Cancel</PremiumButton>
          <PremiumButton type="submit">{isNew ? 'Create User' : 'Save Changes'}</PremiumButton>
        </div>
      </form>
    </Drawer>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
function Drawer({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close" className="absolute inset-0" style={{ background: 'rgba(10,27,61,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose} />
      <aside
        className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] overflow-y-auto p-fade-in"
        style={{ background: 'white', boxShadow: 'var(--p-shadow-card)' }}
      >
        <header className="sticky top-0 px-5 py-4 flex items-center justify-between border-b" style={{ background: 'white', borderColor: 'var(--p-border)' }}>
          <div className="min-w-0">
            <div className="p-eyebrow">{subtitle}</div>
            <h3 className="p-h2 text-lg mt-0.5">{title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors hover:bg-[var(--p-surface-tint)]" style={{ color: 'var(--p-ink-500)' }}>
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="px-5 py-5">{children}</div>
      </aside>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12px] font-semibold transition-colors',
        active ? 'bg-[var(--p-teal-soft)] text-[var(--p-teal)]' : 'text-[var(--p-ink-500)] hover:bg-[var(--p-surface-tint)]',
      )}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--p-ink-400)' }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-full pl-9 pr-4 text-sm"
        style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)', color: 'var(--p-ink-700)' }}
      />
    </div>
  )
}

function SelectField({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="p-input w-full pr-9 appearance-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
    </div>
  )
}

function RowButton({ icon: Icon, onClick, tone = 'navy', children, title }) {
  const tones = {
    navy:  { bg: 'transparent', fg: 'var(--p-ink-700)' },
    cash:  { bg: 'var(--p-finalized-soft)', fg: '#076D4A' },
    mixed: { bg: 'var(--p-pending-soft)', fg: '#A1672A' },
  }
  const t = tones[tone] || tones.navy
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[11px] font-semibold transition-colors hover:bg-[var(--p-surface-tint)]"
      style={{ background: t.bg, color: t.fg, border: '1px solid var(--p-border)' }}
    >
      <Icon className="w-3 h-3" /> {children}
    </button>
  )
}

function FeedbackBanner({ feedback, onDismiss }) {
  const ok = feedback.tone === 'ok'
  return (
    <div
      role="status"
      className="rounded-xl px-3.5 py-3 flex items-start gap-2.5"
      style={{
        background: ok ? 'var(--p-finalized-soft)' : 'var(--p-pending-soft)',
        color:      ok ? '#076D4A' : '#A1672A',
        border:     '1px solid ' + (ok ? '#9FD4BB' : '#F0C97A'),
      }}
    >
      {ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
      <span className="flex-1 text-[12px] font-semibold">{feedback.message}</span>
      <button type="button" onClick={onDismiss} className="opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

function ErrorRow({ message }) {
  return (
    <div
      role="alert"
      className="rounded-xl px-3.5 py-2.5 flex items-start gap-2"
      style={{ background: 'rgba(177, 66, 66, 0.08)', border: '1px solid rgba(177, 66, 66, 0.30)' }}
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#B14242' }} />
      <span className="text-[11px] leading-relaxed font-semibold" style={{ color: '#7A2A2A' }}>{message}</span>
    </div>
  )
}

function labelForClinicId(id) {
  if (!id) return '—'
  const c = STAFF_CLINICS.find((x) => x.id === id)
  return c ? c.name : id
}
