import { cn } from '../../lib/cn'
import { X, CheckSquare, Download, FilePenLine, UserCog, MoreHorizontal } from 'lucide-react'

/**
 * BulkActionBar — floating action bar that appears when 1+ rows are selected.
 * Demo-only actions; props are wired to mock callbacks that should fire toasts.
 */
export function BulkActionBar({ count, onClear, onMarkReviewed, onAssignStatus, onExport, className }) {
  if (!count) return null
  return (
    <div className={cn(
      'sticky bottom-4 z-30 mx-auto max-w-3xl bg-navy-900 text-white rounded-2xl shadow-popover',
      'flex items-center gap-2 px-3 sm:px-4 py-2.5 animate-slide-up',
      className,
    )}>
      <div className="flex items-center gap-2 me-2 ps-1">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <CheckSquare className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">{count} selected</div>
          <div className="text-[10px] text-sky-200/80">Demo bulk actions — no backend write</div>
        </div>
      </div>
      <div className="flex-1" />
      <div className="hidden sm:flex items-center gap-1">
        <BarBtn icon={FilePenLine} onClick={onMarkReviewed}>Mark Reviewed</BarBtn>
        <BarBtn icon={UserCog}     onClick={onAssignStatus}>Assign Status</BarBtn>
        <BarBtn icon={Download}    onClick={onExport}>Export View</BarBtn>
      </div>
      <div className="sm:hidden">
        <BarBtn icon={MoreHorizontal} onClick={() => onMarkReviewed?.()}>Actions</BarBtn>
      </div>
      <button onClick={onClear} aria-label="Clear selection" className="ms-1 p-2 rounded-md text-white/70 hover:bg-white/10 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function BarBtn({ icon: Icon, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs sm:text-sm font-medium text-white/90 hover:bg-white/10"
    >
      <Icon className="w-4 h-4" /> {children}
    </button>
  )
}
