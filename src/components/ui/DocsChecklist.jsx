import { cn } from '../../lib/cn'
import { Check, FileText, FileCheck2 } from 'lucide-react'
import { DOC_CHECKLIST_DEFS } from '../../data/mock'

/**
 * DocsChecklist — a clean checklist row component.
 * Read-only or interactive depending on `onToggle` prop.
 *
 * `value` is { key: bool }
 */
export function DocsChecklist({ value = {}, onToggle, readOnly = false, className }) {
  const total = DOC_CHECKLIST_DEFS.length
  const checkedCount = DOC_CHECKLIST_DEFS.reduce((acc, d) => acc + (value[d.key] ? 1 : 0), 0)
  const pct = Math.round((checkedCount / total) * 100)

  return (
    <div className={cn('rounded-xl border border-border bg-surface overflow-hidden', className)}>
      <div className="flex items-center justify-between p-3.5 border-b border-border bg-subtle/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink-900">Documentation Checklist</div>
            <div className="text-[11px] text-ink-500">{checkedCount} of {total} items confirmed — demo only</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs font-semibold text-ink-700 tabular-nums w-8 text-end">{pct}%</div>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {DOC_CHECKLIST_DEFS.map((d) => {
          const checked = !!value[d.key]
          const Tag = readOnly ? 'div' : 'button'
          return (
            <li key={d.key}>
              <Tag
                type={readOnly ? undefined : 'button'}
                onClick={readOnly ? undefined : () => onToggle?.(d.key, !checked)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 w-full text-start',
                  !readOnly && 'hover:bg-subtle cursor-pointer',
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all',
                  checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-border-strong',
                )}>
                  {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </span>
                <FileText className={cn('w-4 h-4 shrink-0', checked ? 'text-emerald-600' : 'text-ink-300')} />
                <span className={cn(
                  'text-sm flex-1 min-w-0',
                  checked ? 'text-ink-800' : 'text-ink-600',
                )}>{d.label}</span>
              </Tag>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
