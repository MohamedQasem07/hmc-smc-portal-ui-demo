import { cn } from '../../lib/cn'
import { Check } from 'lucide-react'

/**
 * Stepper — vertical-on-mobile, horizontal-on-desktop indicator.
 * Shows: completed (filled), current (ring), upcoming (muted).
 *
 * <Stepper steps={[{id, label, hint?}]} current="b" onJump={id => ...} />
 */
export function Stepper({ steps, current, onJump, className }) {
  const currentIdx = steps.findIndex((s) => s.id === current)
  return (
    <ol className={cn(
      'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-1',
      className,
    )}>
      {steps.map((s, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <li key={s.id} className="flex sm:flex-1 items-start sm:items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onJump ? () => onJump(s.id) : undefined}
              className={cn(
                'group flex items-center gap-2.5 min-w-0 text-start',
                onJump ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <span className={cn(
                'shrink-0 inline-flex items-center justify-center rounded-full transition-all',
                'w-7 h-7 text-xs font-semibold',
                done   ? 'bg-emerald-600 text-white ring-2 ring-emerald-100' :
                active ? 'bg-navy-800 text-white ring-4 ring-navy-100' :
                         'bg-white text-ink-400 ring-1 ring-inset ring-border-strong',
              )}>
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cn(
                  'block text-sm font-semibold truncate',
                  active ? 'text-ink-900' : done ? 'text-ink-700' : 'text-ink-500',
                )}>{s.label}</span>
                {s.hint && (
                  <span className={cn(
                    'block text-[11px] truncate',
                    active ? 'text-ink-500' : 'text-ink-400',
                  )}>{s.hint}</span>
                )}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span className={cn(
                'hidden sm:block flex-1 h-[2px] rounded-full',
                done ? 'bg-emerald-300' : 'bg-border',
              )} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
