import { useMemo, useState } from 'react'
import {
  BookOpen, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, Eye,
  Search, FlaskConical, Lock, Sparkles, ListChecks, ChevronRight, ArrowRight,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import {
  PremiumKpi, PremiumButton, PremiumInput, PremiumSelect, StatusPill,
  MeshCorner, SectionLabel, Avatar,
} from '../../premium/primitives'
import { useToast } from '../../components/ui/Toast'
import { LEGACY_REVIEW_ROWS, BILLING_FACILITIES } from '../../data/controlCenter'
import { fmtMoney, fmtDate } from '../../lib/format'

const MAPPING_FIELDS = [
  { source: 'Patient Name',            target: 'patient.name',          confidence: 'High', note: 'Direct mapping with name-cleaning' },
  { source: 'Visit Date',              target: 'visitDate',             confidence: 'High', note: 'Excel date → ISO' },
  { source: 'Clinic / Branch',         target: 'branchId',              confidence: 'Medium', note: 'Requires lookup against Operational Clinics list' },
  { source: 'HMC or SMC',              target: 'facilityId (billing)',  confidence: 'High', note: 'Maps to Billing Facility — HMC / SMC' },
  { source: 'Cash / Insurance',        target: 'financialType',         confidence: 'High', note: 'Direct vocab translation' },
  { source: 'Insurance Company',       target: 'insuranceCompany',      confidence: 'Medium', note: 'Requires fuzzy-match against Companies module — Admin review' },
  { source: 'Insurance Reference',     target: 'insuranceRef',          confidence: 'High', note: 'Direct text mapping' },
  { source: 'Invoice Amount',          target: 'finalInvoiceAmount',    confidence: 'High', note: 'Numeric — verify currency column' },
  { source: 'Currency',                target: 'currency',              confidence: 'Medium', note: 'Some rows missing — Admin manual fix' },
  { source: 'Paid Amount',             target: 'payments[].amount',     confidence: 'Medium', note: 'Multiple payment rows per case possible' },
  { source: 'Notes / Status text',     target: 'invoiceReadiness',     confidence: 'Low', note: 'Free text — needs Admin classification before import' },
]

export default function PremiumAdminLegacyReview() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [matchFilter, setMatchFilter] = useState('all')
  const [overrides, setOverrides] = useState({})
  const merged = useMemo(() => LEGACY_REVIEW_ROWS.map((r) => ({ ...r, ...(overrides[r.id] || {}) })), [overrides])

  const filtered = useMemo(() => merged.filter((r) => {
    if (search && !`${r.patientName} ${r.ourRef}`.toLowerCase().includes(search.toLowerCase())) return false
    if (matchFilter !== 'all' && r.matchStatus !== matchFilter) return false
    return true
  }), [merged, search, matchFilter])

  const summary = useMemo(() => ({
    total: merged.length,
    newCases:       merged.filter((r) => r.matchStatus === 'New Case').length,
    possible:       merged.filter((r) => r.matchStatus === 'Possible Match').length,
    missing:        merged.filter((r) => r.matchStatus === 'Missing Field').length,
    matched:        merged.filter((r) => r.matchStatus === 'Match Found').length,
    needsReview:    merged.filter((r) => r.matchStatus !== 'Match Found' && r.matchStatus !== 'New Case').length,
  }), [merged])

  function decide(id, action) {
    setOverrides((o) => ({ ...o, [id]: { ...(o[id] || {}), decision: action } }))
    toast({
      kind: action === 'match' ? 'success' : action === 'exclude' ? 'warning' : 'info',
      title: `${action === 'match' ? 'Confirmed match' : action === 'exclude' ? 'Excluded' : 'Marked for later review'} — demo only`,
      message: `Row ${id} — no real import executed.`,
    })
  }

  return (
    <AdminShell active="legacy" searchPlaceholder="Search legacy rows…">
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6 max-w-[1500px] w-full mx-auto pb-32">

        <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-7 lg:px-10 lg:py-9 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={280} color="#D9A574" opacity={0.28} />
          <MeshCorner position="bl" size={240} color="#1E4180" opacity={0.20} />
          <div className="relative z-10">
            <div className="p-eyebrow" style={{ color: '#E0C291' }}><BookOpen className="w-3.5 h-3.5" /> Admin · Legacy Master Sheet Review</div>
            <h1 className="p-display p-display-light text-[30px] lg:text-[38px] mt-2">
              Legacy Master Sheet <span style={{ color: '#E0C291' }}>review workspace.</span>
            </h1>
            <p className="text-sm lg:text-base mt-2 max-w-2xl" style={{ color: 'rgba(255,255,255,0.72)' }}>
              All rows shown below are <span className="font-semibold">DEMO-LEGACY-***</span> placeholders. Real Master Sheet rows are never present in the prototype or in the GitHub demo build. Import has not been executed.
            </p>
          </div>
        </section>

        {/* IMPORT SOURCE CARD */}
        <section className="p-card p-rise-1 p-5 lg:p-6" style={{ background: 'linear-gradient(180deg, #FBF5EC 0%, #FFFFFF 100%)', border: '1px solid rgba(217,165,116,0.32)' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(217,165,116,0.18)', color: '#9A6E36' }}>
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="p-eyebrow" style={{ color: '#9A6E36' }}>Source File</div>
              <h2 className="p-h2 text-lg mt-0.5">Master Sheet New.xlsm — Mapping Prepared</h2>
              <p className="text-sm mt-1.5 max-w-2xl" style={{ color: 'var(--p-ink-600)' }}>
                Read-only structural inspection performed. Column mapping documented in <code className="px-1.5 py-0.5 rounded text-[11px]" style={{ background: 'rgba(217,165,116,0.18)' }}>P2B2_MASTER_SHEET_READONLY_MAPPING.md</code>. No real data is loaded into the demo.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill tone="amber" dot>Import Not Executed</StatusPill>
                <StatusPill tone="ghost"><Lock className="w-3 h-3" /> Real rows never copied</StatusPill>
                <StatusPill tone="ghost"><FlaskConical className="w-3 h-3" /> Demo placeholders only</StatusPill>
              </div>
            </div>
          </div>
        </section>

        {/* SUMMARY KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-rise-2">
          <PremiumKpi label="Total Rows"        value={summary.total}    icon={ListChecks} tone="navy" />
          <PremiumKpi label="Match Found"       value={summary.matched}  icon={CheckCircle2} tone="cash" />
          <PremiumKpi label="Possible Matches"  value={summary.possible} icon={AlertTriangle} tone="pending" />
          <PremiumKpi label="Missing Fields"    value={summary.missing}  icon={XCircle} tone="mixed" />
          <PremiumKpi label="New Cases"         value={summary.newCases} icon={Sparkles} tone="teal" />
        </section>

        {/* COLUMN MAPPING */}
        <section className="p-card overflow-hidden p-rise-2">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--p-border)' }}>
            <SectionLabel eyebrow="Mapping" title="Column Mapping" description="Source column → target Admin Cases Master field." />
            <StatusPill tone="navy">{MAPPING_FIELDS.length} fields</StatusPill>
          </div>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
              <tr><th className="text-start px-5 py-2.5">Source Column</th><th className="text-start px-5 py-2.5">Target Field</th><th className="text-start px-5 py-2.5">Confidence</th><th className="text-start px-5 py-2.5">Note</th></tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
              {MAPPING_FIELDS.map((f, i) => (
                <tr key={i}>
                  <td className="px-5 py-2.5 font-semibold" style={{ color: 'var(--p-ink-900)' }}>{f.source}</td>
                  <td className="px-5 py-2.5 font-mono text-[12px]" style={{ color: 'var(--p-brand-mid)' }}>{f.target}</td>
                  <td className="px-5 py-2.5"><StatusPill tone={f.confidence === 'High' ? 'cash' : f.confidence === 'Medium' ? 'amber' : 'mixed'}>{f.confidence}</StatusPill></td>
                  <td className="px-5 py-2.5 text-[12px]" style={{ color: 'var(--p-ink-500)' }}>{f.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* FILTERS */}
        <section className="p-card p-3 sm:p-4 p-rise-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PremiumInput prefix={<Search className="w-4 h-4" />} placeholder="Search demo row…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <PremiumSelect value={matchFilter} onChange={(e) => setMatchFilter(e.target.value)}>
              <option value="all">All match statuses</option>
              <option value="Match Found">Match Found</option>
              <option value="Possible Match">Possible Match</option>
              <option value="Missing Field">Missing Field</option>
              <option value="New Case">New Case</option>
            </PremiumSelect>
          </div>
        </section>

        {/* LEGACY ROWS */}
        <section className="p-card overflow-hidden p-rise-3">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--p-border)' }}>
            <SectionLabel eyebrow="Rows" title="Demo Legacy Rows · Review & Decide" description="All rows are DEMO-LEGACY-***. No real patient data is loaded into the prototype." />
          </div>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
              <tr><th className="text-start px-5 py-2.5">Ref · Date</th><th className="text-start px-5 py-2.5">Patient</th><th className="text-start px-5 py-2.5">Clinic / Billing</th><th className="text-start px-5 py-2.5">Financial</th><th className="text-end px-5 py-2.5">Amount</th><th className="text-start px-5 py-2.5">Match</th><th className="text-end px-5 py-2.5">Decision</th></tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3">
                    <div className="font-mono text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{r.ourRef}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-700)' }}>{fmtDate(r.date)}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{r.patientName}</div>
                    {r.insuranceRef && <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--p-ink-400)' }}>{r.insuranceRef}</div>}
                  </td>
                  <td className="px-5 py-3 text-[12px]" style={{ color: 'var(--p-ink-700)' }}>
                    {r.clinic}<br />
                    <span className="font-mono font-bold uppercase text-[10px]" style={{ color: 'var(--p-brand-mid)' }}>{BILLING_FACILITIES.find((f) => f.id === r.billingFacility)?.shortName || '—'}</span>
                  </td>
                  <td className="px-5 py-3"><StatusPill tone={r.financialType === 'Cash' ? 'cash' : 'insurance'}>{r.financialType}</StatusPill></td>
                  <td className="px-5 py-3 text-end font-semibold p-numeric">{fmtMoney(r.invoiceAmount, r.currency)}</td>
                  <td className="px-5 py-3">
                    <StatusPill tone={r.matchStatus === 'Match Found' ? 'cash' : r.matchStatus === 'Possible Match' ? 'amber' : r.matchStatus === 'Missing Field' ? 'mixed' : 'teal'}>{r.matchStatus}</StatusPill>
                    {r.conflict && <div className="text-[10px] mt-1" style={{ color: '#B14242' }}>⚠ {r.conflict}</div>}
                  </td>
                  <td className="px-5 py-3 text-end">
                    {r.decision ? (
                      <StatusPill tone={r.decision === 'match' ? 'cash' : r.decision === 'exclude' ? 'mixed' : 'amber'}>{r.decision === 'match' ? 'Confirmed' : r.decision === 'exclude' ? 'Excluded' : 'Later'}</StatusPill>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => decide(r.id, 'match')}   title="Confirm match"     className="w-7 h-7 rounded-md hover:bg-emerald-50 transition-colors" style={{ color: '#0A8F62' }}><CheckCircle2 className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => decide(r.id, 'later')}   title="Confirm later"     className="w-7 h-7 rounded-md hover:bg-amber-50 transition-colors"   style={{ color: '#A1672A' }}><Eye className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => decide(r.id, 'exclude')} title="Exclude from import" className="w-7 h-7 rounded-md hover:bg-red-50 transition-colors" style={{ color: '#B14242' }}><XCircle className="w-4 h-4 mx-auto" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* IMPORT SUMMARY */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 p-rise-3">
          <div className="p-card p-6">
            <SectionLabel eyebrow="Future workflow" title="Import Summary (concept)" description="Once the owner approves the mapping, the planned future workflow." />
            <ol className="mt-4 space-y-2">
              <Step n={1} text="Admin reviews demo legacy rows and confirms mapping coverage" />
              <Step n={2} text="Admin classifies each row → Confirmed match / Later / Excluded" />
              <Step n={3} text="Approved Master Sheet rows are staged in a transient import table" />
              <Step n={4} text="Duplicate detection runs against Portal Cases — by patient name + insurance ref + visit date" />
              <Step n={5} text="Possible Matches / Missing Fields surface in a pre-flight review queue" />
              <Step n={6} text="Final approval triggers move into Cases Master with source='Legacy Master Sheet'" />
              <Step n={7} text="Backup / rollback strategy validated · then import executes" />
            </ol>
          </div>
          <div className="p-card p-6" style={{ background: 'linear-gradient(180deg, #FBF5EC 0%, #FFFFFF 100%)', border: '1px solid rgba(217,165,116,0.32)' }}>
            <div className="p-eyebrow" style={{ color: '#9A6E36' }}><Lock className="w-3.5 h-3.5" /> Protected</div>
            <h3 className="p-h2 text-base mt-1">Import gate</h3>
            <ul className="mt-3 space-y-2 text-[12px]" style={{ color: 'var(--p-ink-700)' }}>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#0A8F62' }} />Read-only structural inspection completed</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#0A8F62' }} />Mapping documented offline</li>
              <li className="flex items-start gap-1.5"><XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#B14242' }} />Real rows NOT copied into demo</li>
              <li className="flex items-start gap-1.5"><XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#B14242' }} />NOT published to GitHub Pages</li>
              <li className="flex items-start gap-1.5"><XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#B14242' }} />NO backend import executed</li>
            </ul>
          </div>
        </section>
      </div>
    </AdminShell>
  )
}

function Step({ n, text }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: 'var(--p-teal)', color: 'white' }}>{n}</span>
      <span className="text-sm" style={{ color: 'var(--p-ink-700)' }}>{text}</span>
    </li>
  )
}
