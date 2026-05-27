import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Eye, ChevronRight, Plus, Clock, MapPin } from 'lucide-react'
import { PageHeader, PageBody } from '../../components/layout/PageHeader'
import { Card, Button, Badge, EmptyState } from '../../components/ui'
import { Input, Select } from '../../components/ui/Input'
import { CASES, DEMO_TODAY } from '../../data/mock'
import { useUserMode } from '../../context/UserModeContext'
import { fmtDate } from '../../lib/format'
import { FINANCIAL_TONE, ROUTE_TONE, STATUS_TONE, COVERAGE_TONE } from '../../components/ui/Badge'

export default function MyRecentCases() {
  const { user } = useUserMode()
  const [q, setQ] = useState('')
  const [range, setRange] = useState('all')
  const [fin, setFin] = useState('all')
  const [route, setRoute] = useState('all')
  const [status, setStatus] = useState('all')

  const branchCases = useMemo(() => CASES.filter((c) => c.branchId === user.branchId), [user.branchId])

  const list = useMemo(() => {
    const now = new Date('2026-05-26T23:59:00')
    return branchCases.filter((c) => {
      if (q) {
        const needle = q.toLowerCase()
        const hay = `${c.patient.name} ${c.ourRef} ${c.hotel || ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      if (fin !== 'all'   && c.financialType !== fin)   return false
      if (route !== 'all' && c.route !== route)         return false
      if (status !== 'all' && c.invoiceReadiness !== status) return false
      if (range !== 'all') {
        const d = new Date(c.visitDate)
        const days = (now - d) / 86400000
        if (range === 'today' && days > 1) return false
        if (range === '7d' && days > 7) return false
      }
      return true
    }).sort((a, b) => (b.visitDate || '').localeCompare(a.visitDate || ''))
  }, [branchCases, q, fin, route, status, range])

  return (
    <>
      <PageHeader
        title="My Cases"
        description={`All cases registered or received at your branch.`}
        actions={
          <Button as={Link} to="/clinic/new-case" leftIcon={<Plus className="w-4 h-4" />}>
            Register New Case
          </Button>
        }
      />
      <PageBody>
        {/* Filters */}
        <Card padding="sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <Input prefix={<Search className="w-4 h-4" />} placeholder="Search patient, Our Ref, or hotel…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
            </Select>
            <Select value={fin} onChange={(e) => setFin(e.target.value)}>
              <option value="all">All financial types</option>
              <option value="Pending">Pending</option>
              <option value="Cash">Cash</option>
              <option value="Insurance">Insurance</option>
            </Select>
            <Select value={route} onChange={(e) => setRoute(e.target.value)}>
              <option value="all">All routes</option>
              <option value="Direct">Direct</option>
              <option value="Transferred In">Transferred In</option>
              <option value="Transferred Out">Transferred Out</option>
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="Pending Information">Pending Information</option>
              <option value="Ready for Invoice">Ready for Invoice</option>
              <option value="Invoice Generated">Invoice Generated</option>
              <option value="Finalized">Finalized</option>
            </Select>
          </div>
        </Card>

        {list.length === 0 ? (
          <Card><EmptyState title="No cases match these filters" message="Try clearing filters or extending the date range." /></Card>
        ) : (
          <>
            {/* Desktop table */}
            <Card padding="none" className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-subtle/60 text-ink-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-start font-semibold px-5 py-2.5">Our Ref</th>
                      <th className="text-start font-semibold px-5 py-2.5">Patient</th>
                      <th className="text-start font-semibold px-5 py-2.5">Visit</th>
                      <th className="text-start font-semibold px-5 py-2.5">Hotel</th>
                      <th className="text-start font-semibold px-5 py-2.5">Route</th>
                      <th className="text-start font-semibold px-5 py-2.5">Financial</th>
                      <th className="text-start font-semibold px-5 py-2.5">Coverage</th>
                      <th className="text-end font-semibold px-5 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {list.map((c) => (
                      <tr key={c.id} className="row-hover">
                        <td className="px-5 py-3 font-mono text-[11px] text-ink-600 whitespace-nowrap">{c.ourRef}</td>
                        <td className="px-5 py-3">
                          <div className="font-medium text-ink-900">{c.patient.name}</div>
                          <div className="text-[11px] text-ink-400">{c.patient.nationality}</div>
                        </td>
                        <td className="px-5 py-3 text-ink-600 whitespace-nowrap">{fmtDate(c.visitDate)} {c.visitTime && <span className="text-[11px] text-ink-400">· {c.visitTime}</span>}</td>
                        <td className="px-5 py-3 text-ink-600">{c.hotel || '—'}</td>
                        <td className="px-5 py-3"><Badge tone={ROUTE_TONE[c.route] || 'neutral'} size="sm">{c.route}</Badge></td>
                        <td className="px-5 py-3"><Badge tone={FINANCIAL_TONE[c.financialType] || 'neutral'} size="sm">{c.financialType}</Badge></td>
                        <td className="px-5 py-3">
                          {c.financialType === 'Insurance' ? (
                            <Badge tone={COVERAGE_TONE[c.coverageStatus] || 'neutral'} size="sm">{c.coverageStatus || 'Details Pending'}</Badge>
                          ) : <span className="text-ink-300">—</span>}
                        </td>
                        <td className="px-5 py-3 text-end">
                          <Button as={Link} to={`/clinic/cases/${c.id}`} variant="ghost" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {list.map((c) => (
                <Link key={c.id} to={`/clinic/cases/${c.id}`} className="block">
                  <Card padding="sm" className="hover:shadow-card-hover">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center font-semibold text-xs">
                        {c.patient.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-ink-900 truncate">{c.patient.name}</div>
                          <ChevronRight className="w-4 h-4 text-ink-300 shrink-0" />
                        </div>
                        <div className="text-[11px] text-ink-400 font-mono">{c.ourRef}</div>
                        <div className="text-[11px] text-ink-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {c.hotel}
                          <span className="mx-1 text-ink-300">·</span>
                          <Clock className="w-3 h-3" /> {fmtDate(c.visitDate)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <Badge tone={ROUTE_TONE[c.route] || 'neutral'} size="sm">{c.route}</Badge>
                          <Badge tone={FINANCIAL_TONE[c.financialType] || 'neutral'} size="sm">{c.financialType}</Badge>
                          {c.financialType === 'Insurance' && (
                            <Badge tone={COVERAGE_TONE[c.coverageStatus] || 'neutral'} size="sm">{c.coverageStatus || 'Details Pending'}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="text-[11px] text-ink-400 flex items-center gap-1.5">
          <Filter className="w-3 h-3" /> Showing {list.length} of {branchCases.length} cases for this branch.
        </div>
      </PageBody>
    </>
  )
}
