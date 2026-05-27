import { cn } from '../../lib/cn'

/**
 * Tabs — segmented control. Controlled component.
 *
 * <Tabs value={value} onChange={setValue} items={[{id, label, count?}]} />
 */
export function Tabs({ value, onChange, items, size = 'md', className }) {
  const sz = size === 'sm' ? 'text-xs h-8 px-3' : 'text-sm h-9 px-3.5'
  return (
    <div className={cn('inline-flex bg-subtle rounded-lg p-1 gap-0.5 border border-border', className)}>
      {items.map((it) => {
        const active = it.id === value
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={cn(
              'rounded-md font-medium transition-colors inline-flex items-center gap-1.5',
              sz,
              active ? 'bg-white text-navy-800 shadow-sm' : 'text-ink-600 hover:text-ink-800',
            )}
          >
            {it.label}
            {typeof it.count === 'number' && (
              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums',
                active ? 'bg-sky-100 text-sky-800' : 'bg-white/70 text-ink-500')}>
                {it.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
