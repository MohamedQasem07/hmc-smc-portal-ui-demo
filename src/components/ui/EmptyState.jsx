import { cn } from '../../lib/cn'
import { Inbox } from 'lucide-react'

export function EmptyState({ icon: Icon = Inbox, title, message, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-10 px-4', className)}>
      <div className="w-12 h-12 rounded-full bg-subtle border border-border flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-ink-400" />
      </div>
      {title && <h4 className="text-sm font-semibold text-ink-800">{title}</h4>}
      {message && <p className="text-xs text-ink-500 mt-1 max-w-xs">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
