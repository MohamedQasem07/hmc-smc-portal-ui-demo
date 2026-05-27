import { useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  Calendar, Building2, Printer, ChevronLeft, AlertTriangle, Banknote,
  CreditCard, Wallet, FileText, Clock, ArrowUpRight, ArrowDownRight,
  ClipboardList, FileCheck2, MapPin, Eye,
} from 'lucide-react'
import { PageHeader, PageBody } from '../../components/layout/PageHeader'
import { Card, Button, Badge, EmptyState, KpiCard } from '../../components/ui'
import { Select } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import {
  aggregateForBranch, FACILITIES, getBranch, getBranchName, BRANCHES, CASES,
} from '../../data/mock'
import { fmtDate, fmtMoney, fmtRelative } from '../../lib/format'
import {
  FINANCIAL_TONE, ROUTE_TONE, STATUS_TONE, COVERAGE_TONE,
} from '../../components/ui/Badge'

/**
 * BranchReport — admin deep-dive for a single branch.
 * Accessible from Admin Dashboard branch panel and Daily Report branch table.
 */
export default function BranchReport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const branch = getBranch(id)
  const facility = FACILITIES.find((f) => f.id === branch?.facility)
  const [date, setDate] = useState('2026-05-26')

  const agg = useMemo(() => aggregateForBranch(id, { date }), [id, date])
  const allTimeForBranch = useMemo(() => CASES.filter((c) => c.branchId === id).sort((a, b) => (b.visitDate || '').localeCompare(a.visitDate || '')), [id])

  if (!branch) {
    return (
      <PageBody>
        <Card><EmptyState title="Branch not found" message="No branch in the demo dataset matches this ID." /></Card>
      </PageBody>
    )
  }

  const cashCurrencies = Object.keys(agg.cashInvoiceByCurrency)
  const collectionsCurrencies = new Set(Object.keys(agg.collections).map((k) => k.split('::')[1]))
  const hasMixed = new Set([...cashCurrencies, ...collectionsCurrencies]).size > 1

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {branch.name}
            <Badge tone="navy" size="sm"><Building2 className="w-3 h-3" /> {facility?.name} · {branch.city}</Badge>
          </span>
        }
        description={<>Branch-specific operational report — date-scoped activity below; lifetime activity in the bottom panel.</>}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />}>Back</Button>
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
          <Card variant="subtle" padding="sm" className="sm:col-span-2">
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">Report scope</div>
            <div className="text-sm font-semibold text-ink-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-ink-400" /> {fmtDate(date)} · {facility?.name} · {branch.name}
            </div>
          </Card>
        </div>
      </PageHeader>

      <PageBody>
        {hasMixed && (
          <Card padding="sm" className="border-orange-200 bg-orange-50/70">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-orange-900">Mixed-Currency Collections Present at this branch</div>
                <div className="text-xs text-orange-800/90 mt-0.5">No automatic conversion. Each currency is reported separately.</div>
              </div>
            </div>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
          <KpiCard label="Total Cases"       value={agg.totals.total}        icon={ClipboardList}  tone="navy" />
          <KpiCard label="Cash"              value={agg.totals.cash}         icon={Wallet}         tone="emerald" />
          <KpiCard label="Insurance"         value={agg.totals.insurance}    icon={FileText}       tone="sky" />
          <KpiCard label="Pending"           value={agg.totals.pending}      icon={Clock}          tone="amber" />
          <KpiCard label="Transfers Out"     value={agg.totals.transfersOut} icon={ArrowUpRight}   tone="violet" />
          <KpiCard label="Transfers In"      value={agg.totals.transfersIn}  icon={ArrowDownRight} tone="violet" />
          <KpiCard label="Ready for Invoice" value={agg.totals.ready}        icon={FileCheck2}     tone="sky" />
          <KpiCard label="Invoice Generated" value={agg.totals.invoiced}     icon={FileCheck2}     tone="emerald" />
        </div>

        {/* Cash + Collections side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center"><Banknote className="w-4 h-4" /></div>
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Cash Invoice Totals (this branch)</h3>
                <p className="text-xs text-ink-500">By original currency.</p>
              </div>
            </div>
            {cashCurrencies.length === 0 ? <div className="p-4"><EmptyState title="No cash invoices on this date" /></div> : (
              <table className="w-full text-sm">
                <thead className="bg-subtle/60 text-ink-500 text-[11px] uppercase tracking-wide"><tr><th className="text-start px-5 py-2.5 font-semibold">Currency</th><th className="text-end px-5 py-2.5 font-semibold">Total Invoiced</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {cashCurrencies.map((cur) => (
                    <tr key={cur}>
                      <td className="px-5 py-3 font-medium text-ink-700">{cur}</td>
                      <td className="px-5 py-3 text-end font-semibold tabular-nums text-ink-900">{fmtMoney(agg.cashInvoiceByCurrency[cur], cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center"><CreditCard className="w-4 h-4" /></div>
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Collected Payments (this branch)</h3>
                <p className="text-xs text-ink-500">By method and currency.</p>
              </div>
            </div>
            {Object.keys(agg.collections).length === 0 ? <div className="p-4"><EmptyState title="No collected payments on this date" /></div> : (
              <table className="w-full text-sm">
                <thead className="bg-subtle/60 text-ink-500 text-[11px] uppercase tracking-wide"><tr><th className="text-start px-5 py-2.5 font-semibold">Method · Currency</th><th className="text-end px-5 py-2.5 font-semibold">Total Collected</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(agg.collections).map(([key, val]) => {
                    const [method, cur] = key.split('::')
                    return <tr key={key}><td className="px-5 py-3 text-ink-700">{method} · {cur}</td><td className="px-5 py-3 text-end font-semibold tabular-nums text-ink-900">{fmtMoney(val, cur)}</td></tr>
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Branch lifetime cases */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border">
            <SectionHeader icon={ClipboardList} title="All Cases at this Branch" description={`All time · ${allTimeForBranch.length} records in the demo dataset.`} />
          </div>
          {allTimeForBranch.length === 0 ? <div className="p-4"><EmptyState title="No cases for this branch" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle/60 text-ink-500 text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-start px-4 py-2.5 font-semibold">Our Ref</th>
                    <th className="text-start px-4 py-2.5 font-semibold">Visit</th>
                    <th className="text-start px-4 py-2.5 font-semibold">Patient</th>
                    <th className="text-start px-4 py-2.5 font-semibold">Route</th>
                    <th className="text-start px-4 py-2.5 font-semibold">Financial</th>
                    <th className="text-start px-4 py-2.5 font-semibold">Coverage</th>
                    <th className="text-start px-4 py-2.5 font-semibold">Readiness</th>
                    <th className="text-end px-4 py-2.5 font-semibold">Final</th>
                    <th className="text-start px-4 py-2.5 font-semibold">Updated</th>
                    <th className="text-end px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allTimeForBranch.map((c) => {
                    const last = c.history?.length ? c.history[c.history.length - 1].at : c.visitDate
                    return (
                      <tr key={c.id} className="row-hover">
                        <td className="px-4 py-3 font-mono text-[11px] text-ink-700 whitespace-nowrap">{c.ourRef}</td>
                        <td className="px-4 py-3 text-ink-600 whitespace-nowrap">{fmtDate(c.visitDate)}</td>
                        <td className="px-4 py-3 font-medium text-ink-900">{c.patient.name}</td>
                        <td className="px-4 py-3"><Badge tone={ROUTE_TONE[c.route] || 'neutral'} size="sm">{c.route}</Badge></td>
                        <td className="px-4 py-3"><Badge tone={FINANCIAL_TONE[c.financialType] || 'neutral'} size="sm">{c.financialType}</Badge></td>
                        <td className="px-4 py-3">
                          {c.financialType === 'Insurance' ? <Badge tone={COVERAGE_TONE[c.coverageStatus] || 'neutral'} size="sm">{c.coverageStatus}</Badge> : <span className="text-ink-300">—</span>}
                        </td>
                        <td className="px-4 py-3"><Badge tone={STATUS_TONE[c.invoiceReadiness] || 'neutral'} size="sm">{c.invoiceReadiness}</Badge></td>
                        <td className="px-4 py-3 text-end whitespace-nowrap font-medium text-ink-900">{c.finalInvoiceAmount ? fmtMoney(c.finalInvoiceAmount, c.finalCurrency || c.currency) : '—'}</td>
                        <td className="px-4 py-3 text-[11px] text-ink-500 whitespace-nowrap">{fmtRelative(last)}</td>
                        <td className="px-4 py-3 text-end">
                          <Button as={Link} to={`/admin/cases/${c.id}`} variant="ghost" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>Open</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="text-[11px] text-ink-400 text-center">
          Branch report scope — demo only. Cross-branch and cross-facility reports remain under the Admin Daily Report.
        </div>
      </PageBody>
    </>
  )
}
