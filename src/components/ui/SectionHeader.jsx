import { cn } from '../../lib/cn'

/**
 * SectionHeader — small typographic divider for grouping content inside pages and forms.
 */
export function SectionHeader({ title, description, icon: Icon, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-3', className)}>
      <div className="flex items-start gap-2.5 min-w-0">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-ink-900 leading-snug">{title}</h3>
          {description && <p className="text-xs text-ink-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
