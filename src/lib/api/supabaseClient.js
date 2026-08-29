import { isSupabaseConfigured } from './config'

/* =========================================================================
 * Inert Supabase client (P3-prep)
 * -----------------------------------------------------------------------
 * INERT until P3B. The app builds and runs in mock mode WITHOUT the
 * @supabase/supabase-js package installed and WITHOUT any env configured,
 * because the package is loaded with a dynamic import carrying a Vite-ignore
 * hint, and getSupabaseClient() is only ever called when
 * VITE_DATA_BACKEND=supabase.
 *
 * P3B checklist before this is used:
 *   1. Owner approves the connection + project home (hmc-medical).
 *   2. npm i @supabase/supabase-js
 *   3. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env.local
 *      (anon / publishable key ONLY — never the service-role key in frontend).
 *   4. Verify RLS per role on a throwaway row BEFORE any real write.
 * ========================================================================= */
let _clientPromise = null

export async function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (P3B).',
    )
  }
  // Cache the PROMISE, not the resolved client. The dynamic import below is
  // async, so concurrent first-callers (UserModeContext fires sbGetSessionUser
  // AND sbOnAuthChange at mount) would each pass an `if (_client)` check while
  // _client is still null and each call createClient — producing TWO
  // GoTrueClient instances that then fight over the same storage key on tab
  // focus (spurious SIGNED_OUT → bounce to /login → looks like a reload).
  // Sharing one promise guarantees exactly one createClient per browser context.
  if (_clientPromise) return _clientPromise
  _clientPromise = (async () => {
    // The /* @vite-ignore */ hint keeps Vite from resolving/bundling the package
    // at build time (mock mode never reaches this line).
    const mod = await import(/* @vite-ignore */ '@supabase/supabase-js')
    return mod.createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        db: { schema: 'public' },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // P4D — the default `navigatorLock` guards the auth token with the Web
          // Locks API, and on some paths asks for it with ifAvailable:true. When
          // the lock is already held (a second tab, or a re-entrant auth call) it
          // does not queue — it throws
          //   "Acquiring an exclusive Navigator LockManager lock … immediately failed"
          // as an UNHANDLED rejection. The client then cannot read the session it
          // just created, so sign-in appeared to succeed and bounced straight back
          // to /login, and every read went out unauthenticated (401 / 42501).
          // `processLock` serialises the same operations in-process and WAITS
          // instead of failing fast, which removes that whole failure class.
          // Cross-tab refreshes are no longer coordinated by the browser, so the
          // in-tab single-flight in auth.js/sbEnsureSession carries that job.
          lock: mod.processLock,
        },
      },
    )
  })()
  return _clientPromise
}
