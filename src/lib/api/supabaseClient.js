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
let _client = null

export async function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (P3B).',
    )
  }
  if (_client) return _client
  // The /* @vite-ignore */ hint below keeps Vite from resolving/bundling the
  // package at build time while it is not yet installed (mock mode never
  // reaches this line).
  const mod = await import(/* @vite-ignore */ '@supabase/supabase-js')
  _client = mod.createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { db: { schema: 'public' }, auth: { persistSession: true, autoRefreshToken: true } },
  )
  return _client
}
