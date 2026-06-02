import { useMemo, useState } from 'react'
import {
  Plus, Trash2, CreditCard, Wallet, ChevronDown, Lock, Info, AlertTriangle, Pencil,
} from 'lucide-react'
import { R1_PAYMENT_METHODS, R1_CURRENCIES } from '../data/p2cR1'
import { cn } from '../lib/cn'
import { IS_SUPABASE } from '../lib/api/config'

/* =========================================================================
 * PaymentLinesPanel (P2C.R3.1)
 * -----------------------------------------------------------------------
 * Shared multi-line payment editor for Cash invoices AND Patient Excess.
 *
 * R3.1 binding rules:
 *
 *   1. Visa / Card lines:
 *      - Actual Currency = EGP (locked).
 *      - Actual Collected EGP = Foreign Amount × FX Rate (auto, locked).
 *      - FX starts BLANK; no fixed default.
 *      - Routes to Visa / Bank — EGP treasury channel.
 *
 *   2. Cash same-currency (Actual Cur = Foreign Cur):
 *      - FX Rate is N/A.
 *      - Actual Collected mirrors Foreign Amount (locked).
 *      - Routes to physical cash of that currency.
 *
 *   3. Cash CROSS-currency (e.g. EUR invoice paid in EGP cash):
 *      - User picks a different Actual Currency.
 *      - FX Rate becomes required, editable per line.
 *      - Actual Collected = Foreign Amount × FX Rate (auto, locked).
 *      - Routes to physical cash of the Actual Currency.
 *
 *   4. Bank Transfer: free FX, free currency, manual amount.
 *
 * blankLine(type, invoiceCurrency) is the canonical factory.
 * ========================================================================= */

/** Canonical factory — no fixed FX defaults. */
export function blankLine(type, invoiceCurrency = 'EUR') {
  return {
    id: `pl_${Math.random().toString(36).slice(2, 9)}`,
    type,                          // "Invoice Payment" | "Patient Excess"
    method: 'Cash',
    fxRefCurrency: invoiceCurrency || 'EUR',
    fxRefAmount: '',
    fxRate: '',
    actualCurrency: invoiceCurrency || 'EUR',
    actualAmount: '',
    // back-compat: keep flat fields used by older treasury aggregator
    amount: '',
    currency: invoiceCurrency || 'EUR',
    note: '',
  }
}

/** Auto-compute Actual Collected from foreign × rate (when FX is in play). */
function computeFromFx(line) {
  const amt = Number(line.fxRefAmount)
  const rate = Number(line.fxRate)
  if (!Number.isFinite(amt) || !Number.isFinite(rate) || amt <= 0 || rate <= 0) return ''
  return Number((amt * rate).toFixed(2))
}

/** Detect whether the line uses cross-currency FX (Visa always; Cash when actual != foreign). */
export function lineUsesFx(line) {
  if (line.method === 'Visa / Card') return true
  if (line.method === 'Cash' && line.actualCurrency && line.fxRefCurrency && line.actualCurrency !== line.fxRefCurrency) return true
  return false
}

/** P3P — true when a loaded RECORDED row differs from its snapshot (_orig). */
export function paymentLineChanged(line) {
  const o = line._orig
  if (!o) return false
  const k = (l) => [
    /visa|card/i.test(l.method || '') ? 'visa_card' : 'cash',
    l.fxRefCurrency || '', String(Number(l.fxRefAmount ?? l.amount) || 0),
    l.actualCurrency || '', (l.fxRate === '' || l.fxRate == null) ? '' : String(Number(l.fxRate)),
  ].join('|')
  return k(line) !== k(o)
}

/** Sum amounts by ACTUAL currency. */
export function totalsByActualCurrency(lines) {
  const out = {}
  for (const l of lines) {
    const amt = Number(l.actualAmount ?? l.amount) || 0
    if (!amt) continue
    const cur = l.method === 'Visa / Card' ? 'EGP' : (l.actualCurrency || l.currency || 'EGP')
    out[cur] = (out[cur] || 0) + amt
  }
  return out
}

