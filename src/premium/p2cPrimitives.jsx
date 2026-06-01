import { Link } from 'react-router-dom'
import {
  Building2, ShieldCheck, Sparkles, CheckCircle2, Banknote, CreditCard,
  ArrowRight, AlertTriangle, FileText, Clock, ChevronRight, MapPin,
} from 'lucide-react'
import { Avatar, StatusPill } from './primitives'
import { cn } from '../lib/cn'
import { fmtDate, fmtRelative } from '../lib/format'

/* =========================================================================
 * Shared P2C UI primitives — used by every clinic + reception page.
 * Tightly aligned with the Aegis premium tokens already in theme.css.
 * ========================================================================= */

/** A small KPI tile suitable for mobile-first dashboards (square-ish). */
export function MiniKpi({ label, value, sub, tone = 'navy', icon: Icon, onClick }) {
  const tones = {
    navy:    { bg: '#E9EFF8', fg: '#1E4180' },
    teal:    { bg: '#E0F8F6', fg: '#0A8F87' },
    cash:    { bg: '#E2F7EE', fg: '#0A8F62' },
    pending: { bg: '#FBF1DE', fg: '#A1672A' },
    gold:    { bg: '#FBF5EC', fg: '#9A6E36' },
    mixed:   { bg: '#FBE6E5', fg: '#B14242' },
  }
  const t = tones[tone] || tones.navy
  const Wrap = onClick ? 'button' : 'div'
  return (
    <Wrap onClick={onClick} className={cn(
      'p-card p-kpi p-3.5 sm:p-4 text-left w-full transition-all',
      onClick && 'hover:-translate-y-px',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold p-numeric leading-none" style={{ color: 'var(--p-ink-900)' }}>{value}</div>
          {sub && <div className="mt-1.5 text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{sub}</div>}
        </div>
        {Icon && (
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.fg }}>
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>
    </Wrap>
  )
}

/** A larger "primary action" tile (e.g. "+ New Case") used on dashboards. */
export function ActionTile({ to, icon: Icon, label, sub, tone = 'teal', onClick }) {
  const tones = {
    teal: { gradient: 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)', color: 'white' },
    navy: { gradient: 'linear-gradient(135deg, #1E4180 0%, #0A1B3D 100%)', color: 'white' },
    gold: { gradient: 'linear-gradient(135deg, #D9A574 0%, #B8854D 100%)', color: 'white' },
    soft: { gradient: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)', color: 'var(--p-ink-900)', border: true },
  }
  const t = tones[tone] || tones.teal
  const Tag = to ? Link : 'button'
  const props = to ? { to } : { onClick, type: 'button' }
  return (
    <Tag {...props} className={cn(
      'relative overflow-hidden rounded-2xl p-4 sm:p-5 flex items-center gap-3 transition-all text-left w-full',
      'hover:-translate-y-px',
    )} style={{
      background: t.gradient,
      color: t.color,
      border: t.border ? '1px solid var(--p-border)' : '1px solid rgba(255,255,255,0.10)',
      boxShadow: tone === 'soft' ? 'var(--p-shadow-card)' : '0 8px 20px rgba(10,27,61,0.18)',
    }}>
      <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: tone === 'soft' ? 'var(--p-teal-soft)' : 'rgba(255,255,255,0.16)', color: tone === 'soft' ? 'var(--p-teal)' : 'white' }}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold leading-tight">{label}</span>
        {sub && <span className="block text-[12px] opacity-80 mt-0.5 leading-relaxed">{sub}</span>}
      </span>
      <ArrowRight className="w-4 h-4 opacity-70" />
    </Tag>
  )
}

/** Billing facility badge — HMC or SMC for Insurance cases. */
export function FacilityBadge({ code, size = 'md' }) {
  if (!code) return null
  const colors = code === 'HMC'
    ? { bg: '#E9EFF8', fg: '#1E4180', border: '#C4D2EA' }
    : { bg: '#E0F8F6', fg: '#0A8F87', border: '#A6E2DC' }
  const sizes = {
    sm: { h: 18, fs: 10, px: 6 },
    md: { h: 22, fs: 11, px: 7 },
    lg: { h: 26, fs: 12, px: 9 },
  }[size] || { h: 22, fs: 11, px: 7 }
  return (
    <span className="inline-flex items-center gap-1 rounded-md font-bold uppercase tracking-[0.06em]"
          style={{ height: sizes.h, fontSize: sizes.fs, padding: `0 ${sizes.px}px`, background: colors.bg, color: colors.fg, border: `1px solid ${colors.border}` }}
          aria-label={`Billing facility ${code}`}>
      <ShieldCheck className="w-3 h-3" /> {code}
    </span>
  )
}

/** Section eyebrow + title used at top of every page section. */
export function SectionHead({ eyebrow, title, action, description }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        {eyebrow && <div className="p-eyebrow mb-1">{eyebrow}</div>}
        {title && <h2 className="p-h2 text-base sm:text-lg" style={{ color: 'var(--p-ink-900)' }}>{title}</h2>}
        {description && <p className="text-xs mt-1" style={{ color: 'var(--p-ink-500)' }}>{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** A clean compact case card used in lists (mobile-first). */
export function CaseCard({ c, to, action, showFacility = true, showRoute = true }) {
  return (
    <Link to={to} className="block p-card p-4 transition-all hover:-translate-y-px">
      <div className="flex items-start gap-3">
        <Avatar name={c.patient.name} size={36} tone="navy" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</span>
            {showFacility && c.billingFacility && <FacilityBadge code={c.billingFacility} size="sm" />}
          </div>
          <div className="text-[11px] mt-0.5 font-mono" style={{ color: 'var(--p-ink-400)' }}>{c.ourRef}</div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <FinTypePill type={c.financialType} />
            {showRoute && <RoutePill route={c.route} routeLabel={c.routeLabel} />}
            <StatusPill tone={c.operationalStatus === 'Closed' ? 'finalized' : 'navy'}>{c.operationalStatus}</StatusPill>
            {c.mixedCurrency && <StatusPill tone="mixed" icon={AlertTriangle}>Mixed Currency</StatusPill>}
          </div>
          <div className="mt-1.5 text-[11px] flex items-center gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
            <Clock className="w-3 h-3" /> {fmtRelative(c.visitDate)}
            {c.transfer && (
              <>
                <span style={{ color: 'var(--p-ink-300)' }}>·</span>
                <MapPin className="w-3 h-3" /> → {c.transfer.toBranchName}
              </>
            )}
          </div>
        </div>
        {action || <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--p-ink-300)' }} />}
      </div>
    </Link>
  )
}

export function FinTypePill({ type }) {
  if (!type) return null
  const tones = { Cash: 'cash', Insurance: 'insurance', Pending: 'pending' }
  return <StatusPill tone={tones[type] || 'navy'}>{type}</StatusPill>
}

export function RoutePill({ route, routeLabel }) {
  if (!route) return null
  const isTransfer = route !== 'direct'
  return <StatusPill tone={isTransfer ? 'transferred' : 'navy'}>{isTransfer ? routeLabel || 'Transfer' : 'Direct'}</StatusPill>
}

/** Inline currency table — collections by original currency, used everywhere. */
export function CurrencyTable({ rows, emptyText = 'No collections.' }) {
  const entries = Object.entries(rows)
  if (entries.length === 0) return <div className="text-sm" style={{ color: 'var(--p-ink-400)' }}>{emptyText}</div>
  return (
    <ul className="space-y-2">
      {entries.map(([cur, val]) => (
        <li key={cur} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--p-surface-tint)' }}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--p-ink-700)' }}>
            <span className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: 'white', color: 'var(--p-brand-mid)', border: '1px solid var(--p-border)' }}>{cur}</span>
            Original currency
          </span>
          <span className="text-base font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{formatNumber(val)} {cur}</span>
        </li>
      ))}
    </ul>
  )
}

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

