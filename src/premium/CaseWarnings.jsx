import { AlertTriangle, Info, ShieldAlert, ChevronRight } from 'lucide-react'

/* =========================================================================
 * CaseWarnings.jsx — UI for the Pilot Supervision layer.
 * Renders the rules from lib/caseWarnings.js. Pure presentation; the warning
 * objects ({ id, severity, label, detail, section }) come from computeCaseWarnings.
 *   - CaseWarningChips    : compact row of chips for a case-list row.
 *   - NeedsAttentionPanel : full "Needs Attention" card for Case Detail with
 *                           per-warning quick actions (→ Full Case Editor / section).
 * ========================================================================= */

const TONES = {
  danger: { bg: 'var(--p-mixed-soft)', fg: '#B14242', bd: '#F0B5B5', Icon: AlertTriangle },
  warn:   { bg: 'var(--p-pending-soft)', fg: '#A1672A', bd: '#F0C97A', Icon: AlertTriangle },
  info:   { bg: 'var(--p-surface-tint)', fg: 'var(--p-ink-500)', bd: 'var(--p-border)', Icon: Info },
}

const ACTION_LABEL = {
  registration: 'Open editor',
  financial: 'Money',
  visit: 'Visit',
  transfer: 'Transfer',
}

function tipFor(list) {
  return list.map((w) => `• ${w.label} — ${w.detail}`).join('\n')
}

/** Compact warning chips for a case-list row. Loud (danger/warn) chips are shown
 *  up to `max`; the rest collapse into a "+N" pill; all info warnings collapse
 *  into a single subtle counter pill — so a row never floods with chips. */
export function CaseWarningChips({ warnings = [], max = 2, className = '' }) {
  if (!warnings.length) return null
  const loud = warnings.filter((w) => w.severity !== 'info')
  const info = warnings.filter((w) => w.severity === 'info')
  const shown = loud.slice(0, max)
  const hiddenLoud = loud.slice(max)

  return (
    <div className={`inline-flex items-center gap-1 flex-wrap ${className}`}>
      {shown.map((w) => {
        const t = TONES[w.severity] || TONES.warn
        const Icon = t.Icon
        return (
          <span key={w.id} title={w.detail}
            className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10.5px] font-semibold whitespace-nowrap"
            style={{ background: t.bg, color: t.fg, border: `1px solid ${t.bd}` }}>
            <Icon className="w-3 h-3 shrink-0" /> {w.label}
          </span>
        )
      })}
      {hiddenLoud.length > 0 && (
        <span title={tipFor(hiddenLoud)}
          className="inline-flex items-center px-2 h-6 rounded-full text-[10.5px] font-bold"
          style={{ background: TONES[hiddenLoud[0].severity].bg, color: TONES[hiddenLoud[0].severity].fg, border: `1px solid ${TONES[hiddenLoud[0].severity].bd}` }}>
          +{hiddenLoud.length}
        </span>
      )}
      {info.length > 0 && (
        <span title={tipFor(info)}
          className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10.5px] font-semibold"
          style={{ background: TONES.info.bg, color: TONES.info.fg, border: `1px solid ${TONES.info.bd}` }}>
          <Info className="w-3 h-3 shrink-0" /> {info.length}
        </span>
      )}
    </div>
  )
}

/** Tiny inline dot summarising the worst severity (for dense rows). */
export function WarningDot({ warnings = [] }) {
  if (!warnings.length) return null
  const sev = warnings.some((w) => w.severity === 'danger') ? 'danger'
    : warnings.some((w) => w.severity === 'warn') ? 'warn' : 'info'
  const t = TONES[sev]
  return <span title={tipFor(warnings)} className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: t.fg }} />
}

/** Full "Needs Attention" panel for the Case Detail / Full Case Editor.
 *  Renders nothing when the case is clean (so a corrected case shows no panel).
 *  onAction(section, warning) is called by each quick-action button. */
export function NeedsAttentionPanel({ warnings = [], onAction, busy = false }) {
  if (!warnings.length) return null
  const headTone = warnings.some((w) => w.severity === 'danger') ? TONES.danger : TONES.warn

  return (
    <section className="p-card p-4 sm:p-5 space-y-3"
      style={{ border: `1px solid ${headTone.bd}`, background: headTone.bg }}>
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0" style={{ color: headTone.fg }} />
        <h3 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: headTone.fg }}>
          Needs Attention · {warnings.length}
        </h3>
      </div>
      <ul className="space-y-2">
        {warnings.map((w) => {
          const t = TONES[w.severity] || TONES.warn
          const Icon = t.Icon
          return (
            <li key={w.id} className="rounded-xl px-3 py-2.5 flex items-start gap-2.5"
              style={{ background: 'var(--p-surface)', border: `1px solid var(--p-border)` }}>
              <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: t.fg }} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold" style={{ color: 'var(--p-ink-900)' }}>{w.label}</div>
                <div className="text-[11.5px] leading-snug" style={{ color: 'var(--p-ink-600)' }}>{w.detail}</div>
              </div>
              {onAction && w.section && (
                <button type="button" disabled={busy} onClick={() => onAction(w.section, w)}
                  className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold transition-opacity"
                  style={{ background: 'var(--p-ink-900)', color: 'white', opacity: busy ? 0.6 : 1 }}>
                  {ACTION_LABEL[w.section] || 'Fix'} <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
