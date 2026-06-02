import { Link } from 'react-router-dom'
import {
  ShieldAlert, Tag, Banknote, FileWarning, ArrowLeftRight, DoorOpen,
  Phone, Wallet, ChevronRight, CheckCircle2,
} from 'lucide-react'
import { useReviewQueues } from '../lib/useCaseWarnings'
import { QUEUE_DEFS } from '../lib/caseWarnings'

/* =========================================================================
 * ReviewQueues.jsx — Admin "needs review" command queues (Pilot Supervision).
 * Practical, clickable lists (not just counts): each row links straight to the
 * case so the admin opens it and corrects via the Full Case Editor. Buckets are
 * computed by lib/caseWarnings.buildReviewQueues over the (RLS-scoped) cases.
 * ========================================================================= */

const TONE = {
  danger: { fg: '#B14242', bg: 'var(--p-mixed-soft)', bd: '#F0B5B5' },
  warn:   { fg: '#A1672A', bg: 'var(--p-pending-soft)', bd: '#F0C97A' },
  info:   { fg: 'var(--p-ink-600)', bg: 'var(--p-surface-tint)', bd: 'var(--p-border)' },
}

const QUEUE_ICON = {
  needs_review_today: ShieldAlert,
  pending_classification: Tag,
  cash_outstanding: Banknote,
  insurance_incomplete: FileWarning,
  transfers_awaiting: ArrowLeftRight,
  open_no_discharge: DoorOpen,
  missing_contact: Phone,
  closed_with_outstanding: Wallet,
}

const MAX_ROWS = 6

export function ReviewQueues({
  cases = [],
  caseHref = (id) => `/admin/case-detail/${id}`,
  allCasesHref = '/admin/p2c-cases',
}) {
  const { queues, ready } = useReviewQueues(cases)
  const active = QUEUE_DEFS.filter((d) => (queues[d.key]?.length || 0) > 0)
  const totalFlagged = Object.keys(queues._warningsByCase || {})
    .filter((id) => (queues._warningsByCase[id] || []).length > 0).length

  if (ready && active.length === 0) {
    return (
      <div className="p-card p-5 flex items-center gap-3"
        style={{ background: 'var(--p-finalized-soft)', border: '1px solid #9FD4BB' }}>
        <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#076D4A' }} />
        <div>
          <div className="text-sm font-bold" style={{ color: '#076D4A' }}>Nothing needs review</div>
          <div className="text-[12px]" style={{ color: 'var(--p-ink-600)' }}>Every visible case has complete, consistent data.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--p-ink-500)' }}>
        <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full font-bold"
          style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
          <ShieldAlert className="w-3.5 h-3.5" /> {totalFlagged} case{totalFlagged !== 1 ? 's' : ''} flagged
        </span>
        <span>Click a case to open it and correct it in the Full Case Editor.</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {active.map((def) => (
          <QueueCard key={def.key} def={def} items={queues[def.key]} caseHref={caseHref} allCasesHref={allCasesHref} />
        ))}
      </div>
    </div>
  )
}

function QueueCard({ def, items, caseHref, allCasesHref }) {
  const t = TONE[def.tone] || TONE.warn
  const Icon = QUEUE_ICON[def.key] || ShieldAlert
  const shown = items.slice(0, MAX_ROWS)
  const extra = items.length - shown.length

  return (
    <div className="p-card overflow-hidden flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between gap-2 border-b" style={{ borderColor: 'var(--p-border)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0"
            style={{ background: t.bg, color: t.fg, border: `1px solid ${t.bd}` }}>
            <Icon className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-[13px] font-bold truncate" style={{ color: 'var(--p-ink-900)' }}>{def.title}</h3>
        </div>
        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[11px] font-bold"
          style={{ background: t.bg, color: t.fg, border: `1px solid ${t.bd}` }}>{items.length}</span>
      </div>
      <ul className="divide-y flex-1" style={{ borderColor: 'var(--p-border)' }}>
        {shown.map(({ case: c, warnings }) => (
          <li key={c.id}>
            <Link to={caseHref(c.id)} className="flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--p-surface-tint)] transition-colors">
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--p-ink-900)' }}>{c.patient?.name || '—'}</div>
                <div className="text-[10.5px] font-mono truncate" style={{ color: 'var(--p-ink-400)' }}>{c.ourRef}</div>
                <div className="text-[10.5px] truncate" style={{ color: t.fg }}>
                  {warnings.map((w) => w.label).join(' · ')}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--p-ink-300)' }} />
            </Link>
          </li>
        ))}
      </ul>
      {extra > 0 && (
        <Link to={allCasesHref} className="px-4 py-2 text-[11px] font-semibold inline-flex items-center gap-1 border-t hover:underline"
          style={{ color: t.fg, borderColor: 'var(--p-border)' }}>
          +{extra} more in All Cases <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}
