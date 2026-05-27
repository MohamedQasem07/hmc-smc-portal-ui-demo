/* =========================================================================
 * Governance primitives — Admin Control Center building blocks.
 * Used only by the Premium Admin Control Center preview route.
 * ========================================================================= */

import { useState } from 'react'
import { Lock, Archive, Trash2, Pencil, Eye, X, History, ChevronRight, ShieldCheck } from 'lucide-react'
import { StatusPill, PremiumButton, Avatar } from './primitives'
import { cn } from '../lib/cn'
import { fmtDate, fmtRelative } from '../lib/format'

/* ----------------------------------------------------------------------
 * UsagePill — shows demo usage count
 * -------------------------------------------------------------------- */
export function UsagePill({ count }) {
  const tone = count === 0 ? 'ghost-pill' : count > 8 ? 'high' : 'medium'
  const styles = {
    'ghost-pill': { bg: 'var(--p-surface-tint)', fg: 'var(--p-ink-500)' },
    medium:       { bg: 'var(--p-teal-soft)',    fg: '#0A8F87' },
    high:         { bg: 'var(--p-brand-pale)',   fg: 'var(--p-brand-mid)' },
  }[tone]
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums" style={{ background: styles.bg, color: styles.fg }}>
      {count} {count === 1 ? 'case' : 'cases'}
    </span>
  )
}

/* ----------------------------------------------------------------------
 * KindBadge — System / Custom / Protected
 * -------------------------------------------------------------------- */
export function KindBadge({ kind }) {
  if (kind === 'protected') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.08em]" style={{ background: 'rgba(217,165,116,0.16)', color: '#9A6E36', border: '1px solid rgba(217,165,116,0.32)' }}>
      <Lock className="w-2.5 h-2.5" /> Protected
    </span>
  )
  if (kind === 'system') return <StatusPill tone="navy">System</StatusPill>
  return <StatusPill tone="teal">Custom</StatusPill>
}

/* ----------------------------------------------------------------------
 * StatusBadge — Active / Inactive / Archived
 * -------------------------------------------------------------------- */
export function StatusBadge({ status, kind }) {
  if (status === 'Active' || status === true)    return <StatusPill tone="cash" dot>Active</StatusPill>
  if (status === 'Archived' || status === 'archived') return <StatusPill tone="ghost">Archived</StatusPill>
  return <StatusPill tone="amber" dot>Inactive</StatusPill>
}

/* ----------------------------------------------------------------------
 * ItemActions — Edit / Archive / Delete with governance rules applied
 * -------------------------------------------------------------------- */
export function ItemActions({ item, onEdit, onArchive, onUnarchive, onDelete, onView }) {
  const isProtected = item.kind === 'protected'
  const isInUse     = (item.usageCount || item.casesCount || 0) > 0
  const isArchived  = item.isActive === false || item.status === 'Archived' || item.status === 'Inactive'
  const canDelete   = !isProtected && !isInUse && !isArchived

  return (
    <div className="flex items-center gap-1">
      {onView && (
        <ActionBtn icon={Eye} title="View details" onClick={() => onView?.(item)} />
      )}
      {!isProtected && (
        <ActionBtn icon={Pencil} title="Edit" onClick={() => onEdit?.(item)} />
      )}
      {!isProtected && !isArchived && (
        <ActionBtn icon={Archive} title="Archive (preserves history)" onClick={() => onArchive?.(item)} tone="amber" />
      )}
      {!isProtected && isArchived && onUnarchive && (
        <ActionBtn icon={Archive} title="Restore" onClick={() => onUnarchive?.(item)} tone="teal" />
      )}
      <ActionBtn
        icon={Trash2}
        title={
          isProtected ? 'Protected system value — cannot delete' :
          isInUse     ? `Used by ${item.usageCount || item.casesCount} record(s) — archive instead` :
          isArchived  ? 'Archive in place — cannot delete' :
                        'Delete (unused)'
        }
        onClick={canDelete ? () => onDelete?.(item) : undefined}
        tone={canDelete ? 'danger' : 'disabled'}
      />
    </div>
  )
}

function ActionBtn({ icon: Icon, title, onClick, tone = 'default' }) {
  const tones = {
    default:  { color: 'var(--p-ink-500)', hover: 'var(--p-ink-800)', bg: 'transparent', bgHover: 'var(--p-surface-tint)' },
    amber:    { color: '#A1672A',          hover: '#7A4F1F',          bg: 'transparent', bgHover: 'var(--p-pending-soft)' },
    teal:     { color: '#0A8F87',          hover: '#076E66',          bg: 'transparent', bgHover: 'var(--p-teal-soft)' },
    danger:   { color: '#B14242',          hover: '#8E2A2A',          bg: 'transparent', bgHover: 'var(--p-mixed-soft)' },
    disabled: { color: 'var(--p-ink-300)', hover: 'var(--p-ink-300)', bg: 'transparent', bgHover: 'transparent' },
  }[tone] || { color: 'var(--p-ink-500)', hover: 'var(--p-ink-800)' }
  const disabled = tone === 'disabled' || !onClick
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all', disabled ? 'cursor-not-allowed' : 'hover:scale-105')}
      style={{ color: tones.color, background: 'transparent' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = tones.bgHover }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      aria-label={title}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

/* ----------------------------------------------------------------------
 * EditDrawer — slide-in panel for editing an item
 * -------------------------------------------------------------------- */
export function EditDrawer({ open, onClose, title, subtitle, footer, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 p-fade-in">
      <div className="absolute inset-0" style={{ background: 'rgba(10,27,61,0.40)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <aside className="theme-premium absolute right-0 top-0 bottom-0 w-full sm:max-w-lg flex flex-col" style={{
        background: 'var(--p-surface)',
        boxShadow: 'var(--p-shadow-deep)',
        animation: 'p-rise 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
        <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--p-border)' }}>
          <div className="min-w-0">
            <div className="p-eyebrow mb-1">Edit Configuration</div>
            <h2 className="p-h2 text-base sm:text-lg truncate">{title}</h2>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--p-surface-tint)]" style={{ color: 'var(--p-ink-500)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--p-border)', background: 'var(--p-surface-tint)' }}>
            {footer}
          </div>
        )}
      </aside>
    </div>
  )
}

