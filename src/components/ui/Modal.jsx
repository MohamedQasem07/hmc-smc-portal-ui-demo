import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Modal — centered dialog. For wide content prefer Drawer.
 * Closes on Escape and on backdrop click. Locks body scroll while open.
 */
export function Modal({ open, onClose, title, subtitle, footer, size = 'md', children }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-surface shadow-popover rounded-t-2xl sm:rounded-2xl animate-slide-up max-h-[92vh] flex flex-col',
          widths[size] || widths.md,
          'sm:mx-4',
        )}
      >
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-border">
          <div className="min-w-0">
            {title && <h2 className="text-base sm:text-lg font-semibold text-ink-900">{title}</h2>}
            {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-md hover:bg-subtle text-ink-500 -mt-1 -me-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto">{children}</div>
        {footer && <div className="p-4 sm:p-5 border-t border-border bg-subtle/50 rounded-b-2xl sm:rounded-b-2xl flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/**
 * Drawer — right-side slide-in panel. Used for case detail audit/history side view.
 */
export function Drawer({ open, onClose, title, subtitle, width = 'md', children }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-xl' }

  return createPortal(
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="absolute inset-0 bg-navy-950/40" onClick={onClose} />
      <aside className={cn(
        'absolute right-0 top-0 bottom-0 w-full bg-surface shadow-popover flex flex-col',
        'sm:w-auto', widths[width] || widths.md,
      )}>
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-border">
          <div className="min-w-0">
            {title && <h2 className="text-base sm:text-lg font-semibold text-ink-900">{title}</h2>}
            {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-md hover:bg-subtle text-ink-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
