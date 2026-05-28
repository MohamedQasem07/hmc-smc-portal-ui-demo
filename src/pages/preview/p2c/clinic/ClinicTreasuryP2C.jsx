import { useMemo, useState } from 'react'
import {
  Wallet, Banknote, CreditCard, Plus, AlertTriangle, CheckCircle2,
  Lock, ClipboardCheck, ChevronDown, FileText, ShieldOff, X, Info,
  ArrowRight, Receipt, Building2,
} from 'lucide-react'
import { OperationalShell, IdentityHeader } from '../../../../premium/OperationalShell'
import { SectionHead, DemoBanner } from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import { useUserMode } from '../../../../context/UserModeContext'
import {
  useDemoState, useTreasuryFor, useVisaBankFor, useExpensesFor, useHandoversFor,
  useVisaTransactionsFor, useEgpCombinedFor,
} from '../../../../context/DemoStateContext'
import { getClinicName } from '../../../../data/p2c'
import { R1_CURRENCIES, R1_TODAY_LABEL } from '../../../../data/p2cR1'
import { fmtDMY, fmtDMYHM, fmtHM } from '../../../../lib/displayDate'
import { cn } from '../../../../lib/cn'

/* =========================================================================
 * P2C.R3 — External Clinic Treasury, Expenses & Handover
 * -----------------------------------------------------------------------
 * Three operationally-separate sections, by Mohamed's binding R3 rule:
 *
 *   Section A — Physical Cash Balances + Cash Handover
 *   Section B — Visa / Bank Collections (EGP only), transaction-by-transaction
 *               handover. Each Visa tx is listed individually and can be
 *               marked Handed Over separately. Summary shows count + total
 *               EGP.
 *   Section C — Handover History (closed cash periods + confirmed Visa txs)
 *
 * Expense entry lives only in Section A. Standalone /clinic/expenses
 * route now redirects here (see App.jsx).
 * ========================================================================= */

