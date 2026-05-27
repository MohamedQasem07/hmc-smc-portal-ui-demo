import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Filter, Eye, ChevronRight, ChevronDown, Download, Calendar,
  ClipboardList, FileSpreadsheet, ListFilter, CheckCircle2, Building2,
  Hash, Stethoscope, Wallet, FileText, MapPin,
} from 'lucide-react'
import { PageHeader, PageBody } from '../../components/layout/PageHeader'
import { Card, Button, Badge, EmptyState, Tabs, BulkActionBar } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import { Input, Select } from '../../components/ui/Input'
import {
  CASES, BRANCHES, FACILITIES, INSURANCE_COMPANIES, INVOICE_READINESS, CASE_STATUSES,
  COVERAGE_STATUSES, getBranchName,
} from '../../data/mock'
import { fmtDate, fmtMoney, fmtRelative } from '../../lib/format'
import {
  FINANCIAL_TONE, ROUTE_TONE, STATUS_TONE, SOURCE_TONE, COVERAGE_TONE,
} from '../../components/ui/Badge'
import { cn } from '../../lib/cn'

/**
 * Cases Master — P1 unified workspace.
 * Tabs: All / Current Portal / Historical Legacy
 *
 * Major P1 upgrades:
 *  - Facility + Coverage Status columns
 *  - Inline status / readiness / coverage editing with toasts
 *  - Row selection + sticky BulkActionBar with mock bulk actions
 *  - Expanded filters incl. date range and coverage
 *  - Expandable cards on mobile (no horizontal scroll)
 */

