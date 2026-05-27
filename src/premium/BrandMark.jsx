import { cn } from '../lib/cn'

/**
 * Premium BrandMark — refined logo composition.
 *
 * Three visual ideas combine:
 *   1. A medical cross set inside a deep navy disc (clinical heritage).
 *   2. A teal arc above (Red Sea horizon — coastal medicine).
 *   3. A small warm-gold dot (sand / premium accent — signals "premium").
 *
 * Used on Login, Sidebar, Mobile top bar.
 */
export function BrandMark({ size = 44, variant = 'dark', className }) {
  // variant: 'dark' for light backgrounds, 'light' for dark backgrounds
  const isDark = variant === 'dark'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn('shrink-0', className)}
      aria-label="HMC / SMC Clinic Portal"
    >
      {/* Outer disc */}
      <defs>
        <linearGradient id="brand-disc" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%"   stopColor={isDark ? '#1E4180' : '#FFFFFF'} stopOpacity={isDark ? 1 : 0.95} />
          <stop offset="100%" stopColor={isDark ? '#0A1B3D' : '#F4F6FB'} />
        </linearGradient>
        <linearGradient id="brand-arc" x1="0" y1="0" x2="64" y2="0">
          <stop offset="0%"   stopColor="#0FB5A9" />
          <stop offset="100%" stopColor="#2DD4C7" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="30" fill="url(#brand-disc)" />
      <circle cx="32" cy="32" r="30" fill="none" stroke={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(10,27,61,0.08)'} strokeWidth="1" />

      {/* Horizon arc — sea teal */}
      <path d="M 14 38 Q 32 30 50 38" stroke="url(#brand-arc)" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Cross — clinical */}
      <g transform="translate(32, 26)">
        <rect x="-3.5" y="-10" width="7" height="20" rx="1.5" fill={isDark ? '#FFFFFF' : '#0A1B3D'} />
        <rect x="-10" y="-3.5" width="20" height="7" rx="1.5" fill={isDark ? '#FFFFFF' : '#0A1B3D'} />
      </g>

      {/* Sand-gold dot — premium accent */}
      <circle cx="48" cy="16" r="3.5" fill="#D9A574" />
      <circle cx="48" cy="16" r="3.5" fill="none" stroke="rgba(217, 165, 116, 0.4)" strokeWidth="3" />
    </svg>
  )
}

/**
 * Brand wordmark — paired with BrandMark.
 */
export function BrandWordmark({ variant = 'dark', compact = false, className }) {
  const isLight = variant === 'light'
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BrandMark variant={variant} size={compact ? 36 : 44} />
      {!compact && (
        <div className="leading-tight">
          <div className={cn('text-base font-bold tracking-tight', isLight ? 'text-white' : 'text-ink-900')}>
            HMC <span className={isLight ? 'text-[#7FE7DE]' : 'text-teal-600'} style={{ color: '#0FB5A9' }}>/</span> SMC
          </div>
          <div className={cn('text-[10px] uppercase tracking-[0.18em] font-semibold', isLight ? 'text-white/55' : 'text-ink-400')}>
            Clinic Portal
          </div>
        </div>
      )}
    </div>
  )
}
