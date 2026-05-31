// =============================================================================
// TEMPORARY diagnostics — live tab-focus remount investigation.
// Console-only; remove after the root cause is fixed. Logs are prefixed [DIAG].
// =============================================================================
export function diag(...args) {
  try {
    const t = typeof performance !== 'undefined' ? Math.round(performance.now()) : 0
    // eslint-disable-next-line no-console
    console.log(`[DIAG +${t}ms]`, ...args)
  } catch { /* ignore */ }
}

let _installed = false
/** Window/document lifecycle listeners that distinguish a full page reload
 *  (beforeunload/pagehide → pageshow) from an in-app React remount. */
export function installPageDiagnostics() {
  if (_installed || typeof window === 'undefined') return
  _installed = true
  diag('page diagnostics installed; href =', window.location.href)
  document.addEventListener('visibilitychange', () =>
    diag('document.visibilitychange ->', document.visibilityState))
  ;['focus', 'blur'].forEach((n) => window.addEventListener(n, () => diag('window.' + n)))
  window.addEventListener('pageshow', (e) => diag('window.pageshow persisted=' + e.persisted))
  window.addEventListener('pagehide', (e) => diag('window.pagehide persisted=' + e.persisted))
  window.addEventListener('beforeunload', () => diag('window.beforeunload  <== FULL PAGE UNLOAD/RELOAD'))
}
