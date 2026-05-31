/* =========================================================================
 * Data-access backend selector (P3-prep)
 * -----------------------------------------------------------------------
 * Default backend is 'mock' (browser-local; DemoStateContext + localStorage).
 * 'supabase' is wired in P3B AFTER explicit owner approval + RLS verification.
 *
 * Set in .env.local:
 *   VITE_DATA_BACKEND=mock        # default — no backend
 *   VITE_DATA_BACKEND=supabase    # P3B — requires VITE_SUPABASE_URL + ANON_KEY
 * ========================================================================= */
export const DATA_BACKEND = String(import.meta.env.VITE_DATA_BACKEND || 'mock').toLowerCase()
export const IS_SUPABASE = DATA_BACKEND === 'supabase'

/** True only when both public Supabase envs are present (anon key only). */
export function isSupabaseConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}
