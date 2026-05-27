import { cn } from '../../lib/cn'

/**
 * Badge — semantic status pill. Keep variants centralized so colors stay consistent everywhere.
 */
const tones = {
  // Generic semantic tones
  neutral:  'bg-subtle text-ink-700 ring-1 ring-inset ring-border',
  navy:     'bg-navy-50 text-navy-800 ring-1 ring-inset ring-navy-100',
  sky:      'bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-100',
  success:  'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-100',
  warning:  'bg-status-pending-bg text-status-pending-fg ring-1 ring-inset ring-amber-200',
  danger:   'bg-status-review-bg text-status-review-fg ring-1 ring-inset ring-red-200',
  info:     'bg-status-ins-bg text-status-ins-fg ring-1 ring-inset ring-blue-200',

  // Domain-specific tones (Financial type, route, sources)
  pending:    'bg-status-pending-bg text-status-pending-fg ring-1 ring-inset ring-amber-200',
  cash:       'bg-status-cash-bg text-status-cash-fg ring-1 ring-inset ring-emerald-200',
  insurance:  'bg-status-ins-bg text-status-ins-fg ring-1 ring-inset ring-blue-200',
  transferred:'bg-status-xfer-bg text-status-xfer-fg ring-1 ring-inset ring-violet-200',
  mixed:      'bg-status-mix-bg text-status-mix-fg ring-1 ring-inset ring-orange-200',
  finalized:  'bg-status-final-bg text-status-final-fg ring-1 ring-inset ring-emerald-300',
  review:     'bg-status-review-bg text-status-review-fg ring-1 ring-inset ring-red-200',
  legacy:     'bg-status-legacy-bg text-status-legacy-fg ring-1 ring-inset ring-indigo-200',
  portal:     'bg-status-portal-bg text-status-portal-fg ring-1 ring-inset ring-cyan-200',

  // Coverage status tones
  'cov-pending':  'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
  'cov-needed':   'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200',
  'cov-review':   'bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200',
  'cov-confirmed':'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200',
}

export function Badge({ tone = 'neutral', size = 'md', dot = false, className, children }) {
  const sz = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap', tones[tone] || tones.neutral, sz, className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}

// Convenience mappers — keep status vocabulary centralized
export const FINANCIAL_TONE = {
  Pending: 'pending',
  Cash: 'cash',
  Insurance: 'insurance',
  'Not Determined': 'pending',
}

export const ROUTE_TONE = {
  Direct: 'navy',
  Transferred: 'transferred',
  'Transferred In': 'transferred',
  'Transferred Out': 'transferred',
}

export const STATUS_TONE = {
  Open: 'sky',
  Reviewed: 'navy',
  'Pending Information': 'warning',
  'Ready for Invoice': 'sky',
  'Invoice Generated': 'success',
  Finalized: 'finalized',
  'Admin Review Required': 'review',
  Closed: 'neutral',
}

export const SOURCE_TONE = {
  Portal: 'portal',
  'Legacy 2024': 'legacy',
  'Legacy 2025': 'legacy',
  'Legacy 2026': 'legacy',
  'Manual Admin Entry': 'navy',
}

export const COVERAGE_TONE = {
  'Details Pending':          'cov-pending',
  'Coverage Request Needed':  'cov-needed',
  'Under Review':             'cov-review',
  'Confirmed':                'cov-confirmed',
}

export const TRANSPORT_TONE = {
  'Ambulance': 'review',
  'Patient Own Transport': 'neutral',
  'Other': 'neutral',
}

export const CASE_SOURCE_TONE = {
  'Walk-in':              'navy',
  'Hotel Call / Referral':'sky',
  'Transfer Received':    'transferred',
  'Manual Admin Entry':   'neutral',
}
