import { cn } from '../../lib/cn'

/**
 * PageHeader — standard page header used at the top of every page below the AppShell.
 * Title + optional description + right-side actions.
 */
export function PageHeader({ title, description, actions, children, className }) {
  return (
    <div className={cn('px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7', className)}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-900 leading-tight">{title}</h1>
          {description && <p className="text-sm text-ink-500 mt-1 max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

/**
 * PageBody — main content container with consistent padding.
 */
export function PageBody({ className, children }) {
  return <div className={cn('px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6', className)}>{children}</div>
}
