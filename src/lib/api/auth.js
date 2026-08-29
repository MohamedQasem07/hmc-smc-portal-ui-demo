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

/** GoTrue answers 429 `over_request_rate_limit` when too many /token calls come
 *  from one IP in the window. Retrying makes it worse and only extends the block,
 *  so this is surfaced to the user as "wait", never retried. */
export function isRateLimited(err) {
  const status = Number(err?.status || err?.statusCode || 0)
  const msg = String(err?.message || err?.error_description || err || '').toLowerCase()
  return status === 429 || String(err?.code || '') === 'over_request_rate_limit' ||
    msg.includes('rate limit') || msg.includes('too many requests')
}

const RATE_LIMIT_MESSAGE =
  'Too many sign-in attempts from this network. Please wait about a minute, then try again.'

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
  let session = null
  try { const { data } = await db.auth.getSession(); session = data?.session || null }
  catch (e) {
    // A dead or rate-limited refresh token cannot be restored. Purge it locally so
    // auto-refresh stops retrying against it — those retries are what drove the
    // /token 429 and left the app in a permanent 401 loop.
    if (!isLockError(e)) { try { await db.auth.signOut({ scope: 'local' }) } catch { /* ignore */ } }
    return null
  }
  if (!session) return null
  try { return await synthesizeUser(db, session.user) }
  catch { return null }   // profile unreadable right now → treat as signed out, don't crash boot
}

export async function sbSignIn(email, password) {
  const db = await getSupabaseClient()
  // A poisoned refresh token left over from a previous broken session keeps
  // auto-refresh hammering /token and can rate-limit (429) the very sign-in we
  // are about to make. Drop any local session first — the credentials below are
  // the source of truth, nothing of value is discarded.
  try { await db.auth.signOut({ scope: 'local' }) } catch { /* ignore */ }

  const { data, error } = await db.auth.signInWithPassword({
    email: String(email || '').trim(),
    password: password || '',
  })
  if (error) {
    return { user: null, error: isRateLimited(error) ? RATE_LIMIT_MESSAGE : error.message }
  }

  // The credentials were accepted — the session is live. Building the app user
  // needs one more read, and THAT read failing must not be reported as a failed
  // login: it previously threw, so sign-in returned "no user" and bounced the
  // nurse straight back to /login even though he had authenticated correctly.
  let user = null
  try { user = await synthesizeUser(db, data.user) }
  catch (e) {
    // Transient (401 while the new token settles, or a rate-limited moment) —
    // the session is valid, so retry once before giving up.
    try { user = await synthesizeUser(db, data.user) }
    catch (e2) {
      return {
        user: null,
        error: isRateLimited(e2)
          ? RATE_LIMIT_MESSAGE
          : 'Signed in, but your profile could not be loaded. Please try again in a moment.',
      }
    }
  }
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
  // The event MUST be filtered before any network read. synthesizeUser costs two
  // requests (portal_user_profiles + portal_user_location_scopes), and this fired
  // on EVERY event including TOKEN_REFRESHED. While auto-refresh retried against a
  // rate-limited /token, each retry emitted an event and each event issued two more
  // reads — the loop of repeated 401 profile/scope requests in the nurse's console,
  // which then fed the very rate limit it was failing on. The consumer in
  // UserModeContext already skipped TOKEN_REFRESHED, but only AFTER the reads.
  let lastUid = null
  const { data } = db.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') { cb(null, 'PASSWORD_RECOVERY'); return }
    if (event === 'TOKEN_REFRESHED') return          // nothing to re-read
    if (!session?.user) { lastUid = null; cb(null, event); return }
    // Supabase re-emits SIGNED_IN on tab focus; same user ⇒ no work.
    if (event === 'SIGNED_IN' && lastUid === session.user.id) return
    lastUid = session.user.id
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
  const code = String(err.code || '').toUpperCase()
  // err.code on a PostgrestError is the SQLSTATE ("42501"), never an HTTP status,
  // so it must not be folded into the status check — Number("42501") is not 401.
  const status = Number(err.status || err.statusCode || 0)
  return (
    status === 401 ||
    code === 'PGRST301' ||          // PostgREST: JWT expired
    code === 'PGRST302' ||          // PostgREST: anonymous access disallowed
    msg.includes('refresh token') ||
    msg.includes('jwt expired') ||
    msg.includes('token has expired') ||
    msg.includes('invalid jwt') ||
    msg.includes('invalid claim') ||
    (msg.includes('session') && msg.includes('expired')) ||
    msg.includes('not authenticated')
  )
}

