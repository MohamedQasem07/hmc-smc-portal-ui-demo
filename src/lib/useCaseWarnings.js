import { useCallback, useEffect, useMemo, useState } from 'react'
import { IS_SUPABASE } from './api/config'
import { fetchCaseFinancialIndex } from './api/portalData'
import { computeCaseWarnings, buildReviewQueues } from './caseWarnings'

/* =========================================================================
 * useCaseWarnings — React glue over the pure caseWarnings rules.
 * -----------------------------------------------------------------------
 * Loads the bulk (caseId → financials) index ONCE per consuming page
 * (supabase mode; one extra pair of RLS-scoped reads) and returns a stable
 * `warningsFor(case)` so list rows + dashboard queues compute deterministically
 * from already-loaded case objects. Mock mode resolves to an empty index, so
 * the money rules simply do not fire (graceful, never fabricated).
 * ========================================================================= */

/** Today as YYYY-MM-DD, stable for the lifetime of the component. */
function useToday() {
  return useMemo(() => new Date().toISOString().slice(0, 10), [])
}

/** Bulk financials index hook. `ready` flips true once loaded (or immediately
 *  in mock mode). `reload` refetches after a correction so chips update. */
export function useCaseFinancialIndex() {
  const [index, setIndex] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!IS_SUPABASE) { setIndex({}); return }
    try { setIndex(await fetchCaseFinancialIndex()); setError(null) }
    catch (e) { console.warn('[supervision] financial index failed', e?.message); setIndex({}); setError(e?.message || 'Could not load financial data') }
  }, [])

  useEffect(() => { load() }, [load])
  return { index: index || {}, ready: index !== null, error, reload: load }
}

/** Per-case warnings for list/detail surfaces. */
export function useCaseWarnings() {
  const today = useToday()
  const { index, ready, error, reload } = useCaseFinancialIndex()
  const warningsFor = useCallback(
    (c) => computeCaseWarnings(c, c ? index[c.id] : null, { today }),
    [index, today],
  )
  return { warningsFor, ready, error, reload, index }
}

/** Admin dashboard review queues from a list of cases. */
export function useReviewQueues(cases) {
  const today = useToday()
  const { index, ready, error, reload } = useCaseFinancialIndex()
  const queues = useMemo(
    () => buildReviewQueues(cases || [], index, { today }),
    [cases, index, today],
  )
  return { queues, ready, error, reload }
}
