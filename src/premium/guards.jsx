import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useUserMode } from '../context/UserModeContext'

/* =========================================================================
 * Route guards (P3-prep — operational access control)
 * -----------------------------------------------------------------------
 * UI layer of defence over admin-only / clinic / branch workspaces. The real
 * enforcement is Supabase RLS (live in supabase mode); these guards mirror it
 * in the UI and also keep mock mode honest.
 *
 * In supabase mode the session restores asynchronously, so we wait for
 * `authReady` before deciding — otherwise a logged-in user would be bounced
 * to login on first paint.
 *
 * Roles: admin | clinic_nurse | reception_kawther | reception_sheraton
 * ========================================================================= */

const LOGIN = '/login'

export function homeForRole(role) {
  switch (role) {
    case 'admin':              return '/admin-dashboard'
    case 'clinic_nurse':       return '/clinic/dashboard'
    case 'reception_kawther':  return '/reception/al-kawther/dashboard'
    case 'reception_sheraton': return '/reception/sheraton/dashboard'
    default:                   return LOGIN
  }
}

/** Reception branch slugs use hyphens in the URL (al-kawther) but data ids
 *  use underscores (al_kawther). Normalise for comparison. */
const slugToBranchId = (slug) => (slug || '').replace(/-/g, '_')

/** Small full-screen hold while the async session is restoring. */
function AuthLoading() {
  return (
    <div className="theme-premium min-h-screen flex items-center justify-center"
         style={{ background: 'var(--p-canvas-warm)', color: 'var(--p-ink-500)' }}>
      <span className="text-sm">Loading…</span>
    </div>
  )
}

export function RequireAuth() {
  const { isSignedIn, authReady } = useUserMode()
  if (!authReady) return <AuthLoading />
  if (!isSignedIn) return <Navigate to={LOGIN} replace />
  return <Outlet />
}

export function RequireRole({ allow }) {
  const { isSignedIn, currentUser, authReady } = useUserMode()
  if (!authReady) return <AuthLoading />
  if (!isSignedIn || !currentUser) return <Navigate to={LOGIN} replace />
  if (Array.isArray(allow) && !allow.includes(currentUser.role)) {
    return <Navigate to={homeForRole(currentUser.role)} replace />
  }
  return <Outlet />
}

export function RequireReceptionBranch() {
  const { isSignedIn, currentUser, authReady } = useUserMode()
  const { branchSlug } = useParams()
  if (!authReady) return <AuthLoading />
  if (!isSignedIn || !currentUser) return <Navigate to={LOGIN} replace />

  const role = currentUser.role
  if (role === 'admin') return <Outlet />
  if (role !== 'reception_kawther' && role !== 'reception_sheraton') {
    return <Navigate to={homeForRole(role)} replace />
  }
  if (slugToBranchId(branchSlug) !== currentUser.assignedClinicId) {
    return <Navigate to={homeForRole(role)} replace />
  }
  return <Outlet />
}
