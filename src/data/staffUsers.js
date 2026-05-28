/* =========================================================================
 * P2C.R4 — Staff Directory + Portal Users (runtime UI demo data)
 * -----------------------------------------------------------------------
 * Two related collections used by the Admin Users & Staff workspace and by
 * runtime login/role-scope simulation:
 *
 *   STAFF — every employee that may appear in attendance: nurses, doctors,
 *           reception staff, admin staff. Each staff member is assigned to
 *           a single clinic / branch. `hasPortalUser` reflects whether a
 *           portal-login account is linked.
 *
 *   USERS — every account that logs into the portal. One Admin user, one
 *           login per external clinic, one login per branch reception.
 *           Each clinic/branch user is scoped to a single clinic/branch.
 *           Admin has unrestricted scope.
 *
 * No real authentication or production claim. demoPassword exists only so
 * the local Login screen can exercise the validation/error states; nothing
 * here is secure storage, and nothing is persisted across refreshes unless
 * loaded via the Local Review Tools.
 *
 * Schema:
 *   Staff: { staffId, staffCode, fullName, role, assignedClinicId, status, hasPortalUser, phone?, note? }
 *     role ∈ 'Nurse' | 'Doctor' | 'Reception' | 'Admin' | 'Other'
 *     status ∈ 'Active' | 'Inactive'
 *   User:  { userId, username, displayName, role, assignedClinicId, linkedStaffId?, status, demoPassword }
 *     role ∈ 'admin' | 'clinic_nurse' | 'reception_kawther' | 'reception_sheraton'
 *     assignedClinicId: null for admin; clinic id for clinic_nurse; branch id for reception
 *     status ∈ 'Active' | 'Inactive'
 * ========================================================================= */

import { EXTERNAL_CLINICS, RECEIVING_BRANCHES } from './p2c'

// ----------------------------------------------------------------------
// Staff Directory — pre-seeded demo employees mapped to every configured
// clinic and branch. Each location gets at least one nurse, one doctor,
// and (for branches) at least one reception staff. IDs intentionally use
// stable, readable prefixes so the same staff member can be referenced
// from attendance shifts and from user accounts.
// ----------------------------------------------------------------------
function staff(id, code, fullName, role, clinic, opts = {}) {
  return {
    staffId: id,
    staffCode: code,
    fullName,
    role,
    assignedClinicId: clinic,
    status: opts.status || 'Active',
    hasPortalUser: opts.hasPortalUser || false,
    phone: opts.phone || '',
    note: opts.note || '',
  }
}