export default function CasesMasterView() {
  const { toast } = useToast()
  const [overrides, setOverrides] = useState({})
  const merged = useMemo(() => CASES.map((c) => ({ ...c, ...(overrides[c.id] || {}) })), [overrides])

  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [year, setYear] = useState('all')
  const [source, setSource] = useState('all')
  const [facility, setFacility] = useState('all')
  const [branch, setBranch] = useState('all')
  const [route, setRoute] = useState('all')
  const [fin, setFin] = useState('all')
  const [status, setStatus] = useState('all')
  const [readiness, setReadiness] = useState('all')
  const [coverage, setCoverage] = useState('all')
  const [insCo, setInsCo] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const [selected, setSelected] = useState(new Set())

  const branchesInFacility = facility === 'all' ? BRANCHES : BRANCHES.filter((b) => b.facility === facility)

  const list = useMemo(() => {
    return merged.filter((c) => {
      if (tab === 'portal' && c.source !== 'Portal') return false
      if (tab === 'legacy' && c.source === 'Portal') return false

      if (q) {
        const needle = q.toLowerCase()
        const hay = `${c.patient?.name || ''} ${c.ourRef || ''} ${c.hotel || ''} ${c.insuranceRef || ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      if (year !== 'all') {
        const yr = (c.visitDate || '').slice(0, 4)
        if (year === 'portal' && c.source !== 'Portal') return false
        if (year !== 'portal' && yr !== year) return false
      }
      if (source !== 'all' && c.source !== source) return false
      if (facility !== 'all' && c.facilityId !== facility) return false
      if (branch !== 'all' && c.branchId !== branch) return false
      if (route !== 'all' && c.route !== route) return false
      if (fin !== 'all' && c.financialType !== fin) return false
      if (status !== 'all' && c.caseStatus !== status) return false
      if (readiness !== 'all' && c.invoiceReadiness !== readiness) return false
      if (coverage !== 'all' && c.coverageStatus !== coverage) return false
      if (insCo !== 'all' && c.insuranceCompany !== insCo) return false
      if (dateFrom && (c.visitDate || '').slice(0, 10) < dateFrom) return false
      if (dateTo   && (c.visitDate || '').slice(0, 10) > dateTo)   return false
      return true
    }).sort((a, b) => (b.visitDate || '').localeCompare(a.visitDate || ''))
  }, [merged, tab, q, year, source, facility, branch, route, fin, status, readiness, coverage, insCo, dateFrom, dateTo])

  function updateField(caseId, field, value) {
    const prev = merged.find((c) => c.id === caseId)
    if (!prev || prev[field] === value) return
    setOverrides((o) => ({ ...o, [caseId]: { ...(o[caseId] || {}), [field]: value } }))
    toast({
      kind: 'success',
      title: 'Status updated — demo only',
      message: `${prev.ourRef} · ${field}: ${prev[field] || '—'} → ${value}`,
      duration: 3000,
    })
  }

  function clearFilters() {
    setQ(''); setYear('all'); setSource('all'); setFacility('all'); setBranch('all')
    setRoute('all'); setFin('all'); setStatus('all'); setReadiness('all')
    setCoverage('all'); setInsCo('all'); setDateFrom(''); setDateTo('')
  }

  function toggleSelect(id) {
    setSelected((s) => {
      const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next
    })
  }
  function toggleSelectAll() {
    setSelected((s) => {
      if (s.size === list.length) return new Set()
      return new Set(list.map((c) => c.id))
    })
  }
  function clearSelection() { setSelected(new Set()) }

  function bulkMarkReviewed() {
    setOverrides((o) => {
      const next = { ...o }
      selected.forEach((id) => { next[id] = { ...(next[id] || {}), caseStatus: 'Reviewed' } })
      return next
    })
    toast({ kind: 'success', title: `${selected.size} cases marked Reviewed — demo only` })
    clearSelection()
  }
  function bulkAssignStatus() {
    setOverrides((o) => {
      const next = { ...o }
      selected.forEach((id) => { next[id] = { ...(next[id] || {}), invoiceReadiness: 'Ready for Invoice' } })
      return next
    })
    toast({ kind: 'success', title: `${selected.size} cases set to Ready for Invoice — demo only` })
    clearSelection()
  }
  function bulkExport() {
    toast({ kind: 'info', title: 'Export concept — demo only', message: `Would export ${selected.size} cases as CSV / XLSX.` })
  }

  return (
    <>
      <PageHeader
        title="Cases Master"
        description="Unified workspace for current Portal cases and historical records — Excel-better filtering, inline edits, and bulk actions."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />}>Export (demo)</Button>
            <Button variant="secondary" size="sm" leftIcon={<FileSpreadsheet className="w-4 h-4" />}>Open as sheet (demo)</Button>
          </div>
        }
      >
        <div className="mt-4">
          <Tabs value={tab} onChange={setTab} items={[
            { id: 'all',    label: 'All',                 count: merged.length },
            { id: 'portal', label: 'Current Portal',      count: merged.filter((c) => c.source === 'Portal').length },
            { id: 'legacy', label: 'Historical / Legacy', count: merged.filter((c) => c.source !== 'Portal').length },
          ]} />
        </div>
      </PageHeader>

      <PageBody>
        {/* Filters */}
        <Card padding="sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <div className="col-span-2 sm:col-span-2 lg:col-span-2">
              <Input prefix={<Search className="w-4 h-4" />} placeholder="Search patient / Our Ref / Insurance Ref / Hotel" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="all">All years</option>
              <option value="portal">Portal · current</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </Select>
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="all">All sources</option>
              <option value="Portal">Portal</option>
              <option value="Legacy 2024">Legacy 2024</option>
              <option value="Legacy 2025">Legacy 2025</option>
              <option value="Legacy 2026">Legacy 2026</option>
              <option value="Manual Admin Entry">Manual Admin Entry</option>
            </Select>
            <Select value={facility} onChange={(e) => { setFacility(e.target.value); setBranch('all') }}>
              <option value="all">All facilities</option>
              {FACILITIES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
            <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="all">All branches</option>
              {branchesInFacility.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Select value={fin} onChange={(e) => setFin(e.target.value)}>
              <option value="all">All financial</option>
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
            <Select value={coverage} onChange={(e) => setCoverage(e.target.value)}>
              <option value="all">All coverage</option>
              {COVERAGE_STATUSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {CASE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select value={readiness} onChange={(e) => setReadiness(e.target.value)}>
              <option value="all">All readiness</option>
              {INVOICE_READINESS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
            <Select value={insCo} onChange={(e) => setInsCo(e.target.value)}>
              <option value="all">All insurance</option>
              {INSURANCE_COMPANIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> From</div>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> To</div>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={clearFilters} fullWidth leftIcon={<ListFilter className="w-4 h-4" />}>Reset</Button>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-ink-500">
            <div className="inline-flex items-center gap-1.5"><Filter className="w-3 h-3" /> Showing {list.length} of {merged.length} cases.</div>
            <div className="inline-flex items-center gap-1.5">Mock dataset · no Master Sheet has been touched.</div>
          </div>
        </Card>

        {list.length === 0 ? (
          <Card><EmptyState title="No cases match these filters" message="Try clearing filters or selecting a different year." /></Card>
        ) : (
          <>
            {/* Desktop table */}
            <Card padding="none" className="hidden lg:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-subtle/60 text-ink-500 text-[11px] uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2.5">
                        <input type="checkbox" checked={selected.size === list.length && list.length > 0} onChange={toggleSelectAll}
                               className="rounded border-border-strong text-sky-600 focus:ring-sky-500" />
                      </th>
                      <th className="text-start font-semibold px-3 py-2.5">Our Ref</th>
                      <th className="text-start font-semibold px-3 py-2.5">Source</th>
                      <th className="text-start font-semibold px-3 py-2.5">Visit</th>
                      <th className="text-start font-semibold px-3 py-2.5">Patient</th>
                      <th className="text-start font-semibold px-3 py-2.5">Facility · Branch</th>
                      <th className="text-start font-semibold px-3 py-2.5">Hotel</th>
                      <th className="text-start font-semibold px-3 py-2.5">Route</th>
                      <th className="text-start font-semibold px-3 py-2.5">Financial</th>
                      <th className="text-start font-semibold px-3 py-2.5">Insurance / Cash</th>
                      <th className="text-start font-semibold px-3 py-2.5">Coverage</th>
                      <th className="text-start font-semibold px-3 py-2.5">Case</th>
                      <th className="text-start font-semibold px-3 py-2.5">Readiness</th>
                      <th className="text-end font-semibold px-3 py-2.5">Final</th>
                      <th className="text-start font-semibold px-3 py-2.5">Updated</th>
                      <th className="text-end font-semibold px-3 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {list.map((c) => {
                      const lastUpdated = c.history?.length ? c.history[c.history.length - 1].at : c.visitDate
                      const checked = selected.has(c.id)
                      return (
                        <tr key={c.id} className={cn('row-hover', checked && 'bg-sky-50/60')}>
                          <td className="px-3 py-3">
                            <input type="checkbox" checked={checked} onChange={() => toggleSelect(c.id)}
                                   className="rounded border-border-strong text-sky-600 focus:ring-sky-500" />
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px] text-ink-700 whitespace-nowrap">{c.ourRef}</td>
                          <td className="px-3 py-3"><Badge tone={SOURCE_TONE[c.source] || 'neutral'} size="sm">{c.source}</Badge></td>
                          <td className="px-3 py-3 text-ink-600 whitespace-nowrap">{fmtDate(c.visitDate)}</td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-ink-900">{c.patient?.name}</div>
                            <div className="text-[11px] text-ink-400">{c.patient?.nationality}</div>
                          </td>
                          <td className="px-3 py-3 text-ink-700">
                            <div className="text-[10px] uppercase tracking-wider text-ink-400">{c.facilityId}</div>
                            <div className="text-xs font-medium">{getBranchName(c.branchId)}</div>
                          </td>
                          <td className="px-3 py-3 text-ink-700 text-xs">{c.hotel}</td>
                          <td className="px-3 py-3"><Badge tone={ROUTE_TONE[c.route] || 'neutral'} size="sm">{c.route}</Badge></td>
                          <td className="px-3 py-3"><Badge tone={FINANCIAL_TONE[c.financialType] || 'neutral'} size="sm">{c.financialType}</Badge></td>
                          <td className="px-3 py-3 text-ink-700">
                            <div className="text-xs">{c.insuranceCompany || (c.financialType === 'Cash' ? '— Cash —' : '—')}</div>
                            {c.insuranceRef && <div className="text-[10px] text-ink-400 font-mono">{c.insuranceRef}</div>}
                          </td>
                          <td className="px-3 py-3">
                            {c.financialType === 'Insurance' ? (
                              <InlineSelect value={c.coverageStatus || 'Details Pending'} options={COVERAGE_STATUSES} tone={COVERAGE_TONE[c.coverageStatus] || 'cov-pending'} onChange={(v) => updateField(c.id, 'coverageStatus', v)} />
                            ) : <span className="text-ink-300">—</span>}
                          </td>
                          <td className="px-3 py-3">
                            <InlineSelect value={c.caseStatus || 'Open'} options={CASE_STATUSES} tone={STATUS_TONE[c.caseStatus] || 'neutral'} onChange={(v) => updateField(c.id, 'caseStatus', v)} />
                          </td>
                          <td className="px-3 py-3">
                            <InlineSelect value={c.invoiceReadiness || 'Pending Information'} options={INVOICE_READINESS} tone={STATUS_TONE[c.invoiceReadiness] || 'neutral'} onChange={(v) => updateField(c.id, 'invoiceReadiness', v)} />
                          </td>
                          <td className="px-3 py-3 text-end whitespace-nowrap font-medium text-ink-900">
                            {c.finalInvoiceAmount ? fmtMoney(c.finalInvoiceAmount, c.finalCurrency || c.currency) : '—'}
                          </td>
                          <td className="px-3 py-3 text-[11px] text-ink-500 whitespace-nowrap">{fmtRelative(lastUpdated)}</td>
                          <td className="px-3 py-3 text-end">
                            <Button as={Link} to={`/admin/cases/${c.id}`} variant="ghost" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>Open</Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile expandable cards — no horizontal scroll */}
            <div className="lg:hidden space-y-2">
              {list.map((c) => <MobileCaseCard key={c.id} c={c} checked={selected.has(c.id)} onToggle={() => toggleSelect(c.id)} onUpdate={updateField} />)}
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-900">
                <span className="font-semibold">Inline edits and bulk actions</span> save to local prototype state only and trigger a toast notification. No real audit-log entry or database write is performed.
              </div>
            </div>
          </>
        )}

        <BulkActionBar
          count={selected.size}
          onClear={clearSelection}
          onMarkReviewed={bulkMarkReviewed}
          onAssignStatus={bulkAssignStatus}
          onExport={bulkExport}
        />
      </PageBody>
    </>
  )
}

// --------------------------------------------------------------------
function MobileCaseCard({ c, checked, onToggle, onUpdate }) {
  const [open, setOpen] = useState(false)
  return (
    <Card padding="none" className={cn('overflow-hidden', checked && 'ring-2 ring-sky-300')}>
      <div className="flex items-start gap-3 p-3.5">
        <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 rounded border-border-strong text-sky-600 focus:ring-sky-500" />
        <button onClick={() => setOpen((x) => !x)} className="flex-1 min-w-0 text-start">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] text-ink-400 font-mono">{c.ourRef}</div>
              <div className="font-semibold text-ink-900 truncate">{c.patient?.name}</div>
              <div className="text-[11px] text-ink-500">{getBranchName(c.branchId)} · {c.hotel}</div>
            </div>
            <Badge tone={SOURCE_TONE[c.source] || 'neutral'} size="sm">{c.source}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={FINANCIAL_TONE[c.financialType] || 'neutral'} size="sm">{c.financialType}</Badge>
            <Badge tone={ROUTE_TONE[c.route] || 'neutral'} size="sm">{c.route}</Badge>
            <Badge tone={STATUS_TONE[c.invoiceReadiness] || 'neutral'} size="sm">{c.invoiceReadiness}</Badge>
            {c.financialType === 'Insurance' && (
              <Badge tone={COVERAGE_TONE[c.coverageStatus] || 'cov-pending'} size="sm">{c.coverageStatus || 'Details Pending'}</Badge>
            )}
          </div>
        </button>
        <button onClick={() => setOpen((x) => !x)} className="p-2 rounded-md text-ink-400 hover:bg-subtle">
          <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-subtle/30 p-3.5 space-y-3 animate-slide-up">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Kv label="Visit"     value={fmtDate(c.visitDate)} icon={Calendar} />
            <Kv label="Facility"  value={c.facilityId?.toUpperCase()} icon={Building2} />
            {c.financialType === 'Insurance' && <>
              <Kv label="Insurance"  value={c.insuranceCompany} icon={FileText} />
              <Kv label="Ins. Ref"   value={c.insuranceRef} icon={Hash} mono />
            </>}
            {c.financialType === 'Cash' && c.invoiceTotal != null && (
              <Kv label="Cash"       value={fmtMoney(c.invoiceTotal, c.currency)} icon={Wallet} />
            )}
            {c.finalInvoiceAmount != null && (
              <Kv label="Final"      value={fmtMoney(c.finalInvoiceAmount, c.finalCurrency || c.currency)} />
            )}
          </div>
          {c.financialType === 'Insurance' && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">Coverage</div>
              <InlineSelect value={c.coverageStatus || 'Details Pending'} options={COVERAGE_STATUSES} tone={COVERAGE_TONE[c.coverageStatus] || 'cov-pending'} onChange={(v) => onUpdate(c.id, 'coverageStatus', v)} />
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <Button as={Link} to={`/admin/cases/${c.id}`} variant="secondary" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>Open Case</Button>
            <span className="text-[10px] text-ink-400">Updated {fmtRelative(c.history?.[c.history.length - 1]?.at || c.visitDate)}</span>
          </div>
        </div>
      )}
    </Card>
  )
}

function Kv({ label, value, icon: Icon, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{label}</div>
      <div className={cn('text-sm font-medium text-ink-900 mt-0.5 flex items-center gap-1', mono && 'font-mono text-[12px]')}>
        {Icon && <Icon className="w-3 h-3 text-ink-400" />}
        {value || <span className="text-ink-300">—</span>}
      </div>
    </div>
  )
}

/**
 * InlineSelect — pill-styled native select. Background lives on the wrapper.
 */
function InlineSelect({ value, options, tone = 'neutral', onChange }) {
  const toneClasses = {
    navy:           'bg-navy-50 text-navy-800 ring-navy-100',
    sky:            'bg-status-ins-bg text-status-ins-fg ring-blue-200',
    success:        'bg-emerald-50 text-emerald-800 ring-emerald-100',
    warning:        'bg-status-pending-bg text-status-pending-fg ring-amber-200',
    danger:         'bg-status-review-bg text-status-review-fg ring-red-200',
    neutral:        'bg-subtle text-ink-700 ring-border',
    finalized:      'bg-status-final-bg text-status-final-fg ring-emerald-300',
    info:           'bg-status-ins-bg text-status-ins-fg ring-blue-200',
    'cov-pending':  'bg-amber-50 text-amber-800 ring-amber-200',
    'cov-needed':   'bg-red-50 text-red-800 ring-red-200',
    'cov-review':   'bg-sky-50 text-sky-800 ring-sky-200',
    'cov-confirmed':'bg-emerald-50 text-emerald-800 ring-emerald-200',
  }[tone] || 'bg-subtle text-ink-700 ring-border'

  return (
    <div className={cn('relative inline-flex items-center rounded-full ring-1 ring-inset whitespace-nowrap', toneClasses)}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none cursor-pointer bg-transparent pe-6 ps-2.5 py-0.5 text-xs font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-sky-300 text-current">
        {options.map((o) => <option key={o} value={o} className="text-ink-900">{o}</option>)}
      </select>
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] opacity-60">▾</span>
    </div>
  )
}
