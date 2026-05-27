import { cn } from '../../lib/cn'

/**
 * MetaItem — uniform label + value cell used across detail pages.
 * Compact, accessible, monospace-friendly for refs.
 */
export function MetaItem({ label, value, icon: Icon, mono = false, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{label}</div>
      <div className={cn('text-sm font-medium text-ink-900 mt-0.5 flex items-center gap-1.5 truncate', mono && 'font-mono text-[12px]')}>
        {Icon && <Icon className="w-3.5 h-3.5 text-ink-400 shrink-0" />}
        <span className="truncate">{value ?? <span className="text-ink-300">—</span>}</span>
      </div>
    </div>
  )
}
