import { useState } from 'react'
import { Database, Download, Trash2, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { useDemoState, useUatMode } from '../context/DemoStateContext'
import { buildUatState } from '../data/uatDataset'

/* =========================================================================
 * UatToolbar (R3.1)
 * -----------------------------------------------------------------------
 * Demo-only toolbar with two actions:
 *
 *   - Load Full UAT Review Dataset → populates state with the structured
 *     UAT dataset covering every external clinic + both branches +
 *     transfers + attendance + expenses + insurer catalogue.
 *
 *   - Reset to Empty Demo State → wipes the runtime state back to empty
 *     (preserves catalogues).
 *
 * Shown on Demo Roles + Admin Control Center.
 * ========================================================================= */

export function UatToolbar({ compact = false }) {
  const { actions } = useDemoState()
  const mode = useUatMode()
  const [feedback, setFeedback] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)

  function handleLoad() {
    const state = buildUatState()
    actions.loadUatState(state)
    setFeedback({ tone: 'ok', message: `UAT Review Dataset loaded — ${state.cases.length} cases across all clinics + branches.` })
  }

  function handleReset() {
    actions.resetEmpty()
    setConfirmReset(false)
    setFeedback({ tone: 'warn', message: 'Demo state cleared. All UAT cases and runtime data removed.' })
  }

  return (
    <div className={`rounded-2xl p-4 ${compact ? '' : 'sm:p-5'} flex flex-col gap-3`}
         style={{ background: 'linear-gradient(135deg, var(--p-brand-pale) 0%, white 100%)', border: '1px solid #BCCDE8' }}>
      <div className="flex items-start gap-3 flex-wrap">
        <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0"
              style={{ background: 'var(--p-brand-mid)', color: 'white' }}>
          <Database className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-brand-mid)' }}>
            UAT Review Dataset
          </div>
          <div className="text-sm font-bold mt-0.5" style={{ color: 'var(--p-ink-900)' }}>
            {mode === 'uat-loaded' ? 'UAT dataset loaded' : 'Empty state — ready to load UAT data'}
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'var(--p-ink-600)' }}>
            Demo-only runtime data: cases, transfers, attendance, expenses, insurer catalogue.
            Refresh resets to empty. Production behaviour is delivered later by the approved backend.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button onClick={handleLoad}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold p-btn-primary">
            <Download className="w-3.5 h-3.5" /> Load Full UAT Review Dataset
          </button>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-semibold p-btn-ghost">
              <Trash2 className="w-3.5 h-3.5" /> Reset to Empty
            </button>
          ) : (
            <>
              <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>Confirm reset?</span>
              <button onClick={() => setConfirmReset(false)} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full text-xs font-semibold p-btn-ghost">Cancel</button>
              <button onClick={handleReset}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold text-white"
                style={{ background: 'var(--p-mixed)' }}>
                <Trash2 className="w-3.5 h-3.5" /> Confirm Reset
              </button>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl px-3 py-2 flex items-start gap-2"
             style={{
               background: feedback.tone === 'ok' ? 'var(--p-finalized-soft)' : 'var(--p-pending-soft)',
               color:      feedback.tone === 'ok' ? '#076D4A' : '#A1672A',
               border:     '1px solid ' + (feedback.tone === 'ok' ? '#9FD4BB' : '#F0C97A'),
             }}>
          {feedback.tone === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="flex-1 text-[12px] font-semibold">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  )
}