export const SEED_STAFF = [
  // ─────────────── Tropitel Clinic ───────────────
  staff('n_trop_1', 'TR-NUR-001', 'Demo Nurse Alia',     'Nurse',  'tropitel'),
  staff('n_trop_2', 'TR-NUR-002', 'Demo Nurse Bahy',     'Nurse',  'tropitel'),
  staff('n_trop_3', 'TR-NUR-003', 'Demo Nurse Carla',    'Nurse',  'tropitel'),
  staff('d_trop_1', 'TR-DOC-001', 'Dr. Demo Physician 1','Doctor', 'tropitel'),
  staff('d_trop_2', 'TR-DOC-002', 'Dr. Demo Physician 2','Doctor', 'tropitel'),

  // ─────────────── Romance Clinic ───────────────
  staff('n_rom_1',  'RO-NUR-001', 'Demo Nurse Rana',     'Nurse',  'romance'),
  staff('n_rom_2',  'RO-NUR-002', 'Demo Nurse Sami',     'Nurse',  'romance'),
  staff('d_rom_1',  'RO-DOC-001', 'Dr. Demo Physician 3','Doctor', 'romance'),

  // ─────────────── Sahl Hasheesh Clinics ───────────────
  staff('n_shc_1',  'SH-NUR-001', 'Demo Nurse Layla',    'Nurse',  'sahl_hasheesh'),
  staff('n_shc_2',  'SH-NUR-002', 'Demo Nurse Mido',     'Nurse',  'sahl_hasheesh'),
  staff('d_shc_1',  'SH-DOC-001', 'Dr. Demo Physician 4','Doctor', 'sahl_hasheesh'),
  staff('d_shc_2',  'SH-DOC-002', 'Dr. Demo Physician 5','Doctor', 'sahl_hasheesh'),

  // ─────────────── Mamsha Clinic ───────────────
  staff('n_mam_1',  'MA-NUR-001', 'Demo Nurse Hana',     'Nurse',  'mamsha'),
  staff('n_mam_2',  'MA-NUR-002', 'Demo Nurse Omar',     'Nurse',  'mamsha'),
  staff('d_mam_1',  'MA-DOC-001', 'Dr. Demo Physician 6','Doctor', 'mamsha'),

  // ─────────────── Pharaoh Clinic ───────────────
  staff('n_pha_1',  'PH-NUR-001', 'Demo Nurse Kira',     'Nurse',  'pharaoh'),
  staff('d_pha_1',  'PH-DOC-001', 'Dr. Demo Physician 7','Doctor', 'pharaoh'),

  // ─────────────── Menamark Clinic ───────────────
  staff('n_men_1',  'ME-NUR-001', 'Demo Nurse Tarek',    'Nurse',  'menamark'),
  staff('n_men_2',  'ME-NUR-002', 'Demo Nurse Yara',     'Nurse',  'menamark'),
  staff('d_men_1',  'ME-DOC-001', 'Dr. Demo Physician 8','Doctor', 'menamark'),

  // ─────────────── Al-Kawther Branch ───────────────
  staff('n_kaw_1',  'AK-NUR-001', 'Demo Nurse Ahmed',    'Nurse',  'al_kawther'),
  staff('n_kaw_2',  'AK-NUR-002', 'Demo Nurse Mariam',   'Nurse',  'al_kawther'),
  staff('n_kaw_3',  'AK-NUR-003', 'Demo Nurse Nour',     'Nurse',  'al_kawther'),
  staff('d_kaw_1',  'AK-DOC-001', 'Dr. Demo Surgeon 1',     'Doctor', 'al_kawther'),
  staff('d_kaw_2',  'AK-DOC-002', 'Dr. Demo Internist 1',   'Doctor', 'al_kawther'),
  staff('d_kaw_3',  'AK-DOC-003', 'Dr. Demo Pediatrician 1','Doctor', 'al_kawther'),
  staff('r_kaw_1',  'AK-REC-001', 'Demo Reception Kawther', 'Reception', 'al_kawther', { hasPortalUser: true }),

  // ─────────────── Sheraton Branch ───────────────
  staff('n_sher_1', 'SR-NUR-001', 'Demo Nurse Hala',     'Nurse',  'sheraton'),
  staff('n_sher_2', 'SR-NUR-002', 'Demo Nurse Ziad',     'Nurse',  'sheraton'),
  staff('d_sher_1', 'SR-DOC-001', 'Dr. Demo Surgeon 2',    'Doctor', 'sheraton'),
  staff('d_sher_2', 'SR-DOC-002', 'Dr. Demo Internist 2',  'Doctor', 'sheraton'),
  staff('r_sher_1', 'SR-REC-001', 'Demo Reception Sheraton', 'Reception', 'sheraton', { hasPortalUser: true }),

  // ─────────────── Administration (Mohamed) ───────────────
  staff('a_hq_1',   'HQ-ADM-001', 'Mohamed Ramadan',     'Admin',  null, { hasPortalUser: true, note: 'Financial Director — full scope.' }),
]

// ----------------------------------------------------------------------
// Portal Users — one login per clinic/branch + the Admin login. Linked
// to staff records via linkedStaffId where meaningful (Admin, Reception).
// External clinic logins remain anonymous "clinic operational account"
// patterns since multiple nurses share the same workspace.
// ----------------------------------------------------------------------
function user(id, username, displayName, role, clinic, opts = {}) {
  return {
    userId: id,
    username,
    displayName,
    role,
    assignedClinicId: clinic,
    linkedStaffId: opts.linkedStaffId || null,
    status: opts.status || 'Active',
    demoPassword: opts.demoPassword || 'demo1234',
    lastLoginAt: opts.lastLoginAt || null,
  }
}

export const SEED_USERS = [
  // Admin
  user('u_admin', 'admin', 'Mohamed Ramadan — Admin', 'admin', null, {
    linkedStaffId: 'a_hq_1', demoPassword: 'admin1234',
  }),

  // External clinic operational logins (shared per clinic)
  user('u_clinic_tropitel',       'tropitel',      'Tropitel Clinic — Reception',           'clinic_nurse', 'tropitel'),
  user('u_clinic_romance',        'romance',       'Romance Clinic — Reception',            'clinic_nurse', 'romance'),
  user('u_clinic_sahl_hasheesh',  'sahl_hasheesh', 'Sahl Hasheesh Clinics — Reception',     'clinic_nurse', 'sahl_hasheesh'),
  user('u_clinic_mamsha',         'mamsha',        'Mamsha Clinic — Reception',             'clinic_nurse', 'mamsha'),
  user('u_clinic_pharaoh',        'pharaoh',       'Pharaoh Clinic — Reception',            'clinic_nurse', 'pharaoh'),
  user('u_clinic_menamark',       'menamark',      'Menamark Clinic — Reception',           'clinic_nurse', 'menamark'),

  // Branch reception logins
  user('u_rec_alkawther', 'kawther',  'Al-Kawther Reception', 'reception_kawther',  'al_kawther', { linkedStaffId: 'r_kaw_1' }),
  user('u_rec_sheraton',  'sheraton', 'Sheraton Reception',   'reception_sheraton', 'sheraton',   { linkedStaffId: 'r_sher_1' }),
]

