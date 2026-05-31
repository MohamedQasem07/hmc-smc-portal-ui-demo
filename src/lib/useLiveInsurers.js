import { useEffect, useState } from 'react'
import { IS_SUPABASE } from './api/config'
import { fetchInsuranceCompaniesForPicker } from './api/portalData'
import { useInsurers } from '../context/DemoStateContext'

/* =========================================================================
 * useLiveInsurers — intake insurer list source (Bundle 1 / Phase C).
 * -----------------------------------------------------------------------
 * Supabase mode: the live active insurer master (portal_insurance_companies)
 * so reception PREFERS selecting from the real list. Mock mode: the existing
 * in-memory demo catalogue (unchanged). Free-text add still works either way —
 * the real DB insert happens server-side in insertCase (ilike-or-create), so an
 * old/free-typed company never breaks intake.
 * useInsurers() is always called (hooks rule); its value is just ignored live.
 * ========================================================================= */
export function useLiveInsurers() {
  const mock = useInsurers()
  const [live, setLive] = useState(null)
  useEffect(() => {
    if (!IS_SUPABASE) return undefined
    let alive = true
    fetchInsuranceCompaniesForPicker().then((r) => { if (alive) setLive(r) }).catch(() => { if (alive) setLive([]) })
    return () => { alive = false }
  }, [])
  return IS_SUPABASE ? (live || []) : mock
}
