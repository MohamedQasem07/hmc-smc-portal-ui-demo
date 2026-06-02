import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { DEMO_USERS } from '../data/mock'
import { P2C_DEMO_USERS, EXTERNAL_CLINICS } from '../data/p2c'
import { scopeForUser } from '../data/staffUsers'
import { IS_SUPABASE } from '../lib/api/config'
import { sbGetSessionUser, sbSignIn, sbSignOut, sbOnAuthChange, setSessionExpiredHandler } from '../lib/api/auth'

/**
 * UserModeContext — role state + session.
 *
 * Two session sources, selected by VITE_DATA_BACKEND:
 *   - mock (default): username/password validated against DemoStateContext.users,
 *     session mirrored in sessionStorage. Synchronous; authReady is always true.
 *   - supabase: session owned by Supabase Auth. signIn(email,password) is async;
 *     the restored/synthesized user has the SAME shape so guards/pages are
 *     unchanged. authReady flips true once the initial getSession resolves.
 *
 * Session user shape (both modes):
 *   { userId, role, assignedClinicId, displayName, ... }
 *   role ∈ 'admin' | 'clinic_nurse' | 'reception_kawther' | 'reception_sheraton'
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
  currentUser: null,
  currentClinicScope: null,
  isSignedIn: false,
  authReady: !IS_SUPABASE,
  recoveryMode: false,
  sessionExpired: false,
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

const OPERATE_AS_KEY = 'portal_operate_as'
function initialOperateAs() {
  const raw = readStorage(OPERATE_AS_KEY)
  if (!raw) return null
  try { const p = JSON.parse(raw); return p && p.code ? p : null } catch { return null }
}

export function UserModeProvider({ children }) {
  const [demoRole, setDemoRoleState] = useState(initialDemoRole)
  const [clinicId, setClinicIdState] = useState(initialClinicId)
  // Mock: restore synchronously from sessionStorage. Supabase: start empty,
  // restore asynchronously below.
  const [currentUser, setCurrentUser] = useState(IS_SUPABASE ? null : initialSession)
  const [authReady, setAuthReady] = useState(!IS_SUPABASE)
  const [recoveryMode, setRecoveryMode] = useState(false)
  // P3J — true after a dead/expired session was detected (invalid refresh token).
  // Drives the "Your session expired. Please sign in again." notice on /login and
  // forces a clean re-login instead of letting reads silently return empty.
  const [sessionExpired, setSessionExpired] = useState(false)
  const lastUidRef = useRef(null)

  // Admin Operate-As — admin enters a clinic/branch workspace scoped to that
  // location while staying the real admin (operatingMode = admin_override).
  // Persisted so a refresh keeps the operate-as scope. Only honoured for admins.
  const [operateAs, setOperateAsState] = useState(initialOperateAs)
  const setOperateAs = (loc) => {
    setOperateAsState(loc || null)
    try {
      if (loc) window.sessionStorage.setItem(OPERATE_AS_KEY, JSON.stringify(loc))
      else window.sessionStorage.removeItem(OPERATE_AS_KEY)
    } catch { /* ignore */ }
  }
  const clearOperateAs = () => setOperateAs(null)

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

  // Mirror a session user's scope into the legacy demoRole/clinicId so older
  // P2C pages that read demoRole/clinicId resolve the right workspace.
  function mirrorScope(u) {
    if (!u) return
    if (u.role === 'admin') setDemoRole('admin')
    else if (u.role === 'clinic_nurse' && u.assignedClinicId) setDemoRole('clinic_nurse', u.assignedClinicId)
    else if (u.role === 'reception_kawther') setDemoRole('reception_kawther')
    else if (u.role === 'reception_sheraton') setDemoRole('reception_sheraton')
  }

  // ------------------------------------------------------------------
  // Supabase session restore + live auth changes (supabase mode only).
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!IS_SUPABASE) return
    let active = true
    let sub
    // P3J — when the data layer detects a dead session (invalid refresh token),
    // clear the user and flag expiry so the guards route to a clean re-login
    // with a clear message (instead of the app silently reading empty data).
    setSessionExpiredHandler(() => {
      if (!active) return
      lastUidRef.current = null
      setCurrentUser(null)
      setSessionExpired(true)
    })
    sbGetSessionUser()
      .then((u) => { if (active) { lastUidRef.current = u?.userId || null; setCurrentUser(u); if (u) mirrorScope(u); setAuthReady(true) } })
      .catch(() => { if (active) setAuthReady(true) })
    sbOnAuthChange((u, event) => {
      if (!active) return
      if (event === 'TOKEN_REFRESHED') return
      if (event === 'PASSWORD_RECOVERY') { setRecoveryMode(true); return }
      if (event === 'SIGNED_OUT') { lastUidRef.current = null; setRecoveryMode(false); setCurrentUser(null); return }
      if (!u) return  // ambiguous event with no user — never null the session here
      // Supabase re-emits SIGNED_IN on every tab focus / visibility regain. If it
      // is the same user, do NOTHING — adopting a fresh object reference made
      // dependent providers re-run and the route remount (open form wiped).
      if (lastUidRef.current === u.userId) return
      lastUidRef.current = u.userId
      setCurrentUser(u); mirrorScope(u)
    })
      .then((s) => { sub = s })
      .catch(() => {})
    return () => { active = false; if (sub) sub.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signIn(arg, password) {
    if (IS_SUPABASE) {
      const res = await sbSignIn(arg, password)   // arg = email
      if (res.user) { setCurrentUser(res.user); mirrorScope(res.user); setRecoveryMode(false); setSessionExpired(false) }
      return res
    }
    // ---- mock path ----
    const u = arg
    if (!u) return { user: null, error: 'No user' }
    setCurrentUser(u)
    try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)) } catch { /* ignore */ }
    mirrorScope(u)
    return { user: u, error: null }
  }

  async function signOut() {
    setOperateAs(null)   // never carry an operate-as scope across sign-out
    if (IS_SUPABASE) {
      try { await sbSignOut() } catch { /* ignore */ }
      setCurrentUser(null)
      return
    }
    setCurrentUser(null)
    try { window.sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  }

  const currentClinicScope = scopeForUser(currentUser)
  const isSignedIn = !!currentUser

  // Operate-As is honoured ONLY for admins; the effective clinic scope that
  // clinic pages read (clinicId) becomes the operate-as location when active.
  const activeOperateAs = currentUser?.role === 'admin' ? operateAs : null
  const effectiveClinicId = activeOperateAs ? activeOperateAs.code : clinicId

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
      demoRole, clinicId: effectiveClinicId, demoUser,
      setDemoRole, setClinicId,
      operateAs: activeOperateAs, setOperateAs, clearOperateAs,
      operatingMode: activeOperateAs ? 'admin_override' : null,
      currentUser, currentClinicScope, isSignedIn, authReady, recoveryMode, sessionExpired,
      signIn, signOut,
    }}>
      {children}
    </UserModeContext.Provider>
  )
}

export function useUserMode() {
  return useContext(UserModeContext)
}

/** Convenience hook: only the session pieces. */
export function useSession() {
  const { currentUser, currentClinicScope, isSignedIn, authReady, signIn, signOut } = useUserMode()
  return { currentUser, currentClinicScope, isSignedIn, authReady, signIn, signOut }
}
