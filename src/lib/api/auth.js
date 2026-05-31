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
  const { data } = db.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) { cb(null); return }
    synthesizeUser(db, session.user).then(cb).catch(() => cb(null))
  })
  return data?.subscription
}
