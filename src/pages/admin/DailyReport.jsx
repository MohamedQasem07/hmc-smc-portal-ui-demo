import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, Building2, Printer, Download, AlertTriangle, Banknote, CreditCard,
  Wallet, FileText, Clock, ArrowUpRight, ArrowDownRight, LayoutDashboard,
  FileCheck2, ClipboardList, BarChart3, Eye,
} from 'lucide-react'
import { PageHeader, PageBody } from '../../components/layout/PageHeader'
import { Card, Button, Badge, EmptyState, KpiCard } from '../../components/ui'
import { Select } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { BRANCHES, FACILITIES, aggregateForAdmin, getBranchName } from '../../data/mock'
import { fmtDate, fmtMoney } from '../../lib/format'
import { COVERAGE_TONE, STATUS_TONE } from '../../components/ui/Badge'

export default function DailyReport() {
  const [date, setDate] = useState('2026-05-26')
  const [facility, setFacility] = useState('all')
  const [branch, setBranch] = useState('all')

  const branchesInFacility = facility === 'all' ? BRANCHES : BRANCHES.filter((b) => b.facility === facility)

  const agg = useMemo(
    () => aggregateForAdmin({ date, facilityId: facility, branchId: branch }),
    [date, facility, branch],
  )

  const cashCurrencies = Object.keys(agg.cashInvoiceByCurrency)
  const collectionsCurrencies = new Set(Object.keys(agg.collections).map((k) => k.split('::')[1]))
  const allCurrencies = new Set([...cashCurrencies, ...collectionsCurrencies])
  const hasMixed = allCurrencies.size > 1

  const pendingQueue = agg.list.filter((c) => c.financialType === 'Pending' || c.invoiceReadiness === 'Pending Information')

  return (
    <>
      <PageHeader
        title="Daily Report"
        description="Operational summary for the selected date — KPIs, branch comparison, cash totals per currency, insurance activity, transfer movement, invoice workflow."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />}>Export view</Button>
            <Button variant="secondary" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print Preview</Button>
          </div>
        }
      >
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1.5 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Date</div>
            <Select value={date} onChange={(e) => setDate(e.target.value)}>
              <option value="2026-05-26">Today · 26 May 2026</option>
              <option value="2026-05-25">25 May 2026</option>
              <option value="2026-05-24">24 May 2026</option>
              <option value="2026-05-23">23 May 2026</option>
            </Select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1.5 flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Facility</div>
            <Select value={facility} onChange={(e) => { setFacility(e.target.value); setBranch('all') }}>
              <option value="all">All facilities</option>
              {FACILITIES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1.5 flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Branch</div>
            <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="all">All branches</option>
              {branchesInFacility.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
        </div>
      </PageHeader>

      <PageBody>
        {hasMixed && (
          <Card padding="sm" className="border-orange-200 bg-orange-50/70">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-orange-900">Mixed-Currency Collections Present — Admin Review Required</div>
                <div className="text-xs text-orange-800/90 mt-0.5">No exchange-rate conversion. Treasury reconciliation is handled outside the system.</div>
              </div>
            </div>
          </Card>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
          <KpiCard label="Total Cases"        value={agg.totals.total}         icon={LayoutDashboard} tone="navy" />
          <KpiCard label="Cash"               value={agg.totals.cash}          icon={Wallet}          tone="emerald" />
          <KpiCard label="Insurance"          value={agg.totals.insurance}     icon={FileText}        tone="sky" />
          <KpiCard label="Pending"            value={agg.totals.pending}       icon={Clock}           tone="amber" />
          <KpiCard label="Transfers Sent"     value={agg.totals.transfersOut}  icon={ArrowUpRight}    tone="violet" />
          <KpiCard label="Transfers Received" value={agg.totals.transfersIn}   icon={ArrowDownRight}  tone="violet" />
          <KpiCard label="Ready for Invoice"  value={agg.totals.ready}         icon={FileCheck2}      tone="sky" />
          <KpiCard label="Invoice Generated"  value={agg.totals.invoiced}      icon={FileCheck2}      tone="emerald" />
        </div>

        {/* Branch Summary Comparison */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center"><BarChart3 className="w-4 h-4" /></div>
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Branch Summary Comparison</h3>
                <p className="text-xs text-ink-500">Same date and facility filter applied. Click a branch to open its dedicated report.</p>
              </div>
            </div>
          </div>
          {agg.branchComparison.length === 0 ? (
            <div className="p-4"><EmptyState title="No branch activity for this filter" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle/60 text-ink-500 text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-start font-semibold px-4 py-2.5">Branch</th>
                    <th className="text-end font-semibold px-4 py-2.5">Total</th>
                    <th className="text-end font-semibold px-4 py-2.5">Cash</th>
                    <th className="text-end font-semibold px-4 py-2.5">Insurance</th>
                    <th className="text-end font-semibold px-4 py-2.5">Pending</th>
                    <th className="text-end font-semibold px-4 py-2.5">Trans. In</th>
                    <th className="text-end font-semibold px-4 py-2.5">Trans. Out</th>
                    <th className="text-end font-semibold px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agg.branchComparison.map((b) => (
                    <tr key={b.branchId} className="row-hover">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900">{b.branchName}</div>
                        <div className="text-[11px] text-ink-400 uppercase">{b.facilityId}</div>
                      </td>
                      <td className="px-4 py-3 text-end font-semibold tabular-nums">{b.total}</td>
                      <td className="px-4 py-3 text-end tabular-nums">{b.cash}</td>
                      <td className="px-4 py-3 text-end tabular-nums">{b.insurance}</td>
                      <td className="px-4 py-3 text-end tabular-nums">{b.pending}</td>
                      <td className="px-4 py-3 text-end tabular-nums text-violet-700">{b.transfersIn}</td>
                      <td className="px-4 py-3 text-end tabular-nums text-violet-700">{b.transfersOut}</td>
                      <td className="px-4 py-3 text-end">
                        <Button as={Link} to={`/admin/branches/${b.branchId}`} variant="ghost" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>Open</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Cash + Collections + Invoice Workflow */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <CurrencyTable
            title="Cash Invoice Totals"
            subtitle="By invoice currency. No conversion applied."
            icon={Banknote}
            tone="emerald"
            empty="No cash invoices for this filter."
            rows={Object.entries(agg.cashInvoiceByCurrency).map(([cur, val]) => ({ a: cur, b: fmtMoney(val, cur) }))}
            headers={['Currency', 'Total Invoiced']}
          />
          <CurrencyTable
            title="Collected Payments"
            subtitle="By method and currency."
            icon={CreditCard}
            tone="sky"
            empty="No collections for this filter."
            rows={Object.entries(agg.collections).map(([key, val]) => {
              const [method, cur] = key.split('::')
              return { a: `${method} · ${cur}`, b: fmtMoney(val, cur) }
            })}
            headers={['Method · Currency', 'Total Collected']}
          />
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center"><FileCheck2 className="w-4 h-4" /></div>
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Invoice Workflow Status</h3>
                <p className="text-xs text-ink-500">Distribution of cases across workflow states.</p>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {Object.entries(agg.invoiceWorkflow).map(([state, n]) => (
                <li key={state} className="px-5 py-2.5 flex items-center justify-between">
                  <Badge tone={STATUS_TONE[state] || 'neutral'} size="sm">{state}</Badge>
                  <span className="text-sm font-semibold tabular-nums text-ink-900">{n}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Pending Classification Queue + Insurance + Transfers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border">
              <SectionHeader icon={Clock} title="Pending Classification Queue" description="Cases needing financial classification or info." />
            </div>
            {pendingQueue.length === 0 ? (
              <div className="p-4"><EmptyState title="Nothing pending for this filter" /></div>
            ) : (
              <ul className="divide-y divide-border">
                {pendingQueue.map((c) => (
                  <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <Link to={`/admin/cases/${c.id}`} className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink-900 truncate">{c.patient.name}</div>
                      <div className="text-[11px] text-ink-400 font-mono">{c.ourRef} · {getBranchName(c.branchId)}</div>
                    </Link>
                    <Badge tone="warning" size="sm">{c.financialType}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border">
              <SectionHeader icon={FileText} title="Insurance Cases Logged" description="Insurance cases registered for this filter." />
            </div>
            {agg.insuranceCasesToday.length === 0 ? (
              <div className="p-4"><EmptyState title="No insurance cases" /></div>
            ) : (
              <ul className="divide-y divide-border">
                {agg.insuranceCasesToday.map((c) => (
                  <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <Link to={`/admin/cases/${c.id}`} className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink-900 truncate">{c.patient.name}</div>
                      <div className="text-[11px] text-ink-400 font-mono">{c.ourRef} · {c.insuranceCompany}</div>
                    </Link>
                    <Badge tone={COVERAGE_TONE[c.coverageStatus] || 'neutral'} size="sm">{c.coverageStatus}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border">
              <SectionHeader icon={ArrowUpRight} title="Transfer Activity" description="Movement for this filter." />
            </div>
            {agg.transfersToday.length === 0 ? (
              <div className="p-4"><EmptyState title="No transfers for this filter" /></div>
            ) : (
              <ul className="divide-y divide-border">
                {agg.transfersToday.map((c) => (
                  <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <Link to={`/admin/cases/${c.id}`} className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink-900 truncate">{c.patient.name}</div>
                      <div className="text-[11px] text-ink-400 font-mono">{c.ourRef}</div>
                      <div className="text-[11px] text-ink-500 mt-0.5">
                        {c.transferFromName || getBranchName(c.branchId)} → {c.transferToName || getBranchName(c.branchId)}
                      </div>
                    </Link>
                    <Badge tone="transferred" size="sm">{c.route}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="text-[11px] text-ink-400 text-center">
          Demo report — no real treasury, no real accounting, no exchange-rate conversion.
        </div>
      </PageBody>
    </>
  )
}

function CurrencyTable({ title, subtitle, icon: Icon, tone, headers, rows, empty }) {
  const toneBg = {
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    navy: 'bg-navy-50 text-navy-700',
  }[tone] || 'bg-navy-50 text-navy-700'
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-border flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneBg}`}><Icon className="w-4 h-4" /></div>
        <div>
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          <p className="text-xs text-ink-500">{subtitle}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="p-4"><EmptyState title={empty} /></div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-subtle/60 text-ink-500 text-[11px] uppercase tracking-wide">
            <tr><th className="text-start px-5 py-2.5 font-semibold">{headers[0]}</th><th className="text-end px-5 py-2.5 font-semibold">{headers[1]}</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-5 py-3 font-medium text-ink-700">{r.a}</td>
                <td className="px-5 py-3 text-end font-semibold tabular-nums text-ink-900">{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