/* ----------------------------------------------------------------------
 * GovernanceFooter — explains the archive vs delete rule
 * -------------------------------------------------------------------- */
export function GovernanceFooter({ entityName = 'item' }) {
  return (
    <div className="rounded-xl px-4 py-3 mt-4 flex items-start gap-2.5" style={{ background: 'var(--p-pending-soft)', border: '1px solid rgba(225, 161, 72, 0.32)' }}>
      <span className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(225, 161, 72, 0.25)', color: '#A1672A' }}>
        <Archive className="w-3.5 h-3.5" />
      </span>
      <div className="text-xs leading-relaxed" style={{ color: '#7A4F1F' }}>
        <span className="font-semibold" style={{ color: '#5C3A12' }}>Archive instead of Delete.</span>{' '}
        Any {entityName} already used by a case, payment, or report is archived to preserve historical records.
        Only unused custom items can be hard-deleted. Protected system values can be neither archived nor deleted.
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------
 * ChangeHistoryButton + drawer
 * -------------------------------------------------------------------- */
export function ChangeHistoryDrawer({ open, onClose, entries }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 p-fade-in">
      <div className="absolute inset-0" style={{ background: 'rgba(10,27,61,0.40)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <aside className="theme-premium absolute right-0 top-0 bottom-0 w-full sm:max-w-xl flex flex-col" style={{ background: 'var(--p-surface)', boxShadow: 'var(--p-shadow-deep)', animation: 'p-rise 320ms cubic-bezier(0.16, 1, 0.3, 1) both' }}>
        <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--p-border)' }}>
          <div>
            <div className="p-eyebrow mb-1">Audit Trail Concept</div>
            <h2 className="p-h2 text-lg">Change History</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--p-ink-500)' }}>
              Demo audit log — persistent audit logging will require approved backend / security design.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--p-surface-tint)]" style={{ color: 'var(--p-ink-500)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ol className="space-y-3">
            {entries.map((h, i) => (
              <li key={i} className="relative ps-6">
                <span className="absolute left-1.5 top-2 w-2 h-2 rounded-full" style={{ background: 'var(--p-teal)', boxShadow: '0 0 0 4px rgba(15, 181, 169, 0.15)' }} />
                {i < entries.length - 1 && <span className="absolute left-[8px] top-5 bottom-[-12px] w-px" style={{ background: 'var(--p-border)' }} />}
                <div className="p-card p-3.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Avatar name={h.by} size={26} tone="navy" />
                      <span className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{h.by}</span>
                    </div>
                    <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>{fmtRelative(h.at)}</span>
                  </div>
                  <div className="text-xs flex items-center gap-2 mt-1.5">
                    <StatusPill tone="navy">{h.module}</StatusPill>
                    <span className="font-semibold" style={{ color: 'var(--p-ink-800)' }}>{h.action}</span>
                  </div>
                  <div className="mt-2 text-[13px]" style={{ color: 'var(--p-ink-700)' }}>
                    <span style={{ color: 'var(--p-ink-400)' }}>Target:</span> <span className="font-medium">{h.target}</span>
                  </div>
                  {(h.from || h.to) && (
                    <div className="mt-1.5 text-[12px]" style={{ color: 'var(--p-ink-600)' }}>
                      {h.from && <span className="line-through" style={{ color: 'var(--p-ink-400)' }}>{h.from}</span>}
                      {h.from && h.to && <span className="mx-1.5">→</span>}
                      {h.to && <span className="font-semibold" style={{ color: 'var(--p-ink-900)' }}>{h.to}</span>}
                    </div>
                  )}
                  {h.reason && <div className="mt-1.5 text-[11px] italic" style={{ color: 'var(--p-ink-500)' }}>“{h.reason}”</div>}
                  <div className="mt-2 text-[10px]" style={{ color: 'var(--p-ink-400)' }}>{fmtDate(h.at, { withTime: true })}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-xl px-4 py-3 flex items-start gap-2" style={{ background: 'var(--p-insurance-soft)', border: '1px solid rgba(15,181,169,0.20)' }}>
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#0A8F87' }} />
            <div className="text-[12px] leading-relaxed" style={{ color: '#0A6E64' }}>
              Persistent audit logging — retention, immutability, access policy — must be approved by the owner before the audit table is created.
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

