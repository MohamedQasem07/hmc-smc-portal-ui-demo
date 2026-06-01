import { getSupabaseClient } from './supabaseClient'

/* =========================================================================
 * Supabase Auth → frontend session shape (P3B)
 * -----------------------------------------------------------------------
 * Translates a Supabase Auth user + their portal_user_profiles row +
 * portal_user_location_scopes into the SAME session shape the guards and
 * pages already consume in mock mode:
 *   { userId, email, displayName, role, assignedClinicId, portalRole, scopeCodes }
 * where `role` is the frontend role (admin | clinic_nurse | reception_kawther
 * | reception_sheraton) and `assignedClinicId` is a location CODE.
 * Only reached when VITE_DATA_BACKEND=supabase.
 * ========================================================================= */

function toFrontendRole(portalRole, scopeCodes) {
  if (portalRole === 'admin') return { role: 'admin', assignedClinicId: null }
  if (portalRole === 'clinic_user') return { role: 'clinic_nurse', assignedClinicId: scopeCodes[0] || null }
  if (portalRole === 'reception_user') {
    const code = scopeCodes[0] || null
    return { role: code === 'sheraton' ? 'reception_sheraton' : 'reception_kawther', assignedClinicId: code }
  }
  // owner/insurance_staff/etc. — treat elevated as admin-like read; default scoped.
  if (portalRole === 'owner') return { role: 'admin', assignedClinicId: null }
  return { role: portalRole, assignedClinicId: scopeCodes[0] || null }
}

async function synthesizeUser(db, authUser) {
  if (!authUser) return null
  const uid = authUser.id
  const { data: profile, error: pErr } = await db
    .from('portal_user_profiles')
    .select('role, display_name, active')
    .eq('user_id', uid)
    .maybeSingle()
  if (pErr) throw pErr
  if (!profile || profile.active === false) return null   // no/inactive profile → denied
  const { data: scopes } = await db
    .from('portal_user_location_scopes')
    .select('active, portal_locations(code)')
    .eq('user_id', uid)
    .eq('active', true)
  const scopeCodes = (scopes || []).map((s) => s.portal_locations?.code).filter(Boolean)
  const { role, assignedClinicId } = toFrontendRole(profile.role, scopeCodes)
  return {
    userId: uid,
    email: authUser.email,
    displayName: profile.display_name || authUser.email,
    role,
    assignedClinicId,
    portalRole: profile.role,
    scopeCodes,
  }
}

export async function sbGetSessionUser() {
  const db = await getSupabaseClient()
  const { data } = await db.auth.getSession()
  return synthesizeUser(db, data?.session?.user || null)
}

export async function sbSignIn(email, password) {
  const db = await getSupabaseClient()
  const { data, error } = await db.auth.signInWithPassword({
    email: String(email || '').trim(),
    password: password || '',
  })
  if (error) return { user: null, error: error.message }
  let user = null
  try { user = await synthesizeUser(db, data.user) } catch (e) { return { user: null, error: e.message } }
  if (!user) {
    await db.auth.signOut()
    return { user: null, error: 'No active portal profile is linked to this account.' }
  }
  return { user, error: null }
}

export async function sbSignOut() {
  const db = await getSupabaseClient()
  await db.auth.signOut()
}

export async function sbOnAuthChange(cb) {
  const db = await getSupabaseClient()
  const { data } = db.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') { cb(null, 'PASSWORD_RECOVERY'); return }
    if (!session?.user) { cb(null, event); return }
    synthesizeUser(db, session.user).then((u) => cb(u, event)).catch(() => cb(null, event))
  })
  return data?.subscription
}

/* ---- Password setup / recovery (first-login set-password) ----------------
 * Anon-key only. Start a recovery session in one of two ways:
 *   1. Email link  → sbRequestPasswordReset() sends a recovery email.
 *   2. One-time OTP → sbVerifyRecoveryOtp(email, code) (code from the admin link
 *      or the recovery email). Avoids any redirect-allowlist dependency.
 * Then sbUpdatePassword() sets the chosen password. No plaintext is stored;
 * the recovery code is one-time and time-limited. ------------------------- */