/** Derive the line's final shape from any patch — keeps FX and amounts coherent. */
function deriveLine(next) {
  // Visa always settles in EGP
  if (next.method === 'Visa / Card') {
    next.actualCurrency = 'EGP'
    const computed = computeFromFx(next)
    next.actualAmount = computed === '' ? '' : computed
    next.amount = next.actualAmount
    next.currency = 'EGP'
    return next
  }
  // Cash — either same currency (FX N/A) or cross currency (FX required)
  if (next.method === 'Cash') {
    if (!next.actualCurrency) next.actualCurrency = next.fxRefCurrency || 'EGP'
    if (next.actualCurrency === next.fxRefCurrency) {
      // Same currency — no FX
      next.fxRate = ''
      next.actualAmount = next.fxRefAmount === '' ? '' : Number(next.fxRefAmount) || ''
    } else {
      // Cross currency — auto-compute from FX
      const computed = computeFromFx(next)
      next.actualAmount = computed === '' ? '' : computed
    }
    next.amount = next.actualAmount
    next.currency = next.actualCurrency
    return next
  }
  // Bank Transfer — leave free
  next.amount = next.actualAmount
  next.currency = next.actualCurrency
  return next
}

export function PaymentLinesPanel({
  lines, setLines, typeLabel, title, helperText,
  invoiceCurrency = 'EUR', canEditRecorded = false,
}) {
  const [removeMsg, setRemoveMsg] = useState(null)
  function update(idx, patch) {
    setLines((p) => p.map((l, i) => {
      if (i !== idx) return l
      const merged = { ...l, ...patch }
      // P3J — same-currency cash must "just work". When the cashier picks the
      // Foreign Currency (or switches the method to Cash), mirror it into the
      // Actual Currency so the line is treated as SAME-currency: no phantom FX,
      // and the Actual Amount mirrors the Foreign Amount. (Before this, the line
      // kept its EUR default actual currency while Foreign became EGP, so it was
      // wrongly treated as cross-currency, demanded an FX rate, never computed an
      // amount, and was dropped from the totals — "No lines yet".) A genuine
      // cross-currency cash line is still possible: set the Foreign Currency,
      // then change the Actual Currency to a DIFFERENT value and the FX rate
      // becomes required again.
      if (merged.method === 'Cash' && ('fxRefCurrency' in patch || patch.method === 'Cash')) {
        merged.actualCurrency = merged.fxRefCurrency
      }
      return deriveLine(merged)
    }))
  }
  function add()        { setRemoveMsg(null); setLines((p) => [...p, blankLine(typeLabel, invoiceCurrency)]) }
  function remove(idx)  {
    const l = lines[idx]
    if (l && l._status === 'recorded') {
      setRemoveMsg('Recorded payments can’t be deleted in this version. To correct one, change its amount / method / currency and save with a correction reason.')
      return
    }
    setRemoveMsg(null)
    setLines((p) => p.length === 1 ? [blankLine(typeLabel, invoiceCurrency)] : p.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>{title}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{helperText}</div>
        </div>
        <button type="button" onClick={add}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold p-btn-ghost">
          <Plus className="w-3.5 h-3.5" /> Add Payment Line
        </button>
      </div>

      {/* Desktop column header */}
      <div className="hidden lg:grid grid-cols-24 gap-2 px-2 text-[10px] uppercase tracking-[0.10em] font-bold"
           style={{ color: 'var(--p-ink-500)' }}>
        <span className="col-span-1">#</span>
        <span className="col-span-3">Method</span>
        <span className="col-span-2">Foreign Cur.</span>
        <span className="col-span-3">Foreign Amount Covered</span>
        <span className="col-span-3">FX Rate Used (EGP per unit)</span>
        <span className="col-span-3">Actual Currency</span>
        <span className="col-span-3">Actual Collected Amount</span>
        <span className="col-span-5">Note</span>
        <span className="col-span-1" />
      </div>

      <div className="space-y-2">
        {lines.map((l, i) => {
          const isVisa = l.method === 'Visa / Card'
          const isCash = l.method === 'Cash'
          const sameCurrency = isCash && l.actualCurrency === l.fxRefCurrency
          const needsFx = lineUsesFx(l)
          const computed = needsFx ? computeFromFx(l) : ''
          const showAutoLock = needsFx || sameCurrency  // both cases auto-derive actual amount
          const channel = isVisa
            ? `Visa / Bank — EGP`
            : isCash
              ? `Physical Cash — ${l.actualCurrency || '—'}`
              : `Bank Transfer`
          // P3P — recorded rows: read-only for non-admins (locked); admins edit in
          // place and a changed row requires a correction reason on Save.
          const isRecorded = l._status === 'recorded'
          const locked = isRecorded && !canEditRecorded
          const changed = isRecorded && canEditRecorded && paymentLineChanged(l)

          return (
            <div key={l.id}
                 className="rounded-xl p-3 lg:p-2 grid grid-cols-1 lg:grid-cols-24 gap-2 lg:gap-2 items-center"
                 style={{ background: changed ? 'var(--p-pending-soft)' : 'var(--p-surface-tint)', border: '1px solid ' + (changed ? '#F0C97A' : 'var(--p-border)') }}>

              {/* # */}
              <div className="lg:col-span-1 flex items-center gap-2">
                <span className="lg:hidden text-[10px] uppercase font-bold tracking-[0.12em]" style={{ color: 'var(--p-ink-500)' }}>Line</span>
                <span className="inline-flex items-center justify-center w-8 h-9 rounded-md text-xs font-bold"
                  style={{ background: 'white', border: '1px solid var(--p-border)', color: 'var(--p-ink-700)' }}>{i + 1}</span>
              </div>

              {/* Method */}
              <MobileCell label="Method" className="lg:col-span-3">
                <SelectField value={l.method} disabled={locked} onChange={(v) => update(i, { method: v })}
                  options={R1_PAYMENT_METHODS} />
              </MobileCell>

              {/* Foreign currency */}
              <MobileCell label="Foreign Cur." className="lg:col-span-2">
                <SelectField value={l.fxRefCurrency} disabled={locked} onChange={(v) => update(i, { fxRefCurrency: v })}
                  options={R1_CURRENCIES} />
              </MobileCell>

              {/* Foreign amount covered */}
              <MobileCell label="Foreign Amount Covered" className="lg:col-span-3">
                <input type="number" value={l.fxRefAmount} disabled={locked}
                  onChange={(e) => update(i, { fxRefAmount: e.target.value })}
                  placeholder="0.00" className="p-input h-10" />
              </MobileCell>

              {/* FX rate — N/A only when Cash + same currency. Visa always editable. Cash cross-currency editable. */}
              <MobileCell label="FX Rate Used" className="lg:col-span-3"
                hint={sameCurrency ? 'Not Applicable (cash same-currency)' : 'EGP per 1 unit of foreign currency'}>
                <input type="number" step="0.0001" value={l.fxRate}
                  disabled={sameCurrency || locked}
                  onChange={(e) => update(i, { fxRate: e.target.value })}
                  placeholder={sameCurrency ? 'N/A' : 'enter rate'}
                  className="p-input h-10"
                  style={(sameCurrency || locked) ? { background: 'var(--p-surface-deep)', color: 'var(--p-ink-400)' } : {}} />
              </MobileCell>

              {/* Actual currency — editable for Cash (any), locked for Visa */}
              <MobileCell label={isVisa ? 'Actual Cur. (locked EGP)' : 'Actual Currency'} className="lg:col-span-3">
                <SelectField value={l.actualCurrency} disabled={isVisa || locked}
                  onChange={(v) => update(i, { actualCurrency: v })}
                  options={R1_CURRENCIES} />
              </MobileCell>

              {/* Actual amount — locked (auto) for both Visa and Cash */}
              <MobileCell label={
                isVisa ? 'Actual Collected EGP (auto)'
                : sameCurrency ? `Actual ${l.actualCurrency || ''} (mirror)`
                : `Actual ${l.actualCurrency || ''} (FX auto)`}
                className="lg:col-span-3">
                {showAutoLock ? (
                  <div className={cn('p-input h-10 inline-flex items-center justify-between gap-2 font-bold p-numeric')}
                       style={{
                         background: (l.actualAmount && l.actualAmount !== '') ? '#F1FBF6' : 'var(--p-surface-deep)',
                         color: (l.actualAmount && l.actualAmount !== '') ? '#0A8F62' : 'var(--p-ink-400)',
                         border: '1px solid ' + ((l.actualAmount && l.actualAmount !== '') ? '#A8E6C7' : 'var(--p-border)'),
                       }}>
                    <Lock className="w-3 h-3 shrink-0" style={{ color: (l.actualAmount && l.actualAmount !== '') ? '#0A8F62' : 'var(--p-ink-400)' }} />
                    <span className="flex-1 text-right truncate">
                      {l.actualAmount !== '' && l.actualAmount !== undefined && l.actualAmount !== null
                        ? `${fmt(l.actualAmount)} ${l.actualCurrency || ''}`
                        : needsFx ? 'enter amount + rate' : '—'}
                    </span>
                  </div>
                ) : (
                  <input type="number" value={l.actualAmount ?? ''} disabled={locked}
                    onChange={(e) => update(i, { actualAmount: e.target.value })}
                    placeholder="0.00" className="p-input h-10" />
                )}
              </MobileCell>

              {/* Note */}
              <MobileCell label="Note" className="lg:col-span-5">
                <input value={l.note || ''} disabled={locked} onChange={(e) => update(i, { note: e.target.value })}
                  placeholder="(optional)" className="p-input h-10" />
              </MobileCell>

              {/* Remove — recorded rows can't be deleted (shows a clear message). */}
              <div className="lg:col-span-1 flex lg:justify-end">
                <button type="button" onClick={() => remove(i)} aria-label={isRecorded ? 'Recorded — cannot delete' : 'Remove line'}
                  className="w-10 h-10 rounded-md inline-flex items-center justify-center"
                  style={{ background: 'white', border: '1px solid var(--p-border)', color: isRecorded ? 'var(--p-ink-400)' : 'var(--p-mixed)' }}>
                  {isRecorded ? <Lock className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Per-line advisory + treasury channel chip */}
              <div className="lg:col-span-24 text-[11px] flex items-center gap-2 flex-wrap"
                   style={{ color: 'var(--p-ink-500)' }}>
                {isRecorded && (
                  <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full text-[10px] font-bold"
                    style={changed
                      ? { background: 'var(--p-pending-soft)', color: '#A1672A', border: '1px solid #F0C97A' }
                      : { background: 'var(--p-cash-soft)', color: '#0A8F62', border: '1px solid #A8E6C7' }}>
                    {changed ? <><Pencil className="w-2.5 h-2.5" /> Edited — needs reason</> : <><Lock className="w-2.5 h-2.5" /> Recorded</>}
                  </span>
                )}
                {IS_SUPABASE && isVisa && Number(l.fxRefAmount) > 0 && (!l.fxRate || Number(l.fxRate) <= 0) && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold w-full lg:w-auto"
                        style={{ background: 'var(--p-pending-soft)', color: '#A1672A', border: '1px solid #F0C97A' }}>
                    <Info className="w-3 h-3 shrink-0" /> FX rate required — this line is not counted until you enter the rate.
                  </span>
                )}
                {isVisa ? <CreditCard className="w-3 h-3" /> : isCash ? <Wallet className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                {isVisa ? (
                  <span>Visa / Card settles in <strong>EGP only</strong>. Foreign Amount × FX Rate auto-fills the locked Actual EGP amount.</span>
                ) : isCash && sameCurrency ? (
                  <span>Same-currency cash: Foreign Amount = Actual Amount (no FX). Routes to <strong>Physical Cash — {l.actualCurrency}</strong>.</span>
                ) : isCash && !sameCurrency ? (
                  <span>Cross-currency cash: enter FX rate, Actual Amount auto-fills (locked). Routes to <strong>Physical Cash — {l.actualCurrency}</strong>.</span>
                ) : (
                  <span>Bank Transfer: free entry.</span>
                )}
                <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full text-[10px] font-bold ml-auto"
                      style={{ background: isVisa ? 'var(--p-brand-pale)' : 'var(--p-cash-soft)',
                               color:      isVisa ? '#1E4180' : '#0A8F62',
                               border:     '1px solid ' + (isVisa ? '#BCCDE8' : '#A8E6C7') }}>
                  Channel: {channel}
                </span>
              </div>

              {/* P3P — a changed recorded row requires a correction reason (audited). */}
              {changed && (
                <div className="lg:col-span-24">
                  <input value={l._reason || ''} onChange={(e) => update(i, { _reason: e.target.value })}
                    placeholder="Correction reason (required) — why is this row being changed?"
                    className="p-input h-10"
                    style={{ borderColor: (l._reason && String(l._reason).trim()) ? 'var(--p-border)' : '#F0C97A' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {removeMsg && (
        <div className="rounded-xl px-3 py-2 flex items-start gap-2 text-[12px]"
          style={{ background: 'var(--p-pending-soft)', color: '#A1672A', border: '1px solid #F0C97A' }}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{removeMsg}</span>
        </div>
      )}
    </div>
  )
}

function MobileCell({ label, hint, className, children }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="lg:hidden text-[10px] uppercase font-bold tracking-[0.12em]" style={{ color: 'var(--p-ink-500)' }}>{label}</span>
      {children}
      {hint && <span className="hidden lg:block text-[10px]" style={{ color: 'var(--p-ink-400)' }}>{hint}</span>}
    </div>
  )
}

function SelectField({ value, onChange, options, disabled }) {
  return (
    <div className="relative">
      <select value={value || ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        className="p-input appearance-none w-full pr-8 h-10"
        style={disabled ? { background: 'var(--p-surface-deep)', color: 'var(--p-ink-500)' } : {}}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
        style={{ color: 'var(--p-ink-400)' }} />
    </div>
  )
}

function fmt(n) {
  if (n === '' || n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}
