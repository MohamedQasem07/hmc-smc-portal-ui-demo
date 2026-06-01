import { useEffect, useMemo, useState } from 'react'
import { Stethoscope, AlertTriangle, Printer, Download, FilterX } from 'lucide-react'
import { fetchSpecialistVisits } from '../../../../lib/api/portalData'
import { fmtDMYHM } from '../../../../lib/displayDate'

/* =========================================================================
 * LiveSpecialistVisitsReport — admin report of specialist visits recorded on
 * cases (portal_encounters type 'session'), enriched with case ref / patient /
 * branch + parsed specialist fields. supabase-mode only. RLS = admin sees all.
 * Honest about freetext: parsed fields when present, raw note otherwise.
 * ========================================================================= */

export default function LiveSpecialistVisitsReport() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [branch, setBranch] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [source, setSource] = useState('')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try { setRows(await fetchSpecialistVisits({ from: from || undefined, to: to || undefined })); setErr(null) }
    catch (e) { setErr(e?.message || 'Could not load specialist visits.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [from, to])

  const branches = useMemo(() => Array.from(new Set(rows.map((r) => r.branchName).filter((b) => b && b !== '—'))).sort(), [rows])
  const specialties = useMemo(() => Array.from(new Set(rows.map((r) => r.specialty).filter(Boolean))).sort(), [rows])

  const filtered = useMemo(() => rows.filter((r) =>
    (!branch || r.branchName === branch) &&
    (!specialty || r.specialty === specialty) &&
    (!source || (r.source || '') === source) &&
    (!search || `${r.doctorName || ''} ${r.patientName || ''} ${r.caseRef || ''}`.toLowerCase().includes(search.toLowerCase())),
  ), [rows, branch, specialty, source, search])

  function clearFilters() { setFrom(''); setTo(''); setBranch(''); setSpecialty(''); setSource(''); setSearch('') }

  function exportCsv() {
    const head = ['Date/Time', 'Case Ref', 'Patient', 'Branch', 'Doctor', 'Specialty', 'Source', 'Status', 'Duration (min)', 'Note']
    const lines = filtered.map((r) => [
      r.when ? fmtDMYHM(r.when) : '', r.caseRef, r.patientName, r.branchName,
      r.doctorName || '', r.specialty || '', r.source || '', r.status,
      r.durationMin ?? '', (r.note || r.rawNote || ''),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    const csv = [head.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'specialist-visits.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {err && (
        <div className="rounded-xl px-3 py-2 flex items-start gap-2 text-[12px] font-semibold"
          style={{ background: 'var(--p-mixed-soft, #FFF1F1)', color: '#B14242', border: '1px solid #F0B5B5' }}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{err}</span>
        </div>
      )}

      {/* filters */}
      <div className="p-card p-4 grid grid-cols-2 lg:grid-cols-6 gap-3 no-print">
        <Labeled label="From"><input type="date" className="p-input" value={from} onChange={(e) => setFrom(e.target.value)} /></Labeled>
        <Labeled label="To"><input type="date" className="p-input" value={to} onChange={(e) => setTo(e.target.value)} /></Labeled>
        <Labeled label="Branch">
          <select className="p-input" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">All</option>{branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Labeled>
        <Labeled label="Specialty">
          <select className="p-input" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            <option value="">All</option>{specialties.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Labeled>
        <Labeled label="Source">
          <select className="p-input" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All</option><option value="External">External</option><option value="Internal">Internal</option>
          </select>
        </Labeled>
        <Labeled label="Search">
          <input className="p-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Doctor / patient / ref" />
        </Labeled>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap no-print">
        <div className="text-[12px]" style={{ color: 'var(--p-ink-500)' }}>{filtered.length} visit{filtered.length === 1 ? '' : 's'}</div>
        <div className="flex gap-2">
          <button onClick={clearFilters} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold p-btn-ghost"><FilterX className="w-3.5 h-3.5" /> Clear</button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold p-btn-ghost"><Printer className="w-3.5 h-3.5" /> Print</button>
          <button onClick={exportCsv} disabled={!filtered.length} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold p-btn-ghost" style={{ opacity: filtered.length ? 1 : 0.5 }}><Download className="w-3.5 h-3.5" /> Export CSV</button>
        </div>
      </div>

      {/* table */}
      <div className="p-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--p-ink-500)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center" style={{ color: 'var(--p-ink-500)' }}>
            <Stethoscope className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--p-ink-300, #CBD5E1)' }} />
            <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-700, #334155)' }}>No specialist visits recorded.</div>
            <div className="text-[13px] mt-1">Specialist visits added on cases will appear here.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--p-ink-500)', borderBottom: '1px solid var(--p-border)' }}>
                  <Th>Date / Time</Th><Th>Case Ref</Th><Th>Patient</Th><Th>Branch</Th><Th>Doctor</Th><Th>Specialty</Th><Th>Source</Th><Th>Status</Th><Th>Duration</Th><Th>Note</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-black/[0.02]" style={{ borderBottom: '1px solid var(--p-border)' }}>
                    <Td>{r.when ? fmtDMYHM(r.when) : '—'}</Td>
                    <Td><span className="font-semibold whitespace-nowrap" style={{ color: 'var(--p-brand-mid)' }}>{r.caseRef}</span></Td>
                    <Td>{r.patientName}</Td>
                    <Td>{r.branchName}</Td>
                    <Td>{r.doctorName || <span style={{ color: 'var(--p-ink-400, #94A3B8)' }}>—</span>}</Td>
                    <Td>{r.specialty || '—'}</Td>
                    <Td>{r.source ? <SourcePill source={r.source} /> : '—'}</Td>
                    <Td>{r.status === 'active'
                      ? <span style={{ color: '#B8854D', fontWeight: 700 }}>Active</span>
                      : <span style={{ color: '#0A7A72', fontWeight: 700 }}>Closed</span>}</Td>
                    <Td>{r.durationMin != null ? `${r.durationMin}m` : '—'}</Td>
                    <Td><span className="block max-w-[260px] truncate" title={r.note || r.rawNote}>{r.note || '—'}</span></Td>
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

function SourcePill({ source }) {
  const internal = source === 'Internal'
  return <span className="text-[10px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded whitespace-nowrap"
    style={internal ? { background: 'rgba(18,43,83,0.10)', color: 'var(--p-brand-mid)' } : { background: 'rgba(15,181,169,0.14)', color: '#0A7A72' }}>{source}</span>
}
function Th({ children }) { return <th className="px-3 py-2 font-bold whitespace-nowrap">{children}</th> }
function Td({ children }) { return <td className="px-3 py-2.5 align-top whitespace-nowrap" style={{ color: 'var(--p-ink-700, #334155)' }}>{children}</td> }
function Labeled({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</label>
      {children}
    </div>
  )
}
