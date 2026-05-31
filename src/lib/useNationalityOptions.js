import { useEffect, useState } from 'react'
import { IS_SUPABASE } from './api/config'
import { R1_NATIONALITIES } from '../data/p2cR1'

/* =========================================================================
 * useNationalityOptions — New Case nationality picker source.
 * Supabase mode: live active rows from portal_nationalities (full 245-strong
 * reference, admin-toggleable). Mock mode (5173): the local demo subset.
 * Returns an array of display strings (name_en) to match how the form
 * stores nationality (free text). Falls back to the demo subset on error.
 * ========================================================================= */
export function useNationalityOptions() {
  const [opts, setOpts] = useState(IS_SUPABASE ? [] : R1_NATIONALITIES)
  useEffect(() => {
    if (!IS_SUPABASE) return
    let on = true
    import('./api/portalData')
      .then(({ fetchNationalities }) => fetchNationalities({ activeOnly: true }))
      .then((rows) => { if (on && rows?.length) setOpts(rows.map((r) => r.name_en)) })
      .catch(() => { if (on) setOpts(R1_NATIONALITIES) })
    return () => { on = false }
  }, [])
  return opts
}
