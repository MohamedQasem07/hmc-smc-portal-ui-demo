import { cn } from '../../lib/cn'

/**
 * KpiCard — top-level metric tile. Used on Clinic Dashboard, Admin Dashboard, Daily Report.
 * Keeps a clean, large-numeric look with optional helper text and trend.
 */
export function KpiCard({ label, value, hint, icon: Icon, tone = 'navy', className, onClick }) {
  const iconBg = {
    navy: 'bg-navy-50 text-navy-700',
    sky:  'bg-sky-50 text-sky-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    rose: 'bg-rose-50 text-rose-700',
  }[tone] || 'bg-navy-50 text-navy-700'

  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'group rounded-xl bg-surface border border-border shadow-card hover:shadow-card-hover transition-all',
        'p-4 sm:p-5 text-start w-full flex items-start gap-3 sm:gap-4',
        onClick && 'cursor-pointer hover:border-border-strong',
        className,
      )}
    >
      {Icon && (
        <div className={cn('w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] sm:text-xs font-medium uppercase tracking-wide text-ink-500">{label}</div>
        <div className="mt-1 text-2xl sm:text-3xl font-semibold text-ink-900 tabular-nums leading-none">{value}</div>
        {hint && <div className="mt-1.5 text-[11px] text-ink-400">{hint}</div>}
      </div>
    </Tag>
  )
}