/** Postgres 42501 = insufficient_privilege. Every portal_* table is granted to
 *  `authenticated` only, so a 42501 means PostgREST ran the request as `anon` —
 *  i.e. the JWT was missing, expired, or revoked. This is the exact error a
 *  rotated-away refresh token produces, and the symptom staff report as
 *  "the app shows none of my branch's data". Probed against the live session
 *  before it is allowed to force a logout, so a genuine missing GRANT never
 *  signs anybody out. */
function isPrivilegeError(err) {
  return String(err?.code || '') === '42501'
}

/** A Web-Locks contention failure from the auth client ("Acquiring an exclusive
 *  Navigator LockManager lock … immediately failed"). It means another tab or a
 *  re-entrant call held the auth lock — NOT that the session died. Treated as
 *  transient so it can never sign anybody out. P4D switched the client to
 *  `processLock`, which should stop these being raised at all; this guard stays
 *  as the belt-and-braces so the class can never again masquerade as an expiry. */
export function isLockError(err) {
  const msg = String(err?.message || err || '')
  return msg.includes('LockManager') || msg.includes('lock:sb-') || err?.isAcquireTimeout === true
}

/** If `err` is an auth-session failure, clear the stale local session and
 *  notify the app (→ clean re-login). Returns true when it handled an expiry,
 *  so callers can show the right "session expired" message instead of a
 *  misleading blank/empty state. Safe to call with ANY error (no-op otherwise). */
export async function escalateIfAuthError(err) {
  if (isLockError(err)) return false      // transient contention, never an expiry
  let expired = isAuthSessionError(err)
  if (!expired && isPrivilegeError(err)) {
    // Ran as anon? Confirm against the live session before forcing a re-login.
    try {
      const db = await getSupabaseClient()
      const { data } = await db.auth.getSession()
      expired = !data?.session
    } catch (e) {
      // Could not READ the session — only an actual auth failure counts. Lock
      // contention here must not be mistaken for an expiry and sign the user out.
      if (isLockError(e)) return false
      expired = true
    }
  }
  if (!expired) return false
  try { const db = await getSupabaseClient(); await db.auth.signOut({ scope: 'local' }) } catch { /* ignore */ }
  if (_onSessionExpired) { try { _onSessionExpired() } catch { /* ignore */ } }
  return true
}

/* -------------------------------------------------------------------------
 * Single-flight session check.
 * -------------------------------------------------------------------------
 * A page mount fires many reads at once (each useCasesForClinic refetches, plus
 * warnings, treasury, rooms…). When the access token has expired, every one of
 * those independently asked GoTrue to refresh. Supabase ROTATES refresh tokens —
 * each success revokes the previous one — so a burst of concurrent refreshes
 * revoke each other, trip the /token rate limit (429), and leave the browser
 * holding a revoked token. Every subsequent read then runs as `anon` and returns
 * 401 / 42501, which the UI rendered as an empty workspace.
 *
 * Sharing ONE in-flight promise collapses that burst into a single refresh.
 * ------------------------------------------------------------------------- */
let _ensureInFlight = null

/** Proactively ensure the access token is still valid before a critical
 *  read/write. Refreshes if it is at/near expiry; if the refresh fails (dead
 *  refresh token) OR there is no session, escalates to a clean re-login.
 *  Concurrent callers share one check. Returns { ok:true } | { ok:false, expired:true }. */
export async function sbEnsureSession() {
  if (_ensureInFlight) return _ensureInFlight
  _ensureInFlight = (async () => {
    const db = await getSupabaseClient()
    let session = null
    let lockBusy = false
    try { const { data } = await db.auth.getSession(); session = data?.session || null }
    catch (e) { if (isLockError(e)) lockBusy = true; session = null }
    // Lock contention is not an expiry — proceed and let the read itself decide,
    // rather than signing the user out over a transient failure to read the token.
    if (lockBusy) return { ok: true }
    if (!session) {
      if (_onSessionExpired) { try { _onSessionExpired() } catch { /* ignore */ } }
      return { ok: false, expired: true }
    }
    // Refresh a little further out than the old 30s: a slow clinic connection
    // could otherwise start a read on a token that expires mid-flight.
    const expMs = Number(session.expires_at || 0) * 1000
    if (expMs && expMs - Date.now() < 120000) {
      const { error } = await db.auth.refreshSession()
      if (error) { await escalateIfAuthError(error); return { ok: false, expired: true } }
    }
    return { ok: true }
  })()
  try { return await _ensureInFlight } finally { _ensureInFlight = null }
}