export default function ClinicTreasuryP2C() {
  const { clinicId } = useUserMode()
  const clinicName = getClinicName(clinicId)
  const treasury = useTreasuryFor(clinicId)
  const visaBank = useVisaBankFor(clinicId)
  const recentExpenses = useExpensesFor(clinicId)
  const handovers = useHandoversFor(clinicId)
  const visaTransactions = useVisaTransactionsFor(clinicId)
  const egpCombined = useEgpCombinedFor(clinicId)
  const openHandover = handovers.find((h) => h.status === 'Draft')
  const closedHandovers = handovers.filter((h) => h.status === 'Closed')

  return (
    <OperationalShell role="clinic_nurse" active="treasury"
      identityName={clinicName} identitySub="External Clinic Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-12 max-w-[1500px] mx-auto space-y-6">

        <DemoBanner>
          <strong>Interactive Demo</strong> — physical cash and Visa/Bank are tracked separately. Cases registered in this session add to balances live. No persistence; refresh resets.
        </DemoBanner>

        <IdentityHeader
          icon={Wallet}
          tone="gold"
          label="Treasury & Handover"
          subtitle={`${clinicName} · ${R1_TODAY_LABEL}`}
          badges={openHandover && <StatusPill tone="amber" icon={ClipboardCheck}>Open Handover Period</StatusPill>}
        />

        {/* R3.1 — Combined EGP Summary (display-only consolidation across the two EGP channels) */}
        {egpCombined && (egpCombined.physicalCashAvailable > 0 || egpCombined.visaBankPending > 0) && (
          <EgpCombinedCard combined={egpCombined} />
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* SECTION A — Physical cash + cash handover                      */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <SectionDivider letter="A" title="Physical Cash Balances & Cash Handover"
          description="Cash is delivered physically by currency. Each currency tracked separately — no FX conversion in cash treasury." />

        <section>
          <SectionHead eyebrow="A.1 — Balances by Currency" title="Cash Treasury" />
          {treasury ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {R1_CURRENCIES.map((cur) => (
                <CashCurrencyCard key={cur} currency={cur} balance={treasury[cur]} />
              ))}
            </div>
          ) : (
            <div className="p-card p-6 text-center text-sm" style={{ color: 'var(--p-ink-500)' }}>No treasury record for this clinic.</div>
          )}
        </section>

        <section>
          <SectionHead eyebrow="A.2 — Operational Expenses" title="Record an Expense"
            description="External clinics only. Expense must come from same-currency physical cash. Visa / Bank cannot fund expenses." />
          {treasury
            ? <ExpenseEntryPanel clinicId={clinicId} treasury={treasury} recentExpenses={recentExpenses} />
            : <div className="p-card p-6 text-center text-sm" style={{ color: 'var(--p-ink-500)' }}>No treasury — no expense entry.</div>}
        </section>

        {openHandover && (
          <section>
            <SectionHead eyebrow="A.3 — Cash Handover (Current Period)" title="Open Handover Statement"
              description="Enter Actually Delivered for each currency row when you hand the physical cash + Visa records over." />
            <HandoverStatement handover={openHandover} editable />
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* SECTION B — Visa/Bank — transaction-by-transaction              */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <SectionDivider letter="B" title="Visa / Bank Collections — EGP Only"
          description="Visa / Card collections settle in EGP. Each transaction is confirmed individually — never merged with physical cash." />

        <section>
          <VisaBankSummary visaBank={visaBank} />
        </section>

        <section>
          <SectionHead eyebrow="B.1 — Transactions" title="Visa / Card Transactions"
            description="Confirm each transaction as it is physically handed over to the supervisor / bank. Summary count and total EGP update as you confirm." />
          <VisaTransactionsTable transactions={visaTransactions} />
        </section>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* SECTION C — History                                            */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {closedHandovers.length > 0 && (
          <>
            <SectionDivider letter="C" title="Handover History"
              description="Closed cash handovers + confirmed Visa transactions for prior periods." />
            <section>
              <div className="space-y-3">
                {closedHandovers.map((h) => (
                  <HandoverStatement key={h.id} handover={h} />
                ))}
              </div>
            </section>
          </>
        )}

      </div>
    </OperationalShell>
  )
}

// =====================================================================
// Section divider (visual separation between A / B / C)
// =====================================================================
function SectionDivider({ letter, title, description }) {
  return (
    <div className="flex items-center gap-4 pt-3 pb-1">
      <span className="w-9 h-9 rounded-xl inline-flex items-center justify-center font-bold text-sm shrink-0"
            style={{ background: 'var(--p-brand-mid)', color: 'white' }}>{letter}</span>
      <div className="min-w-0">
        <div className="p-eyebrow" style={{ color: 'var(--p-brand-mid)' }}>Section {letter}</div>
        <div className="text-base sm:text-lg font-bold" style={{ color: 'var(--p-ink-900)' }}>{title}</div>
        {description && <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{description}</div>}
      </div>
      <div className="flex-1 h-px hidden sm:block" style={{ background: 'var(--p-border)' }} />
    </div>
  )
}

// =====================================================================
// Cash currency card
// =====================================================================
function CashCurrencyCard({ currency, balance }) {
  if (!balance) return null
  const empty = balance.cashInvoiceCollections === 0
    && balance.patientExcessCollections === 0
    && balance.expenses === 0
    && balance.handedOver === 0
  return (
    <div className={cn('p-card p-4 flex flex-col gap-3', empty && 'opacity-60')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-lg inline-flex items-center justify-center font-bold text-xs"
            style={{ background: 'var(--p-brand-pale)', color: 'var(--p-brand-mid)' }}>{currency}</span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Cash</div>
            <div className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{currency}</div>
          </div>
        </div>
        {!empty && <StatusPill tone="cash">Active</StatusPill>}
      </div>

      <div className="space-y-1.5 text-[12px]">
        <Row label="Cash Invoice Collections" amount={balance.cashInvoiceCollections} currency={currency} positive />
        <Row label="Patient Excess Collections" amount={balance.patientExcessCollections} currency={currency} positive />
        <Row label="Expenses" amount={-balance.expenses} currency={currency} negative={balance.expenses > 0} />
        <Row label="Already Handed Over" amount={-balance.handedOver} currency={currency} negative={balance.handedOver > 0} />
      </div>

      <div className="border-t pt-2 mt-1" style={{ borderColor: 'var(--p-border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-700)' }}>Available to Hand Over</span>
          <span className="text-base font-bold p-numeric" style={{ color: balance.net > 0 ? 'var(--p-ink-900)' : 'var(--p-ink-400)' }}>
            {fmt(balance.net)} <span className="text-xs" style={{ color: 'var(--p-ink-500)' }}>{currency}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function Row({ label, amount, currency, positive, negative }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--p-ink-500)' }}>{label}</span>
      <span className="p-numeric font-semibold"
        style={{ color: negative ? 'var(--p-mixed)' : positive ? 'var(--p-cash)' : 'var(--p-ink-700)' }}>
        {amount === 0 ? '—' : `${amount > 0 ? '+' : ''}${fmt(amount)} ${currency}`}
      </span>
    </div>
  )
}

// =====================================================================
// Visa / Bank — summary + transactions table
// =====================================================================
function VisaBankSummary({ visaBank }) {
  if (!visaBank) {
    return <div className="p-card p-6 text-center text-sm" style={{ color: 'var(--p-ink-500)' }}>No Visa / Bank movements.</div>
  }
  return (
    <div className="p-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-xl inline-flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1E4180 0%, #0A1B3D 100%)', color: 'white' }}>
            <CreditCard className="w-5 h-5" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Bank Collection</div>
            <div className="text-base font-bold" style={{ color: 'var(--p-ink-900)' }}>Visa / Bank — EGP</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[10px] uppercase tracking-[0.14em] font-bold"
          style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
          <ShieldOff className="w-3 h-3" /> Not Cash · Cannot Pay Expenses
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Pending Transactions" value={visaBank.pendingCount} sub="awaiting handover" tone={visaBank.pendingCount > 0 ? 'pending' : 'navy'} />
        <Tile label="Pending Total" value={`${fmt(visaBank.pending)} EGP`} sub="not yet confirmed" tone={visaBank.pending > 0 ? 'pending' : 'navy'} />
        <Tile label="Confirmed Transactions" value={visaBank.confirmedCount} sub="handed over" tone="cash" />
        <Tile label="Confirmed Total" value={`${fmt(visaBank.confirmedInHandover)} EGP`} sub="already handed over" tone="cash" />
      </div>
    </div>
  )
}

function VisaTransactionsTable({ transactions }) {
  const { actions } = useDemoState()
  const [selected, setSelected] = useState({})

  // Skip legacy seed when figuring out selectability — only live tx can be confirmed.
  const liveTxs = transactions.filter((t) => t.kind !== 'legacy_seed')
  const pendingLive = liveTxs.filter((t) => t.status === 'pending')
  const allSelected = pendingLive.length > 0 && pendingLive.every((t) => selected[t.id])
  const selectedIds = Object.keys(selected).filter((k) => selected[k])

  function toggle(id) { setSelected((p) => ({ ...p, [id]: !p[id] })) }
  function toggleAll() {
    if (allSelected) setSelected({})
    else {
      const next = {}
      for (const t of pendingLive) next[t.id] = true
      setSelected(next)
    }
  }
  function confirmSelected() {
    const ids = selectedIds.map((sid) => {
      // sid is the synthetic vt_… id. We stored the original line.id inside
      // the transaction object — find it back.
      const tx = liveTxs.find((t) => t.id === sid)
      return tx ? sid.replace(/^vt_[^_]+_/, '') : null
    }).filter(Boolean)
    if (ids.length === 0) return
    // The reducer keys are the line.id values; recover them by intersection.
    const lineIds = []
    for (const sid of selectedIds) {
      const tx = liveTxs.find((t) => t.id === sid)
      if (!tx) continue
      // The vt_<caseId>_<lineId> pattern preserves the line id as the tail.
      const tail = sid.split('_').slice(2).join('_')
      if (tail) lineIds.push(tail)
    }
    actions.confirmVisaTx(lineIds)
    setSelected({})
  }

  if (transactions.length === 0) {
    return <div className="p-card p-6 text-center text-sm" style={{ color: 'var(--p-ink-500)' }}>No Visa / Card transactions yet.</div>
  }

  return (
    <div className="p-card overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
        <div className="text-[11px] flex items-center gap-2" style={{ color: 'var(--p-ink-700)' }}>
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>{selectedIds.length} selected of {pendingLive.length} pending</span>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button onClick={toggleAll} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold p-btn-ghost">
            {allSelected ? 'Clear Selection' : 'Select All Pending'}
          </button>
          <button onClick={confirmSelected} disabled={selectedIds.length === 0}
            className={cn('inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-bold p-btn-primary',
              selectedIds.length === 0 && 'opacity-40 cursor-not-allowed')}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Selected Visa Handover
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[860px]">
          <thead>
            <tr style={{ background: 'var(--p-surface-tint)' }}>
              {['Select', 'Status', 'OUR Ref', 'Patient', 'Collection Type', 'Invoice Cur.', 'Foreign Amount', 'FX Rate', 'Actual EGP', 'Action'].map((h) =>
                <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const isLegacy = t.kind === 'legacy_seed'
              const isPending = t.status === 'pending'
              return (
                <tr key={t.id} style={{ borderTop: '1px solid var(--p-border)' }}>
                  <td className="px-3 py-2.5 no-print">
                    {isPending ? (
                      <input type="checkbox" checked={!!selected[t.id]} onChange={() => toggle(t.id)}
                        className="w-4 h-4" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" style={{ color: 'var(--p-ink-300)' }} />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {t.status === 'pending'
                      ? <StatusPill tone="amber" icon={ClipboardCheck}>Pending</StatusPill>
                      : t.status === 'confirmed_seed'
                      ? <StatusPill tone="finalized" icon={Lock}>Carry-Forward</StatusPill>
                      : <StatusPill tone="finalized" icon={CheckCircle2}>Confirmed</StatusPill>}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{t.ourRef}</td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--p-ink-900)' }}>{t.patientName}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-700)' }}>{t.collectionType}</td>
                  <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--p-brand-mid)' }}>{t.fxRefCurrency}</td>
                  <td className="px-3 py-2.5 p-numeric" style={{ color: 'var(--p-ink-700)' }}>{t.fxRefAmount !== null ? fmt(t.fxRefAmount) : '—'}</td>
                  <td className="px-3 py-2.5 p-numeric" style={{ color: 'var(--p-ink-700)' }}>{t.fxRate !== null ? fmt(t.fxRate) : '—'}</td>
                  <td className="px-3 py-2.5 p-numeric font-bold" style={{ color: 'var(--p-ink-900)' }}>{fmt(t.amountEgp)} EGP</td>
                  <td className="px-3 py-2.5 text-right no-print">
                    {isPending ? (
                      <button onClick={() => actions.confirmVisaTx(t.id.split('_').slice(2).join('_'))}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold p-btn-ghost">
                        <CheckCircle2 className="w-3 h-3" /> Confirm Handover
                      </button>
                    ) : isLegacy ? (
                      <span className="text-[10px]" style={{ color: 'var(--p-ink-400)' }}>seed</span>
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--p-ink-400)' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Tile({ label, value, sub, tone = 'navy' }) {
  const tones = {
    navy:    { bg: 'var(--p-surface-tint)', fg: 'var(--p-ink-900)' },
    cash:    { bg: 'var(--p-cash-soft)',    fg: '#0A8F62' },
    pending: { bg: 'var(--p-pending-soft)', fg: '#A1672A' },
  }
  const t = tones[tone] || tones.navy
  return (
    <div className="rounded-xl px-3 py-3" style={{ background: t.bg, border: '1px solid var(--p-border)' }}>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
      <div className="mt-1 text-base font-bold p-numeric" style={{ color: t.fg }}>{value}</div>
      <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{sub}</div>
    </div>
  )
}

// =====================================================================
// Expense entry — same-currency cash validation
// =====================================================================
function ExpenseEntryPanel({ clinicId, treasury, recentExpenses }) {
  const { actions } = useDemoState()
  const [form, setForm] = useState({
    currency: 'EGP', amount: '', category: '', note: '',
    paidFrom: 'Physical Cash Balance',
  })
  const [feedback, setFeedback] = useState(null)

  const balance = treasury[form.currency]
  const available = balance ? balance.cashInvoiceCollections + balance.patientExcessCollections - balance.expenses - balance.handedOver : 0
  const requested = Number(form.amount) || 0
  const wouldExceed = requested > available
  const tryingVisaPath = form.paidFrom !== 'Physical Cash Balance'

  function update(key, val) {
    setForm((p) => ({ ...p, [key]: val }))
    setFeedback(null)
  }

  function record(e) {
    e.preventDefault()
    if (tryingVisaPath) {
      setFeedback({ tone: 'reject', message: 'Expense cannot exceed available physical cash balance in the same currency. Visa / Bank collections are not available for cash expenses.' })
      return
    }
    if (!requested || requested <= 0) {
      setFeedback({ tone: 'warn', message: 'Enter an expense amount above zero.' })
      return
    }
    if (wouldExceed) {
      setFeedback({ tone: 'reject', message: `Insufficient ${form.currency} physical cash (available ${fmt(available)} ${form.currency}).` })
      return
    }
    actions.addExpense({
      clinicId,
      at: new Date().toISOString(),
      currency: form.currency,
      amount: requested,
      category: form.category || 'Other',
      note: form.note,
      paidFrom: form.paidFrom,
    })
    setFeedback({ tone: 'ok', message: `Recorded: ${fmt(requested)} ${form.currency} deducted from ${form.currency} physical cash. New available: ${fmt(available - requested)} ${form.currency}.` })
    setForm((p) => ({ ...p, amount: '', note: '' }))
  }

  return (
    <div className="p-card p-5 space-y-5">
      <form onSubmit={record} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <FormField label="Currency *" cols={2}>
          <SelectInput value={form.currency} onChange={(v) => update('currency', v)} options={R1_CURRENCIES.map((c) => ({ value: c, label: c }))} />
        </FormField>
        <FormField label="Amount *" cols={2}>
          <input type="number" value={form.amount} onChange={(e) => update('amount', e.target.value)} placeholder="0" className="p-input" />
        </FormField>
        <FormField label="Expense Category" cols={3}>
          <SelectInput value={form.category} onChange={(v) => update('category', v)}
            options={[
              { value: '', label: 'Select…' },
              { value: 'Cleaning Supplies', label: 'Cleaning Supplies' },
              { value: 'Pharmacy Replenishment', label: 'Pharmacy Replenishment' },
              { value: 'Petty Cash', label: 'Petty Cash' },
              { value: 'Courier / Logistics', label: 'Courier / Logistics' },
              { value: 'Other', label: 'Other' },
            ]} />
        </FormField>
        <FormField label="Note" cols={3}>
          <input value={form.note} onChange={(e) => update('note', e.target.value)} placeholder="Brief explanation (demo)" className="p-input" />
        </FormField>
        <FormField label="Paid From" cols={2}>
          <SelectInput value={form.paidFrom} onChange={(v) => update('paidFrom', v)}
            options={[
              { value: 'Physical Cash Balance', label: 'Physical Cash Balance' },
              { value: 'Visa / Bank (blocked)', label: 'Visa / Bank — try (will fail)' },
            ]} />
        </FormField>

        <div className="lg:col-span-12 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap"
          style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
          <div className="text-xs flex items-center gap-2" style={{ color: 'var(--p-ink-700)' }}>
            <Wallet className="w-3.5 h-3.5" />
            <span>
              Available <strong>{form.currency}</strong> physical cash: <strong>{fmt(available)} {form.currency}</strong>
              {tryingVisaPath && <> · <span style={{ color: 'var(--p-mixed)' }}>(Visa / Bank cannot be used)</span></>}
            </span>
          </div>
          <button type="submit"
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-xs font-bold p-btn-primary no-print">
            <Plus className="w-3.5 h-3.5" /> Record Expense
          </button>
        </div>

        {feedback && (
          <div className="lg:col-span-12">
            <FeedbackBanner tone={feedback.tone} message={feedback.message} onDismiss={() => setFeedback(null)} />
          </div>
        )}
      </form>

      <div>
        <div className="text-xs font-bold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--p-ink-500)' }}>Recent Expenses</div>
        {recentExpenses.length === 0 ? (
          <div className="rounded-xl p-4 text-sm text-center" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>No recent expense entries.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--p-border)' }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: 'var(--p-surface-tint)' }}>
                  {['When', 'Currency', 'Amount', 'Category', 'Paid From', 'Note'].map((h) =>
                    <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {recentExpenses.map((e) => (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--p-border)' }}>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{fmtDMYHM(e.at)}</td>
                    <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--p-brand-mid)' }}>{e.currency}</td>
                    <td className="px-3 py-2.5 p-numeric font-bold" style={{ color: 'var(--p-mixed)' }}>−{fmt(e.amount)}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-700)' }}>{e.category}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-500)' }}>{e.paidFrom}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-600)' }}>{e.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function FeedbackBanner({ tone, message, onDismiss }) {
  const tones = {
    ok:     { bg: 'var(--p-finalized-soft)', fg: '#076D4A', border: '#9FD4BB', Icon: CheckCircle2 },
    warn:   { bg: 'var(--p-pending-soft)',   fg: '#A1672A', border: '#F0C97A', Icon: AlertTriangle },
    reject: { bg: 'var(--p-mixed-soft)',     fg: '#B14242', border: '#F0B5B5', Icon: ShieldOff },
  }[tone] || { bg: 'var(--p-surface-tint)', fg: 'var(--p-ink-700)', border: 'var(--p-border)', Icon: AlertTriangle }
  const Icon = tones.Icon
  return (
    <div className="rounded-xl px-3 py-2.5 flex items-start gap-2"
      style={{ background: tones.bg, color: tones.fg, border: `1px solid ${tones.border}` }}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="flex-1 text-[12px] leading-relaxed font-semibold">{message}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

// =====================================================================
// Cash handover — Actual Delivered starts EMPTY; Difference auto-computes
// =====================================================================
function HandoverStatement({ handover, editable }) {
  const { actions } = useDemoState()
  const [confirmClose, setConfirmClose] = useState(false)

  // P2C.R3 — cash handover focuses on physical cash. Visa rows kept for
  // continuity in seed data but are de-emphasised since Visa now has its
  // own per-transaction confirmation in Section B.
  return (
    <div className="p-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>
            {handover.locationName} · {handover.status === 'Closed' ? 'Closed Period' : 'Open Period'}
          </div>
          <div className="text-sm font-bold mt-0.5" style={{ color: 'var(--p-ink-900)' }}>
            {fmtDMYHM(handover.periodFrom)} → {handover.periodTo ? fmtDMYHM(handover.periodTo) : 'Ongoing'}
          </div>
          <div className="text-[11px] mt-1" style={{ color: 'var(--p-ink-500)' }}>
            Handed over by: <strong>{handover.handedOverBy}</strong> · Received by: <strong>{handover.receivedBy}</strong>
          </div>
        </div>
        <StatusPill tone={handover.status === 'Closed' ? 'finalized' : 'amber'}
          icon={handover.status === 'Closed' ? Lock : ClipboardCheck}>{handover.status}</StatusPill>
      </div>

      {editable && (
        <div className="rounded-xl p-3 flex items-start gap-2 text-[12px]"
          style={{ background: 'var(--p-brand-pale)', color: 'var(--p-ink-800)', border: '1px solid #BCCDE8' }}>
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Cash rows below — leave the cells blank until you physically count the cash at handover.
            Type the actual delivered amount and the system shows the difference vs. the Book amount: <strong>Match</strong> · <strong>Over (زياده)</strong> · <strong>Shortage (عجز)</strong>.
            Visa / Bank handover is now done transaction-by-transaction in Section B above.
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--p-border)' }}>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: 'var(--p-surface-tint)' }}>
              {['Type', 'Currency', 'Collections', 'Excess', 'Expenses', 'Net Book', 'Actual Delivered', 'Difference', 'Result'].map((h) =>
                <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {handover.rows.map((r, i) => (
              <DeliveryRow key={i} r={r} editable={editable && handover.status !== 'Closed'}
                onChange={(v) => actions.setHandoverDelivered(handover.id, i, v)} />
            ))}
          </tbody>
        </table>
      </div>

      {editable && handover.status !== 'Closed' && (
        <div className="flex items-center justify-end gap-2 no-print">
          {!confirmClose ? (
            <>
              <button className="h-10 px-4 rounded-full text-xs font-semibold p-btn-ghost inline-flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Save Draft
              </button>
              <button onClick={() => setConfirmClose(true)}
                className="h-10 px-5 rounded-full text-xs font-bold p-btn-primary inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Close & Confirm Handover
              </button>
            </>
          ) : (
            <>
              <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>Confirm close — this period will move to History.</span>
              <button onClick={() => setConfirmClose(false)} className="h-10 px-4 rounded-full text-xs font-semibold p-btn-ghost">Cancel</button>
              <button onClick={() => { actions.closeHandover(handover.id); setConfirmClose(false) }}
                className="h-10 px-5 rounded-full text-xs font-bold p-btn-primary inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Confirm Close
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function DeliveryRow({ r, editable, onChange }) {
  const isVisa = r.type === 'Visa / Bank'
  const delivered = r.actualDelivered
  const diff = delivered === null || delivered === undefined ? null : Number(delivered) - Number(r.netBook)
  const status = delivered === null || delivered === undefined ? null
    : Math.abs(diff) < 0.005 ? 'match'
    : diff > 0 ? 'over' : 'short'
  const statusTone = status === 'match' ? { bg: 'var(--p-finalized-soft)', fg: '#076D4A' }
    : status === 'over' ? { bg: 'var(--p-pending-soft)', fg: '#A1672A' }
    : status === 'short' ? { bg: 'var(--p-mixed-soft)', fg: '#B14242' }
    : null
  const statusLabel = status === 'match' ? 'Match · مطابق'
    : status === 'over' ? `Over · زياده ${fmt(diff)}`
    : status === 'short' ? `Shortage · عجز ${fmt(Math.abs(diff))}`
    : '—'
  return (
    <tr style={{ borderTop: '1px solid var(--p-border)', opacity: isVisa ? 0.65 : 1 }}>
      <td className="px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--p-ink-900)' }}>
        {r.type}
        {isVisa && <span className="ml-1.5 text-[9px] uppercase font-bold tracking-[0.1em]" style={{ color: 'var(--p-ink-400)' }}>see B</span>}
      </td>
      <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--p-brand-mid)' }}>{r.currency}</td>
      <td className="px-3 py-2.5 p-numeric" style={{ color: 'var(--p-cash)' }}>{fmt(r.collections)}</td>
      <td className="px-3 py-2.5 p-numeric" style={{ color: 'var(--p-ink-700)' }}>{fmt(r.excess)}</td>
      <td className="px-3 py-2.5 p-numeric" style={{ color: r.expenses === null ? 'var(--p-ink-400)' : 'var(--p-mixed)' }}>
        {r.expenses === null ? 'N/A' : fmt(r.expenses)}
      </td>
      <td className="px-3 py-2.5 p-numeric font-bold" style={{ color: 'var(--p-ink-900)' }}>{fmt(r.netBook)}</td>
      <td className="px-3 py-2.5">
        {editable ? (
          <input type="number" value={delivered ?? ''} onChange={(e) => onChange(e.target.value)}
            placeholder="Enter at handover"
            className="p-input h-9 w-32 p-numeric font-bold"
            style={{ background: 'white' }} />
        ) : (
          <span className="font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{delivered === null || delivered === undefined ? '—' : fmt(delivered)}</span>
        )}
      </td>
      <td className="px-3 py-2.5 p-numeric font-bold" style={{ color: diff === null ? 'var(--p-ink-400)' : diff === 0 ? 'var(--p-cash)' : diff > 0 ? '#A1672A' : 'var(--p-mixed)' }}>
        {diff === null ? '—' : (diff > 0 ? '+' : '') + fmt(diff)}
      </td>
      <td className="px-3 py-2.5">
        {statusTone ? (
          <span className="inline-flex items-center h-6 px-2 rounded-full text-[10px] font-bold"
            style={{ background: statusTone.bg, color: statusTone.fg }}>{statusLabel}</span>
        ) : (
          <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>—</span>
        )}
      </td>
    </tr>
  )
}

// =====================================================================
// Local UI helpers
// =====================================================================
function FormField({ label, cols = 12, children }) {
  const colsClass =
    cols === 2 ? 'lg:col-span-2' :
    cols === 3 ? 'lg:col-span-3' :
    cols === 4 ? 'lg:col-span-4' :
    cols === 6 ? 'lg:col-span-6' :
                 'lg:col-span-12'
  return (
    <div className={cn('flex flex-col gap-1.5', colsClass)}>
      <label className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</label>
      {children}
    </div>
  )
}
function SelectInput({ value, onChange, options }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="p-input appearance-none w-full pr-8">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
    </div>
  )
}
// =====================================================================
// EGP Combined Summary (Display-only) — R3.1
// Shows EGP Physical Cash + EGP Visa/Bank + Total. NOT used for expenses
// or cash handover — those still enforce strict channel separation.
// =====================================================================
function EgpCombinedCard({ combined }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
         style={{ background: 'linear-gradient(135deg, #E9EFF8 0%, #ffffff 100%)', border: '1px solid #BCCDE8' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center"
                style={{ background: 'var(--p-brand-mid)', color: 'white' }}>
            EGP
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-brand-mid)' }}>EGP Collections Summary</div>
            <div className="text-sm font-bold mt-0.5" style={{ color: 'var(--p-ink-900)' }}>EGP has TWO channels — same currency, different operational pools</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-bold"
              style={{ background: 'var(--p-gold-soft)', color: '#7A4F1F', border: '1px solid #F1E2C9' }}>
          Display-only
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl px-3 py-3" style={{ background: 'var(--p-cash-soft)', border: '1px solid #A8E6C7' }}>
          <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: '#0A8F62' }}>Physical Cash Available</div>
          <div className="mt-1 text-xl font-bold p-numeric" style={{ color: '#0A8F62' }}>{fmt(combined.physicalCashAvailable)} EGP</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>can fund EGP expenses · cash handover</div>
        </div>
        <div className="rounded-xl px-3 py-3" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
          <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: '#1E4180' }}>Visa / Bank Pending</div>
          <div className="mt-1 text-xl font-bold p-numeric" style={{ color: '#1E4180' }}>{fmt(combined.visaBankPending)} EGP</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>per-transaction handover · cannot fund cash expenses</div>
        </div>
        <div className="rounded-xl px-3 py-3 flex flex-col justify-between"
             style={{ background: 'linear-gradient(135deg, var(--p-brand-mid) 0%, #0A1B3D 100%)', color: 'white' }}>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold opacity-80">Total EGP Collected</div>
            <div className="mt-1 text-xl font-bold p-numeric">{fmt(combined.totalEgpCollected)} EGP</div>
          </div>
          <div className="text-[11px] opacity-80 mt-1">presentation total · channels remain separate operationally</div>
        </div>
      </div>
    </div>
  )
}

function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}
