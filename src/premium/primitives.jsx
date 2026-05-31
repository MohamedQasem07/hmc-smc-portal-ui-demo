/* =========================================================================
 * Premium primitives — used by /* routes only.
 * Visual layer that consumes the same mock data the P1 routes use.
 * ========================================================================= */

import { cn } from '../lib/cn'
import { ArrowUpRight, ArrowDownRight, Check, Sparkles } from 'lucide-react'

/* ----------------------------------------------------------------------
 * PremiumKpi — large numeric, hint, trend chip
 * -------------------------------------------------------------------- */
export function PremiumKpi({ label, value, hint, trend, icon: Icon, tone = 'navy', className }) {
  const iconTones = {
    navy:    { bg: '#E9EFF8', fg: '#1E4180' },
    teal:    { bg: '#E0F8F6', fg: '#0A8F87' },
    cash:    { bg: '#E2F7EE', fg: '#0A8F62' },
    pending: { bg: '#FBF1DE', fg: '#A1672A' },
    transfer:{ bg: '#ECE7FB', fg: '#5443A8' },
    mixed:   { bg: '#FBE6E5', fg: '#B14242' },
    gold:    { bg: '#FBF5EC', fg: '#9A6E36' },
  }
  const t = iconTones[tone] || iconTones.navy
  return (
    <div className={cn('p-card p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
          <div className="mt-2 text-3xl sm:text-[36px] font-bold p-numeric leading-none" style={{ color: 'var(--p-ink-900)' }}>{value}</div>
          {hint && (
            <div className="mt-2 text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{hint}</div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform" style={{ background: t.bg, color: t.fg }}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold p-numeric" style={{ color: trend.dir === 'up' ? 'var(--p-cash)' : 'var(--p-mixed)' }}>
          {trend.dir === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend.value}
          <span className="font-medium ms-1" style={{ color: 'var(--p-ink-400)' }}>{trend.note}</span>
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------------
 * StatPill — small horizontal stat used in hero bands
 * -------------------------------------------------------------------- */
export function StatPill({ label, value, tone = 'teal' }) {
  const colors = {
    teal:  'rgba(255,255,255,0.10)',
    pale:  'rgba(255,255,255,0.05)',
  }
  return (
    <div
      className="inline-flex items-center gap-3 px-3.5 py-2 rounded-full"
      style={{ background: colors[tone], border: '1px solid rgba(255,255,255,0.10)' }}
    >
      <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-white/65">{label}</span>
      <span className="text-sm font-bold text-white p-numeric">{value}</span>
    </div>
  )
}

/* ----------------------------------------------------------------------
 * HeroBand — premium dark hero with mesh gradient + grid overlay
 * Used as the top section of the Admin Dashboard.
 * -------------------------------------------------------------------- */
export function HeroBand({ children, className }) {
  return (
    <section
      className={cn('p-mesh p-grid-overlay rounded-2xl px-6 py-7 sm:px-9 sm:py-9 relative overflow-hidden', className)}
      style={{ borderRadius: 'var(--p-radius-hero)' }}
    >
      {/* corner glow */}
      <span className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(45,212,199,0.28) 0%, transparent 65%)' }} />
      <span className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(94,131,181,0.25) 0%, transparent 65%)' }} />
      <div className="relative z-10">{children}</div>
    </section>
  )
}

/* ----------------------------------------------------------------------
 * SectionLabel — eyebrow + heading + optional aside
 * -------------------------------------------------------------------- */
export function SectionLabel({ eyebrow, title, description, action, className }) {
  return (
    <div className={cn('flex items-end justify-between gap-3 mb-4', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="p-eyebrow mb-1.5">{eyebrow}</div>}
        {title && <h2 className="p-h2 text-base sm:text-lg">{title}</h2>}
        {description && <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--p-ink-500)' }}>{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* ----------------------------------------------------------------------
 * StatusPill — premium status pill (replaces P1 Badge for previews)
 * -------------------------------------------------------------------- */
const pillTones = {
  cash:        { bg: 'var(--p-cash-soft)',        fg: '#0A8F62' },
  insurance:   { bg: 'var(--p-insurance-soft)',   fg: '#0A8F87' },
  pending:     { bg: 'var(--p-pending-soft)',     fg: '#A1672A' },
  transferred: { bg: 'var(--p-transfer-soft)',    fg: '#5443A8' },
  mixed:       { bg: 'var(--p-mixed-soft)',       fg: '#B14242' },
  finalized:   { bg: 'var(--p-finalized-soft)',   fg: '#076D4A' },
  navy:        { bg: '#E9EFF8',                   fg: '#1E4180' },
  teal:        { bg: '#E0F8F6',                   fg: '#0A8F87' },
  ghost:       { bg: 'rgba(255,255,255,0.10)',    fg: 'rgba(255,255,255,0.92)' },
  amber:       { bg: 'var(--p-pending-soft)',     fg: '#A1672A' },
  red:         { bg: 'var(--p-mixed-soft)',       fg: '#B14242' },
}
export function StatusPill({ tone = 'navy', icon: Icon, dot, children, className }) {
  const t = pillTones[tone] || pillTones.navy
  return (
    <span className={cn('p-pill', className)} style={{ background: t.bg, color: t.fg }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />}
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}

/* ----------------------------------------------------------------------
 * PremiumStepper — refined horizontal stepper (also vertical on mobile)
 * -------------------------------------------------------------------- */
export function PremiumStepper({ steps, current, onJump, className }) {
  const currentIdx = steps.findIndex((s) => s.id === current)
  return (
    <ol className={cn('flex items-center gap-3 overflow-x-auto -mx-2 px-2 py-1 scrollbar-hide', className)}>
      {steps.map((s, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <li key={s.id} className="flex items-center gap-3 shrink-0">
            <button type="button" onClick={onJump ? () => onJump(s.id) : undefined}
              className="flex items-center gap-2.5 group">
              <span className={cn(
                'shrink-0 inline-flex items-center justify-center rounded-full text-xs font-bold transition-all',
                'w-8 h-8',
              )}
              style={{
                background: done ? 'var(--p-teal)' : active ? 'var(--p-brand-deep)' : 'white',
                color: done || active ? 'white' : 'var(--p-ink-400)',
                border: done ? '2px solid rgba(15,181,169,0.25)' : active ? '2px solid rgba(10,27,61,0.18)' : '2px solid var(--p-border-strong)',
                boxShadow: active ? 'var(--p-shadow-glow)' : 'none',
              }}>
                {done ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className="hidden sm:flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--p-ink-400)' }}>Step {i + 1}</span>
                <span className={cn('text-sm font-semibold', active ? '' : 'opacity-70')} style={{ color: 'var(--p-ink-900)' }}>{s.label}</span>
              </span>
              <span className="sm:hidden text-xs font-semibold" style={{ color: active ? 'var(--p-ink-900)' : 'var(--p-ink-400)' }}>
                {s.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span className="w-6 sm:w-10 h-px" style={{ background: done ? 'var(--p-teal)' : 'var(--p-border-strong)' }} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ----------------------------------------------------------------------
 * PremiumInput — refined field with label-above + premium focus ring
 * -------------------------------------------------------------------- */
export function PremiumField({ label, hint, required, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-[11px] uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--p-ink-500)' }}>
          {label}
          {required && <span className="ms-1" style={{ color: 'var(--p-mixed)' }}>*</span>}
          {!required && <span className="ms-1 opacity-60 font-normal normal-case tracking-normal">(optional)</span>}
        </label>
      )}
      {children}
      {hint && <p className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>{hint}</p>}
    </div>
  )
}

const inputBaseStyle = {
  height: '46px',
  borderRadius: 'var(--p-radius-input)',
  border: '1px solid var(--p-border-strong)',
  background: 'var(--p-surface)',
  color: 'var(--p-ink-900)',
  padding: '0 14px',
  fontSize: '14px',
  width: '100%',
  transition: 'border-color var(--p-dur-fast), box-shadow var(--p-dur-fast)',
  outline: 'none',
}

export function PremiumInput({ className, prefix, ...rest }) {
  if (prefix) {
    return (
      <div className="flex items-stretch">
        <span className="inline-flex items-center px-3 border border-r-0 text-sm" style={{
          ...inputBaseStyle,
          width: 'auto', borderRadius: '12px 0 0 12px',
          background: 'var(--p-surface-tint)',
          color: 'var(--p-ink-500)',
        }}>{prefix}</span>
        <input
          className={cn('focus-visible:outline-none', className)}
          style={{ ...inputBaseStyle, borderRadius: '0 12px 12px 0' }}
          {...rest}
        />
      </div>
    )
  }
  return <input className={cn('focus-visible:outline-none', className)} style={inputBaseStyle} {...rest} />
}

export function PremiumSelect({ className, children, ...rest }) {
  return (
    <select
      className={cn('appearance-none focus-visible:outline-none', className)}
      style={{
        ...inputBaseStyle,
        paddingRight: '36px',
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23455774' stroke-width='2'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '18px',
      }}
      {...rest}
    >
      {children}
    </select>
  )
}

/* ----------------------------------------------------------------------
 * PremiumButton
 * -------------------------------------------------------------------- */
export function PremiumButton({ as: Tag = 'button', variant = 'primary', size = 'md', leftIcon, rightIcon, className, children, fullWidth, ...rest }) {
  const sizes = {
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-6 text-[15px]',
    xl: 'h-14 px-7 text-base',
  }
  const variantClass = {
    primary: 'p-btn-primary',
    dark: 'p-btn-dark',
    ghost: 'p-btn-ghost',
  }[variant] || 'p-btn-primary'

  return (
    <Tag
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all',
        sizes[size] || sizes.md,
        variantClass,
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </Tag>
  )
}

/* ----------------------------------------------------------------------
 * Sparkline — minimalist trend visual (mock numbers only)
 * -------------------------------------------------------------------- */
export function Sparkline({ data = [], color = '#0FB5A9', width = 120, height = 36 }) {
  if (!data.length) return null
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2])
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${path} L ${width} ${height} L 0 ${height} Z`
  const gradientId = `sparkfill-${Math.random().toString(36).slice(2, 7)}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="3" fill={color} />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="6" fill={color} fillOpacity="0.18" />
    </svg>
  )
}

/* ----------------------------------------------------------------------
 * Avatar — circle initials avatar with subtle gradient
 * -------------------------------------------------------------------- */
export function Avatar({ name, size = 36, tone = 'navy' }) {
  const initials = (name || 'NA').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
  const tones = {
    navy: 'linear-gradient(135deg, #1E4180 0%, #0A1B3D 100%)',
    teal: 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)',
    gold: 'linear-gradient(135deg, #D9A574 0%, #B8854D 100%)',
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: size, height: size,
        background: tones[tone] || tones.navy,
        fontSize: size * 0.36,
        boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.10), 0 2px 4px rgba(10,27,61,0.15)',
        letterSpacing: '0.02em',
      }}
    >
      {initials}
    </div>
  )
}

/* ----------------------------------------------------------------------
 * MeshCorner — decorative motif element for cards
 * -------------------------------------------------------------------- */
export function MeshCorner({ position = 'tr', size = 120, color = '#0FB5A9', opacity = 0.10 }) {
  const pos = {
    tr: { top: -size / 2, right: -size / 2 },
    tl: { top: -size / 2, left: -size / 2 },
    br: { bottom: -size / 2, right: -size / 2 },
    bl: { bottom: -size / 2, left: -size / 2 },
  }[position]
  return (
    <span
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{
        ...pos,
        width: size, height: size,
        background: `radial-gradient(circle, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 65%)`,
      }}
    />
  )
}