export async function sbRequestPasswordReset(email, redirectTo) {
  const db = await getSupabaseClient()
  const { error } = await db.auth.resetPasswordForEmail(
    String(email || '').trim(),
    redirectTo ? { redirectTo } : undefined,
  )
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function sbVerifyRecoveryOtp(email, code) {
  const db = await getSupabaseClient()
  const { data, error } = await db.auth.verifyOtp({
    email: String(email || '').trim(), token: String(code || '').trim(), type: 'recovery',
  })
  return error ? { ok: false, error: error.message } : { ok: true, session: data?.session || null }
}

export async function sbUpdatePassword(newPassword) {
  const db = await getSupabaseClient()
  const { data, error } = await db.auth.updateUser({ password: newPassword })
  return error ? { ok: false, error: error.message } : { ok: true, user: data?.user || null }
}

/** True if a session exists right now (e.g. an active recovery session). */
export async function sbHasSession() {
  const db = await getSupabaseClient()
  const { data } = await db.auth.getSession()
  return !!data?.session
}

/** Invoke the admin-users Edge Function. The caller's JWT is attached
 *  automatically when signed in; the owner-bootstrap action needs no session.
 *  Returns { ok, error?, ...payload }. */
export async function sbAdminUsers(action, payload = {}) {
  const db = await getSupabaseClient()
  const { data, error } = await db.functions.invoke('admin-users', { body: { action, ...payload } })
  if (error) {
    let msg = error.message
    try { const body = await error.context?.json?.(); if (body?.error) msg = body.error } catch { /* ignore */ }
    return { ok: false, error: msg }
  }
  return { ok: true, ...(data || {}) }
}

/* =========================================================================
 * Session-expiry escalation (P3J hotfix)
 * -----------------------------------------------------------------------
 * Root cause of the "cash save vanished" report: a dead/expired refresh token
 * (console: "AuthApiError: Invalid Refresh Token: Refresh Token Not Found")
 * silently degrades the client — reads return EMPTY (RLS denies the
 * un-authenticated role; no error is thrown) and the UI keeps showing a blank
 * panel as if nothing was ever saved. The data is safe in the DB; only the
 * READ fails. These helpers detect an auth-session failure, clear the stale
 * LOCAL session, and notify the app to route to a clean re-login so the user
 * gets a fresh token. Client session handling ONLY — no RLS / auth-schema
 * change. Reads/writes keep working unchanged once re-authenticated.
 * ========================================================================= */
let _onSessionExpired = null

/** The app (UserModeContext) registers a callback fired when the session dies. */
export function setSessionExpiredHandler(fn) { _onSessionExpired = fn }

/** True only when an error means the Supabase session is no longer valid
 *  (expired access token, or a missing/invalid refresh token, or a 401). Kept
 *  deliberately tight so a transient network / 5xx error never triggers a
 *  false logout. */
export function isAuthSessionError(err) {
  if (!err) return false
  const msg = String(err.message || err.error_description || err.msg || err).toLowerCase()
  const status = Number(err.status || err.statusCode || err.code || 0)
  return (
    status === 401 ||
    msg.includes('refresh token') ||
    msg.includes('jwt expired') ||
    msg.includes('token has expired') ||
    msg.includes('invalid jwt') ||
    msg.includes('invalid claim') ||
    (msg.includes('session') && msg.includes('expired')) ||
    msg.includes('not authenticated')
  )
}

/** If `err` is an auth-session failure, clear the stale local session and
 *  notify the app (→ clean re-login). Returns true when it handled an expiry,
 *  so callers can show the right "session expired" message instead of a
 *  misleading blank/empty state. Safe to call with ANY error (no-op otherwise). */
export async function escalateIfAuthError(err) {
  if (!isAuthSessionError(err)) return false
  try { const db = await getSupabaseClient(); await db.auth.signOut({ scope: 'local' }) } catch { /* ignore */ }
  if (_onSessionExpired) { try { _onSessionExpired() } catch { /* ignore */ } }
  return true
}

/** Proactively ensure the access token is still valid before a critical
 *  read/write. Refreshes if it is at/near expiry; if the refresh fails (dead
 *  refresh token) OR there is no session, escalates to a clean re-login.
 *  Returns { ok:true } | { ok:false, expired:true }. */
export async function sbEnsureSession() {
  const db = await getSupabaseClient()
  let session = null
  try { const { data } = await db.auth.getSession(); session = data?.session || null } catch { session = null }
  if (!session) {
    if (_onSessionExpired) { try { _onSessionExpired() } catch { /* ignore */ } }
    return { ok: false, expired: true }
  }
  const expMs = Number(session.expires_at || 0) * 1000
  if (expMs && expMs - Date.now() < 30000) {
    const { error } = await db.auth.refreshSession()
    if (error) { await escalateIfAuthError(error); return { ok: false, expired: true } }
  }
  return { ok: true }
}
