import { Component } from 'react'
import { escalateIfAuthError } from '../lib/api/auth'

/* =========================================================================
 * ErrorBoundary — app-wide crash container.
 * -----------------------------------------------------------------------
 * Before this, the app had NO error boundary anywhere, so a SINGLE render or
 * commit throw unmounted the entire React tree → blank screen → the next
 * reload landed on /login with all unsaved work lost. That is the blast-radius
 * multiplier behind the reported "Visa crash resets to the start": some render/
 * data throw (not the form itself) was turned into a full-app reset.
 *
 * This converts any uncaught render error into a CONTAINED screen that:
 *   - keeps the app alive (no blank reset),
 *   - SHOWS the real error message (so a nurse can screenshot it and we can
 *     finally see the actual stack — esp. the elusive Visa one),
 *   - logs the full component stack to the console,
 *   - escalates a dead-session auth error to a clean re-login.
 *
 * Uses ONLY inline styles + window.location (no theme CSS, no router hooks) so
 * it renders even if styling or routing is the thing that broke.
 * ========================================================================= */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface the real stack: the user can screenshot the fallback; we read this in console.
    // eslint-disable-next-line no-console
    console.error('[Aegis] Uncaught render error:', error, info && info.componentStack)
    // A dead Supabase session can throw while rendering a data-bound view → force re-login.
    try { escalateIfAuthError(error) } catch { /* the handler must never crash the boundary */ }
  }

  render() {
    if (!this.state.error) return this.props.children
    const msg = (this.state.error && (this.state.error.message || String(this.state.error))) || 'Unknown error'
    const base = (import.meta && import.meta.env && import.meta.env.BASE_URL) || '/'
    return (
      <div style={WRAP}>
        <div style={CARD}>
          <div style={TITLE}>حصل خطأ غير متوقع — Something went wrong</div>
          <div style={BODY}>
            الشاشة دي اتوقفت، بس البيانات المحفوظة في الخادم سليمة. جرّب تعيد التحميل أو ترجع للرئيسية.
            <br />This screen hit an error — your saved data is safe. Reload, or go back home.
          </div>
          <pre style={PRE}>{msg}</pre>
          <div style={ROW}>
            <button onClick={() => window.location.reload()} style={btn(true)}>إعادة التحميل · Reload</button>
            <button onClick={() => { window.location.href = base }} style={btn(false)}>الرئيسية · Home</button>
          </div>
        </div>
      </div>
    )
  }
}

const WRAP = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0E2247', color: 'white', fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif' }
const CARD = { maxWidth: 560, width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 16, padding: 24 }
const TITLE = { fontSize: 18, fontWeight: 800, marginBottom: 6 }
const BODY = { fontSize: 13, opacity: 0.85, marginBottom: 14, lineHeight: 1.7 }
const PRE = { fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 10, maxHeight: 160, overflow: 'auto', margin: '0 0 14px' }
const ROW = { display: 'flex', gap: 10, flexWrap: 'wrap' }
const btn = (primary) => ({ height: 40, padding: '0 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: primary ? 'none' : '1px solid rgba(255,255,255,0.3)', background: primary ? '#0FB5A9' : 'transparent', color: 'white' })

export default ErrorBoundary
