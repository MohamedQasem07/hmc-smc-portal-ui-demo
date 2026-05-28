import { Lock, Info } from 'lucide-react'

/* =========================================================================
 * P2C.R3 — LockedRefField
 * -----------------------------------------------------------------------
 * Renders the auto-generated OUR Ref (or any system-generated identity
 * field) as a clearly locked, non-editable display. Mohamed's binding
 * rule: reception / nurse never types the case identity manually.
 *
 *   - The value is read-only (rendered as <span>, not <input>).
 *   - A lock icon makes the immutability obvious.
 *   - Disclaimer line: this is a demo sequence; final global sequencing
 *     will come from the backend later.
 *
 * Used in:
 *   - Clinic New Case (top of the form)
 *   - Reception New Direct Case (top of the form)
 *   - Cash Invoice Collection (replaces editable Invoice Number)
 * ========================================================================= */

export function LockedRefField({
  label = 'OUR Ref',
  value,
  family,           // 'HMC' | 'SMC' | undefined
  hint,
  size = 'lg',      // 'sm' | 'md' | 'lg'
}) {
  const sizing = size === 'sm'
    ? { font: 'text-sm', pad: 'h-10 px-3', icon: 'w-4 h-4' }
    : size === 'md'
    ? { font: 'text-base', pad: 'h-11 px-3.5', icon: 'w-4 h-4' }
    : { font: 'text-lg', pad: 'h-12 px-4', icon: 'w-5 h-5' }
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] uppercase tracking-[0.12em] font-bold flex items-center gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
        {label}
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 h-4 rounded-full"
              style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)', border: '1px solid var(--p-border)' }}>
          <Lock className="w-2.5 h-2.5" /> LOCKED
        </span>
        {family && (
          <span className="inline-flex items-center text-[10px] font-bold px-1.5 h-4 rounded-full"
                style={{ background: family === 'HMC' ? 'var(--p-brand-pale)' : 'var(--p-teal-soft)',
                         color:       family === 'HMC' ? '#1E4180' : '#0A8F87',
                         border:      family === 'HMC' ? '1px solid #BCCDE8' : '1px solid #A6E2DC' }}>
            {family}
          </span>
        )}
      </label>

      <div className={`inline-flex items-center gap-2 rounded-xl ${sizing.pad} font-bold p-numeric ${sizing.font}`}
           style={{
             background: 'linear-gradient(135deg, var(--p-surface-tint) 0%, white 100%)',
             border: '1px solid var(--p-border-strong)',
             color: 'var(--p-ink-900)',
             letterSpacing: '0.02em',
           }}>
        <Lock className={`${sizing.icon} shrink-0`} style={{ color: 'var(--p-ink-400)' }} />
        <span className="truncate">{value || '—'}</span>
      </div>

      <div className="text-[11px] flex items-start gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>{hint || 'Auto-generated case identity — not editable. Unique within this demo session.'}</span>
      </div>
    </div>
  )
}
