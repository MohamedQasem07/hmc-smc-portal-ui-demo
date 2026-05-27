import { cn } from '../../lib/cn'

/**
 * Brand — unified HMC / SMC clinic portal wordmark.
 * Renders a small medical-cross SVG mark + the product name in a single tidy unit.
 * Used in the sidebar, login, and mobile top bar.
 */
export function Brand({ compact = false, className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-navy-700 to-sky-700 text-white flex items-center justify-center shadow-card overflow-hidden">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18" />
          <path d="M3 12h18" />
          <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
        </svg>
        <span className="absolute -bottom-2 -right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-navy-700" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-ink-900">HMC <span className="text-sky-700">/</span> SMC</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold">Clinic Portal</div>
        </div>
      )}
    </div>
  )
}
