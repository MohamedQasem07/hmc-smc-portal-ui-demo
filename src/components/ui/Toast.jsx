import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../../lib/cn'

const ToastCtx = createContext({ toast: () => {} })

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const dismiss = useCallback((id) => {
    setItems((arr) => arr.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((opts) => {
    const id = Math.random().toString(36).slice(2, 9)
    const item = { id, kind: 'info', duration: 3200, ...opts }
    setItems((arr) => [...arr, item])
    if (item.duration > 0) setTimeout(() => dismiss(id), item.duration)
    return id
  }, [dismiss])

  return (
    <ToastCtx.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed z-[60] bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm flex flex-col gap-2 items-stretch pointer-events-none">
        {items.map((t) => <ToastItem key={t.id} {...t} onClose={() => dismiss(t.id)} />)}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}

function ToastItem({ kind, title, message, onClose }) {
  const styles = {
    success: { box: 'border-emerald-200 bg-emerald-50', fg: 'text-emerald-900', icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" /> },
    info:    { box: 'border-sky-200 bg-sky-50',         fg: 'text-sky-900',     icon: <Info className="w-5 h-5 text-sky-600" /> },
    warning: { box: 'border-amber-200 bg-amber-50',     fg: 'text-amber-900',   icon: <AlertTriangle className="w-5 h-5 text-amber-600" /> },
    danger:  { box: 'border-red-200 bg-red-50',         fg: 'text-red-900',     icon: <AlertTriangle className="w-5 h-5 text-red-600" /> },
  }[kind] || { box: 'border-sky-200 bg-sky-50', fg: 'text-sky-900', icon: <Info className="w-5 h-5 text-sky-600" /> }

  return (
    <div className={cn('pointer-events-auto rounded-xl border shadow-popover p-3 flex items-start gap-3 animate-slide-up', styles.box)}>
      <div className="shrink-0">{styles.icon}</div>
      <div className="min-w-0 flex-1">
        {title && <div className={cn('text-sm font-semibold', styles.fg)}>{title}</div>}
        {message && <div className={cn('text-xs mt-0.5', styles.fg, 'opacity-90')}>{message}</div>}
      </div>
      <button onClick={onClose} className="text-ink-400 hover:text-ink-600 p-1 -m-1 rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
