import { cn } from '../../lib/cn'
import { ArrowRight, Send, Inbox, MapPin, Clock } from 'lucide-react'
import { fmtDate } from '../../lib/format'

/**
 * TransferTimeline — visual journey for transferred cases.
 *
 * Steps adapt to the case:
 *   - Direct: single "Registered at <branch>" pill
 *   - Transferred Out: Registered → Sent → (Receiving branch awaiting)
 *   - Transferred In: Origin Sent → Received here
 */
export function TransferTimeline({ caseData, currentBranchName, className }) {
  const c = caseData
  const isOut = c.route === 'Transferred Out'
  const isIn  = c.route === 'Transferred In'
  const isDirect = !isOut && !isIn

  const steps = []
  if (isDirect) {
    steps.push({
      icon: MapPin, tone: 'navy',
      title: `Registered at ${currentBranchName}`,
      time: c.visitDate, note: 'Direct visit — no transfer movement.',
    })
  }
  if (isOut) {
    steps.push({
      icon: MapPin, tone: 'navy',
      title: `Registered at ${currentBranchName}`,
      time: c.visitDate, note: 'Case originated here.',
    })
    steps.push({
      icon: Send, tone: 'violet', emphasis: true,
      title: `Sent to ${c.transferToName}`,
      time: c.transferSentAt, note: c.transferNote || '',
      meta: c.transportType ? `Transport: ${c.transportType}` : null,
    })
    steps.push({
      icon: Inbox, tone: 'muted',
      title: `Awaiting receipt at ${c.transferToName}`,
      time: null, note: 'Same Our Ref continues at the receiving branch.',
    })
  }
  if (isIn) {
    steps.push({
      icon: MapPin, tone: 'navy',
      title: `Originated at ${c.transferFromName}`,
      time: c.transferSentAt ? new Date(new Date(c.transferSentAt).getTime() - 40*60000).toISOString() : null,
      note: 'Case originally registered at another branch.',
    })
    steps.push({
      icon: Send, tone: 'violet', emphasis: true,
      title: `Sent from ${c.transferFromName}`,
      time: c.transferSentAt, note: c.transferNote || '',
      meta: c.transportType ? `Transport: ${c.transportType}` : null,
    })
    steps.push({
      icon: Inbox, tone: c.transferReceivedAt ? 'success' : 'amber',
      title: c.transferReceivedAt ? `Received at ${currentBranchName}` : `Awaiting receipt at ${currentBranchName}`,
      time: c.transferReceivedAt, note: c.transferReceivedAt ? 'Patient confirmed received — case continues here.' : 'Click Receive to confirm and continue the case.',
    })
  }

  const toneClasses = {
    navy: 'bg-navy-100 text-navy-700 ring-navy-200',
    violet: 'bg-violet-100 text-violet-700 ring-violet-200',
    success: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-100 text-amber-700 ring-amber-200',
    muted: 'bg-subtle text-ink-400 ring-border',
  }

  return (
    <ol className={cn('space-y-3', className)}>
      {steps.map((s, i) => (
        <li key={i} className="relative ps-9">
          <span className={cn(
            'absolute left-0 top-1 w-7 h-7 rounded-full ring-2 flex items-center justify-center',
            toneClasses[s.tone] || toneClasses.muted,
            s.emphasis && 'ring-4',
          )}>
            <s.icon className="w-3.5 h-3.5" />
          </span>
          {i < steps.length - 1 && <span className="absolute left-[13px] top-9 bottom-[-12px] w-px bg-border" />}
          <div className="rounded-lg border border-border bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-ink-900">{s.title}</div>
              {s.time && (
                <div className="text-[11px] text-ink-500 flex items-center gap-1 whitespace-nowrap">
                  <Clock className="w-3 h-3" /> {fmtDate(s.time, { withTime: true })}
                </div>
              )}
            </div>
            {s.note && <div className="text-xs text-ink-600 mt-1 leading-relaxed">{s.note}</div>}
            {s.meta && <div className="text-[11px] text-ink-400 mt-1">{s.meta}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}
