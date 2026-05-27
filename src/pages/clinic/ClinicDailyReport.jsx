import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, Building2, Printer, AlertTriangle, Banknote, CreditCard,
  Wallet, FileText, Clock, ArrowUpRight, ArrowDownRight, ClipboardList,
  Eye,
} from 'lucide-react'
import { PageHeader, PageBody } from '../../components/layout/PageHeader'
import { Card, Button, Badge, EmptyState, KpiCard } from '../../components/ui'
import { Select } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { aggregateForBranch, FACILITIES, getBranchName, getBranch } from '../../data/mock'
import { useUserMode } from '../../context/UserModeContext'
import { fmtDate, fmtMoney } from '../../lib/format'
import { FINANCIAL_TONE, STATUS_TONE, COVERAGE_TONE } from '../../components/ui/Badge'

/**
 * Clinic Daily Report — branch-only.
 *
 * Restricted: never shows admin-only fields (final invoice amount, service charge,
 * Manager controls, treasury). Mixed-currency banner appears when relevant.
 */
export default function ClinicDailyReport() {
  const { user } = useUserMode()
  const branch = getBranch(user.branchId)
  const facility = FACILITIES.find((f) => f.id === user.facilityId)
  const [date, setDate] = useState('2026-05-26')

  const agg = useMemo(() => aggregateForBranch(user.branchId, { date }), [user.branchId, date])

  const cashCurrencies = Object.keys(agg.cashInvoiceByCurrency)
  const collectionsCurrencies = new Set(Object.keys(agg.collections).map((k) => k.split('::')[1]))
  const allCurrenciesUsed = new Set([...cashCurrencies, ...collectionsCurrencies])
  const hasMixed = allCurrenciesUsed.size > 1

  return (
    <>
      <PageHeader
        title="My Branch Daily Report"
        description={`Operational summary for ${facility?.name} · ${branch?.name} — branch view only.`}
        actions={
          <Button variant="secondary" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
            Print Preview
          </Button>
        }
      >
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Date
            </div>
            <Select value={date} onChange={(e) => setDate(e.target.value)}>
              <option value="2026-05-26">Today · 26 May 2026</option>
              <option value="2026-05-25">25 May 2026</option>
              <option value="2026-05-24">24 May 2026</option>
              <option value="2026-05-23">23 May 2026</option>
            </Select>
          </div>
          <Card variant="subtle" padding="sm" className="sm:col-span-2">
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">Report for</div>
            <div className="text-sm font-semibold text-ink-900 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-ink-400" />
              {fmtDate(date)} · {facility?.name} · {branch?.name}
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
                <div className="font-semibold text-orange-900">Mixed-Currency Collections Present — Admin Review Required</div>
                <div className="text-xs text-orange-800/90 mt-0.5">No automatic conversion is performed by the Portal. Reconciliation is handled by admin outside the system.</div>
              </div>
            </div>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          <KpiCard label="Total Cases"        value={agg.totals.total}        icon={ClipboardList}  tone="navy" />
          <KpiCard label="Cash"               value={agg.totals.cash}         icon={Wallet}         tone="emerald" />
          <KpiCard label="Insurance"          value={agg.totals.insurance}    icon={FileText}       tone="sky" />
          <KpiCard label="Pending"            value={agg.totals.pending}      icon={Clock}          tone="amber" />
          <KpiCard label="Transfers Sent"     value={agg.totals.transfersOut} icon={ArrowUpRight}   tone="violet" />
          <KpiCard label="Transfers Received" value={agg.totals.transfersIn}  icon={ArrowDownRight} tone="violet" />
        </div>

        {/* Cases Registered Today */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border">
            <SectionHeader icon={ClipboardList} title="Cases Registered" description={`At ${branch?.name} for ${fmtDate(date)}.`} />
          </div>
          {agg.list.length === 0 ? (
            <div className="p-4"><EmptyState title="No cases registered on this date" /></div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-subtle/60 text-ink-500 text-[11px] uppercase tracking-wide">
                    <tr>
                      <th className="text-start font-semibold px-5 py-2.5">Our Ref</th>
                      <th className="text-start font-semibold px-5 py-2.5">Patient</th>
                      <th className="text-start font-semibold px-5 py-2.5">Time</th>
                      <th className="text-start font-semibold px-5 py-2.5">Route</th>
                      <th className="text-start font-semibold px-5 py-2.5">Financial</th>
                      <th className="text-end font-semibold px-5 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {agg.list.map((c) => (
                      <tr key={c.id} className="row-hover">
                        <td className="px-5 py-3 font-mono text-[11px] text-ink-700 whitespace-nowrap">{c.ourRef}</td>
                        <td className="px-5 py-3 font-medium text-ink-900">{c.patient.name}</td>
                        <td className="px-5 py-3 text-ink-600 whitespace-nowrap">{c.visitTime || '—'}</td>
                        <td className="px-5 py-3"><Badge tone={c.route === 'Direct' ? 'navy' : 'transferred'} size="sm">{c.route}</Badge></td>
                        <td className="px-5 py-3"><Badge tone={FINANCIAL_TONE[c.financialType] || 'neutral'} size="sm">{c.financialType}</Badge></td>
                        <td className="px-5 py-3 text-end">
                          <Button as={Link} to={`/clinic/cases/${c.id}`} variant="ghost" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>Open</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="md:hidden divide-y divide-border">
                {agg.list.map((c) => (
                  <li key={c.id}>
                    <Link to={`/clinic/cases/${c.id}`} className="flex items-center justify-between gap-2 p-3.5 hover:bg-subtle">
                      <div className="min-w-0">
                        <div className="font-semibold text-ink-900 text-sm truncate">{c.patient.name}</div>
                        <div className="text-[11px] text-ink-400 font-mono">{c.ourRef}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <Badge tone={c.route === 'Direct' ? 'navy' : 'transferred'} size="sm">{c.route}</Badge>
                          <Badge tone={FINANCIAL_TONE[c.financialType] || 'neutral'} size="sm">{c.financialType}</Badge>
                        </div>
                      </div>
                      <span className="text-[11px] text-ink-500 shrink-0">{c.visitTime}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        {/* Cash + Collections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center"><Banknote className="w-4 h-4" /></div>
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Cash Invoice Totals by Original Currency</h3>
                <p className="text-xs text-ink-500">No conversion applied.</p>
              </div>
            </div>
            {cashCurrencies.length === 0 ? (
              <div className="p-4"><EmptyState title="No cash invoices on this date" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-subtle/60 text-ink-500 text-[11px] uppercase tracking-wide">
                  <tr><th className="text-start px-5 py-2.5 font-semibold">Currency</th><th className="text-end px-5 py-2.5 font-semibold">Total Invoiced</th></tr>
                </thead>
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
                <h3 className="text-sm font-semibold text-ink-900">Collected Payments by Method + Currency</h3>
                <p className="text-xs text-ink-500">Each row is one method × currency bucket.</p>
              </div>
            </div>
            {Object.keys(agg.collections).length === 0 ? (
              <div className="p-4"><EmptyState title="No collected payments on this date" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-subtle/60 text-ink-500 text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-start px-5 py-2.5 font-semibold">Method</th>
                    <th className="text-start px-5 py-2.5 font-semibold">Currency</th>
                    <th className="text-end px-5 py-2.5 font-semibold">Total Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(agg.collections).map(([key, val]) => {
                    const [method, cur] = key.split('::')
                    return (
                      <tr key={key}>
                        <td className="px-5 py-3 text-ink-700">{method}</td>
                        <td className="px-5 py-3 font-medium text-ink-700">{cur}</td>
                        <td className="px-5 py-3 text-end font-semibold tabular-nums text-ink-900">{fmtMoney(val, cur)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Insurance + Transfers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border">
              <SectionHeader icon={FileText} title="Insurance Cases Logged" description="Insurance cases registered on this date." />
            </div>
            {agg.insuranceCasesToday.length === 0 ? (
              <div className="p-4"><EmptyState title="No insurance cases" /></div>
            ) : (
              <ul className="divide-y divide-border">
                {agg.insuranceCasesToday.map((c) => (
                  <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink-900 truncate">{c.patient.name}</div>
                      <div className="text-[11px] text-ink-400 font-mono">{c.ourRef} · {c.insuranceCompany}</div>
                    </div>
                    <Badge tone={COVERAGE_TONE[c.coverageStatus] || 'neutral'} size="sm">{c.coverageStatus}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border">
              <SectionHeader icon={ArrowUpRight} title="Transfer Activity" description="Movement involving this branch on this date." />
            </div>
            {agg.transfersToday.length === 0 ? (
              <div className="p-4"><EmptyState title="No transfer movement" /></div>
            ) : (
              <ul className="divide-y divide-border">
                {agg.transfersToday.map((c) => (
                  <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink-900 truncate">{c.patient.name}</div>
                      <div className="text-[11px] text-ink-400 font-mono">{c.ourRef}</div>
                      <div className="text-[11px] text-ink-500 mt-0.5">
                        {c.transferFromName || getBranchName(c.branchId)} → {c.transferToName || getBranchName(c.branchId)}
                      </div>
                    </div>
                    <Badge tone="transferred" size="sm">{c.route}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="text-[11px] text-ink-400 text-center">
          Branch-only report — final invoice amounts, service charge, and Manager workflow are admin-only and not shown here.
        </div>
      </PageBody>
    </>
  )
}