/** A subtle banner used to clearly state mock/demo status on every page. */
/**
 * DemoBanner — P2C.R4: now a no-op. The old gold demo-explanation banners
 * have been removed from operational pages so the UI feels closer to the
 * final product. Existing call sites continue to compile (they pass children
 * that get discarded). Demo-mode messaging now lives only on the dedicated
 * Local Review Tools page (`/review-tools`).
 */
export function DemoBanner() {
  return null
}

/** Print/Export pill row used on report headers. */
export function ReportActions({ onPrint, onExport }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={onPrint} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold p-btn-ghost">
        <FileText className="w-3.5 h-3.5" /> Print Preview
      </button>
      <button onClick={onExport} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold p-btn-primary">
        <FileText className="w-3.5 h-3.5" /> Export PDF
      </button>
    </div>
  )
}

/** Transfer Journey Visualization — used in clinic + reception + admin views. */
export function P2CTimeline({ steps, className }) {
  return (
    <ol className={cn('space-y-2.5', className)}>
      {steps.map((s, i) => {
        const tones = {
          navy:        { bg: 'var(--p-brand-pale)',     fg: 'var(--p-brand-mid)' },
          teal:        { bg: 'var(--p-teal-soft)',      fg: '#0A8F87' },
          cash:        { bg: 'var(--p-cash-soft)',      fg: '#0A8F62' },
          amber:       { bg: 'var(--p-pending-soft)',   fg: '#A1672A' },
          transferred: { bg: 'var(--p-transfer-soft)',  fg: '#5443A8' },
          finalized:   { bg: 'var(--p-finalized-soft)', fg: '#076D4A' },
          mixed:       { bg: 'var(--p-mixed-soft)',     fg: '#B14242' },
        }
        const t = tones[s.tone] || tones.navy
        return (
          <li key={s.key || i} className="relative ps-9">
            <span className="absolute left-0 top-0.5 w-7 h-7 rounded-full ring-2 ring-white flex items-center justify-center text-[12px] font-bold"
                  style={{ background: s.done ? t.bg : 'var(--p-surface-tint)', color: s.done ? t.fg : 'var(--p-ink-400)' }}>
              {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </span>
            {i < steps.length - 1 && (
              <span className="absolute left-[13px] top-8 bottom-[-12px] w-px" style={{ background: 'var(--p-border-strong)' }} />
            )}
            <div className="rounded-xl p-3 transition-colors" style={{ background: s.done ? 'var(--p-surface-tint)' : 'transparent', border: s.done ? '1px solid var(--p-border)' : '1px dashed var(--p-border-strong)' }}>
              <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{s.title}</div>
              {s.at && <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--p-ink-500)' }}>
                <Clock className="w-3 h-3" /> {fmtDate(s.at, { withTime: true })}
              </div>}
              {s.detail && <div className="text-[12px] mt-1.5" style={{ color: 'var(--p-ink-600)' }}>{s.detail}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
