import { useParams } from 'react-router-dom'
import { Banknote, CreditCard, Wallet } from 'lucide-react'
import { OperationalShell, IdentityHeader } from '../../../../premium/OperationalShell'
import { SectionHead, CurrencyTable, MiniKpi, DemoBanner, ReportActions } from '../../../../premium/p2cPrimitives'
import { casesForBranch, summarize } from '../../../../data/p2c'

function branchConfig(slug) {
  if (slug === 'al-kawther') return { id: 'al_kawther', name: 'Al-Kawther Branch', role: 'reception_kawther' }
  return { id: 'sheraton', name: 'Sheraton Branch', role: 'reception_sheraton' }
}

export default function ReceptionCollectionsP2C() {
  const { branchSlug } = useParams()
  const { id: branchId, name: branchName, role } = branchConfig(branchSlug)

  const all = casesForBranch(branchId)
  const { todayList, totals, collections, methodByCurrency } = summarize(all)

  const cashCases = todayList.filter((c) => c.financialType === 'Cash' && c.cashPayment)

  // Breakdown by payment method
  const byMethod = {}
  for (const c of cashCases) {
    const key = c.cashPayment.method
    byMethod[key] = (byMethod[key] || 0) + 1
  }

  const paymentMethods = Object.entries(byMethod)

  return (
    <OperationalShell role={role} active="collections"
      identityName={branchName} identitySub="Branch Reception Workspace">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-12 space-y-6">

        <DemoBanner>
          Demo branch collections — no FX conversion applied. Original currencies only.
        </DemoBanner>

        <IdentityHeader
          icon={Banknote}
          tone="gold"
          label="Branch Collections"
          subtitle={branchName}
          action={<ReportActions onPrint={() => {}} onExport={() => {}} />}
        />

        {/* KPIs */}
        <section>
          <SectionHead eyebrow="Today's Cash" title="Collection Summary" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MiniKpi label="Cash Cases" value={totals.cash} tone="cash" icon={Banknote} />
            <MiniKpi label="Insurance" value={totals.insurance} tone="teal" />
            <MiniKpi label="Pending" value={totals.pending} tone="pending" />
          </div>
        </section>

        {/* Collections by currency */}
        <section>
          <SectionHead
            eyebrow="By Currency"
            title="Collections Breakdown"
            description="No FX conversion — each currency tracked separately."
          />
          <CurrencyTable rows={collections} emptyText="No cash collected today at this branch." />
        </section>

        {/* Payment methods */}
        {paymentMethods.length > 0 && (
          <section>
            <SectionHead eyebrow="Payment Methods" title="By Method" />
            <div className="space-y-2">
              {paymentMethods.map(([method, count]) => (
                <div key={method} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                     style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--p-ink-700)' }}>
                    {method === 'Cash' ? <Wallet className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    <span className="font-semibold">{method}</span>
                  </div>
                  <span className="text-sm font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>
                    {count} case{count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cash case list */}
        {cashCases.length > 0 && (
          <section>
            <SectionHead eyebrow={`${cashCases.length} transactions`} title="Cash Case Log" />
            <div className="p-card overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--p-border)' }}>
                    {['Ref', 'Patient', 'Amount', 'Method', 'Status'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold"
                          style={{ color: 'var(--p-ink-500)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cashCases.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: i < cashCases.length - 1 ? '1px solid var(--p-border)' : 'none' }}>
                      <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--p-ink-400)' }}>{c.ourRef}</td>
                      <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</td>
                      <td className="px-3 py-2.5 p-numeric font-bold" style={{ color: 'var(--p-ink-900)' }}>
                        {c.cashPayment.amount} {c.cashPayment.currency}
                        {c.cashPayment.topUp && (
                          <span className="block text-[10px] font-normal" style={{ color: 'var(--p-ink-500)' }}>
                            + {c.cashPayment.topUp.amount} {c.cashPayment.topUp.currency}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-700)' }}>{c.cashPayment.method}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] font-semibold px-2 h-5 inline-flex items-center rounded-full ${
                          c.cashPayment.settlement === 'Paid' ? 'bg-[var(--p-finalized-soft)] text-[#076D4A]' : 'bg-[var(--p-pending-soft)] text-[#A1672A]'
                        }`}>{c.cashPayment.settlement}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {cashCases.length === 0 && (
          <div className="p-card p-6 text-center text-sm" style={{ color: 'var(--p-ink-500)' }}>
            No cash collected today at {branchName}.
          </div>
        )}

        <div className="text-center text-[11px]" style={{ color: 'var(--p-ink-400)' }}>
          Demo data only. No real financial records.
        </div>
      </div>
    </OperationalShell>
  )
}
