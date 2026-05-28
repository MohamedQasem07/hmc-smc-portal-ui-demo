import { createContext, useContext, useState } from 'react'
import { DEMO_USERS } from '../data/mock'
import { P2C_DEMO_USERS, EXTERNAL_CLINICS } from '../data/p2c'
import { scopeForUser } from '../data/staffUsers'

/**
 * UserModeContext — combined role state and (P2C.R4) lightweight session.
 *
 * Legacy fields (kept):
 *   role: 'clinic' | 'admin'
 *   user: legacy DEMO_USERS.{clinic|admin}
 *   setRole(role)
 *
 * P2C extension:
 *   demoRole:   'admin' | 'clinic_nurse' | 'reception_kawther' | 'reception_sheraton'
 *   clinicId:   id of an external clinic, only relevant when demoRole === 'clinic_nurse'
 *   demoUser:   P2C_DEMO_USERS[demoRole]
 *   setDemoRole(role, clinicId?)
 *   setClinicId(clinicId)
 *
 * P2C.R4 session simulation (runtime-only — NOT real auth):
 *   currentUser: portal-user record from DemoStateContext.users (or null when signed out)
 *   currentClinicScope: { kind: 'admin' } | { kind: 'clinic', clinicId } | { kind: 'branch', branchId }
 *   isSignedIn: boolean — derived
 *   signIn(user): writes session + mirrors demoRole/clinicId so existing workspaces resolve
 *   signOut(): clears session
 *
 * The legacy `role` continues to mirror demoRole into the two old buckets so
 * existing P1/P2A pages keep working unchanged.
 */
const UserModeContext = createContext({
  role: 'admin',
  user: DEMO_USERS.admin,
  setRole: () => {},
  demoRole: 'admin',
  clinicId: null,
  demoUser: P2C_DEMO_USERS.admin,
  setDemoRole: () => {},
  setClinicId: () => {},
  // P2C.R4
  currentUser: null,
  currentClinicScope: null,
  isSignedIn: false,
  signIn: () => {},
  signOut: () => {},
})

const LEGACY_KEY = 'portal_ux_p0_role'
const P2C_KEY    = 'portal_ux_p2c_role'
const P2C_CLINIC = 'portal_ux_p2c_clinic'
const SESSION_KEY = 'portal_ux_p2c_session'

function legacyMirror(demoRole) {
  return demoRole === 'admin' ? 'admin' : 'clinic'
}

function readStorage(key) {
  try { return window.sessionStorage.getItem(key) } catch { return null }
}

function initialDemoRole() {
  const stored = readStorage(P2C_KEY)
  if (stored && P2C_DEMO_USERS[stored]) return stored
  const legacy = readStorage(LEGACY_KEY)
  if (legacy === 'admin' || legacy === 'clinic') return legacy === 'admin' ? 'admin' : 'clinic_nurse'
  return 'admin'
}

function initialClinicId() {
  const stored = readStorage(P2C_CLINIC)
  if (stored && EXTERNAL_CLINICS.some((c) => c.id === stored)) return stored
  return 'tropitel'
}

function initialSession() {
  const raw = readStorage(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && parsed.userId ? parsed : null
  } catch { return null }
}

export function UserModeProvider({ children }) {
  // P2C.R4 — restore from sessionStorage SYNCHRONOUSLY on first render so
  // route guards (e.g. <Navigate to="/login" />) see the signed-in state
  // immediately and don't bounce the user.
  const [demoRole, setDemoRoleState] = useState(initialDemoRole)
  const [clinicId, setClinicIdState] = useState(initialClinicId)
  const [currentUser, setCurrentUser] = useState(initialSession)

  const setDemoRole = (next, nextClinic) => {
    setDemoRoleState(next)
    try {
      window.sessionStorage.setItem(P2C_KEY, next)
      window.sessionStorage.setItem(LEGACY_KEY, legacyMirror(next))
      if (next === 'clinic_nurse' && nextClinic) {
        setClinicIdState(nextClinic)
        window.sessionStorage.setItem(P2C_CLINIC, nextClinic)
      }
    } catch { /* ignore */ }
  }

  const setClinicId = (id) => {
    setClinicIdState(id)
    try { window.sessionStorage.setItem(P2C_CLINIC, id) } catch { /* ignore */ }
  }

  // ------------------------------------------------------------------
  // P2C.R4 — Session
  // ------------------------------------------------------------------
  function signIn(u) {
    if (!u) return
    setCurrentUser(u)
    try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)) } catch { /* ignore */ }
    // Mirror into legacy demoRole/clinicId so existing pages resolve scope.
    if (u.role === 'admin') {
      setDemoRole('admin')
    } else if (u.role === 'clinic_nurse' && u.assignedClinicId) {
      setDemoRole('clinic_nurse', u.assignedClinicId)
    } else if (u.role === 'reception_kawther') {
      setDemoRole('reception_kawther')
    } else if (u.role === 'reception_sheraton') {
      setDemoRole('reception_sheraton')
    }
  }

  function signOut() {
    setCurrentUser(null)
    try { window.sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  }

  const currentClinicScope = scopeForUser(currentUser)
  const isSignedIn = !!currentUser

  // Legacy compatibility
  const role = legacyMirror(demoRole)
  const setRole = (legacyNext) => {
    setDemoRole(legacyNext === 'admin' ? 'admin' : 'clinic_nurse', clinicId)
  }
  const user = role === 'admin' ? DEMO_USERS.admin : DEMO_USERS.clinic

  const demoUser = P2C_DEMO_USERS[demoRole] || P2C_DEMO_USERS.admin

  return (
    <UserModeContext.Provider value={{
      role, user, setRole,
      demoRole, clinicId, demoUser,
      setDemoRole, setClinicId,
      // P2C.R4 session
      currentUser, currentClinicScope, isSignedIn,
      signIn, signOut,
    }}>
      {children}
    </UserModeContext.Provider>
  )
}

export function useUserMode() {
  return useContext(UserModeContext)
}

/** Convenience hook: only the P2C.R4 session pieces. */
export function useSession() {
  const { currentUser, currentClinicScope, isSignedIn, signIn, signOut } = useUserMode()
  return { currentUser, currentClinicScope, isSignedIn, signIn, signOut }
}
