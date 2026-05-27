import { cn } from '../../lib/cn'

/**
 * Card — base elevated surface.
 * Variants: 'default' | 'subtle' | 'flat'
 * Padding: 'none' | 'sm' | 'md' | 'lg'
 */
export function Card({ as: Tag = 'div', variant = 'default', padding = 'md', className, children, ...rest }) {
  const v =
    variant === 'subtle' ? 'bg-subtle border border-border'
    : variant === 'flat' ? 'bg-surface border border-border'
    : 'bg-surface border border-border shadow-card'
  const p =
    padding === 'none' ? ''
    : padding === 'sm' ? 'p-3 sm:p-4'
    : padding === 'lg' ? 'p-6 sm:p-8'
    : 'p-4 sm:p-5'
  return (
    <Tag className={cn('rounded-xl', v, p, className)} {...rest}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-3', className)}>
      <div className="min-w-0">
        {title && <h3 className="text-sm sm:text-base font-semibold text-ink-900 leading-snug">{title}</h3>}
        {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