// ----------------------------------------------------------------------
// Code generator — keeps demo staff codes predictable. Format:
// `<LOC>-<ROLE>-<NNN>` where LOC = first letter(s) of the clinic name,
// ROLE = NUR | DOC | REC | ADM | OTH, NNN = next 3-digit sequence.
// ----------------------------------------------------------------------
const ROLE_CODE = { Nurse: 'NUR', Doctor: 'DOC', Reception: 'REC', Admin: 'ADM', Other: 'OTH' }
const LOC_CODE = {
  tropitel:      'TR',
  romance:       'RO',
  sahl_hasheesh: 'SH',
  mamsha:        'MA',
  pharaoh:       'PH',
  menamark:      'ME',
  al_kawther:    'AK',
  sheraton:      'SR',
  null:          'HQ',
}

export function nextStaffCode(existing, role, clinicId) {
  const loc = LOC_CODE[clinicId] || (clinicId ? clinicId.slice(0, 2).toUpperCase() : 'HQ')
  const r = ROLE_CODE[role] || 'OTH'
  const prefix = `${loc}-${r}-`
  let max = 0
  for (const s of existing) {
    if (!s.staffCode || !s.staffCode.startsWith(prefix)) continue
    const n = parseInt(s.staffCode.slice(prefix.length), 10)
    if (Number.isFinite(n)) max = Math.max(max, n)
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

// ----------------------------------------------------------------------
// Pure selectors — operate on a list of staff / users + an optional clinic
// scope. Use these from the SessionContext / Attendance page so the rules
// are centralised.
// ----------------------------------------------------------------------
export function staffForClinic(staffList, clinicId, { role = null, activeOnly = true } = {}) {
  return staffList.filter((s) => {
    if (s.assignedClinicId !== clinicId) return false
    if (role && s.role !== role) return false
    if (activeOnly && s.status !== 'Active') return false
    return true
  })
}

export function nursesForClinic(staffList, clinicId, opts = {}) {
  return staffForClinic(staffList, clinicId, { ...opts, role: 'Nurse' })
}

export function doctorsForClinic(staffList, clinicId, opts = {}) {
  return staffForClinic(staffList, clinicId, { ...opts, role: 'Doctor' })
}

export function staffById(staffList, staffId) {
  return staffList.find((s) => s.staffId === staffId) || null
}

export function userById(userList, userId) {
  return userList.find((u) => u.userId === userId) || null
}

export function findUserByUsername(userList, username) {
  if (!username) return null
  const norm = String(username).trim().toLowerCase()
  return userList.find((u) => u.username.toLowerCase() === norm) || null
}

// ----------------------------------------------------------------------
// All configured clinics/branches — pulled from p2c.js so this file does
// not need its own duplicate list.
// ----------------------------------------------------------------------
export const STAFF_CLINICS = [
  ...EXTERNAL_CLINICS.map((c) => ({ id: c.id, name: c.name, kind: 'external' })),
  ...RECEIVING_BRANCHES.map((b) => ({ id: b.id, name: b.name, kind: 'branch' })),
]

export const STAFF_ROLES = ['Nurse', 'Doctor', 'Reception', 'Admin', 'Other']
export const STAFF_STATUSES = ['Active', 'Inactive']

export const USER_ROLE_LABELS = {
  admin: 'Admin — All clinics & branches',
  clinic_nurse: 'External Clinic User — assigned clinic only',
  reception_kawther: 'Al-Kawther Reception — branch only',
  reception_sheraton: 'Sheraton Reception — branch only',
}

export function userRoleLabel(role) {
  return USER_ROLE_LABELS[role] || role
}

// ----------------------------------------------------------------------
// What clinic scope corresponds to a given user role / assignment? The
// SessionContext uses this to set `currentClinicScope` after login.
// ----------------------------------------------------------------------
export function scopeForUser(u) {
  if (!u) return null
  if (u.role === 'admin') return { kind: 'admin' }
  if (u.role === 'clinic_nurse') return { kind: 'clinic', clinicId: u.assignedClinicId }
  if (u.role === 'reception_kawther' || u.role === 'reception_sheraton') {
    return { kind: 'branch', branchId: u.assignedClinicId }
  }
  return null
}
