import { useEffect, useMemo, useState } from 'react'
import {
  Archive, ArchiveRestore, Search, Filter, History, ListChecks, AlertTriangle,
  CheckCircle2, Activity, FileText, Trash2, ChevronRight, Hash, Save,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import {
  PremiumKpi, PremiumButton, PremiumInput, PremiumSelect, StatusPill,
  MeshCorner, SectionLabel,
} from '../../premium/primitives'
import { Drawer } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { fmtDate } from '../../lib/format'
import { OLD_CASES, OLD_CASE_STATUSES, STATUS_TONE, payStateOf } from '../../data/oldCases'
import { IS_SUPABASE } from '../../lib/api/config'

const nowISO = () => new Date().toISOString()
const deepCopy = (rows) => rows.map((c) => ({
  ...c,
  statusHistory: c.statusHistory.map((h) => ({ ...h })),
  auditHistory: c.auditHistory.map((a) => ({ ...a })),
}))

export default function OldCasesAdmin() {
  // Live pilot: Old Cases are owner-gated (not yet imported). Show a clean,
  // honest empty state instead of the mock archive. Mock mode keeps the demo.
  if (IS_SUPABASE) {
    return (
      <AdminShell active="legacy" searchPlaceholder="Search old cases…">
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-12 max-w-[1500px] mx-auto">
          <div className="p-card p-10 text-center">
            <div className="text-base font-semibold" style={{ color: 'var(--p-ink-700)' }}>Old Cases</div>
            <div className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--p-ink-500)' }}>
              No old cases imported yet. Historical cases will appear here once the archive import is completed.
            </div>
          </div>
        </div>
      </AdminShell>
    )
  }
  const { toast } = useToast()
  const [cases, setCases] = useState(() => deepCopy(OLD_CASES))
  const [selectedId, setSelectedId] = useState(null)

  // Filters
  const [q, setQ] = useState('')
  const [dob, setDob] = useState('')
  const [insurer, setInsurer] = useState('all')
  const [facility, setFacility] = useState('all')
  const [status, setStatus] = useState('all')
  const [ourRef, setOurRef] = useState('all')
  const [pay, setPay] = useState('all')
  const [showArchived, setShowArchived] = useState(false)

  const insurers = useMemo(() => Array.from(new Set(cases.map((c) => c.insurer).filter(Boolean))).sort(), [cases])
  const facilities = useMemo(() => Array.from(new Set(cases.map((c) => c.facility).filter(Boolean))).sort(), [cases])

  const list = useMemo(() => cases.filter((c) => {
    if (!showArchived && c.archived) return false
    if (q && !c.patientName.toLowerCase().includes(q.toLowerCase())) return false
    if (dob && !(c.dob || '').includes(dob)) return false
    if (insurer !== 'all' && c.insurer !== insurer) return false
    if (facility !== 'all' && c.facility !== facility) return false
    if (status !== 'all' && c.status !== status) return false
    if (ourRef === 'has' && !c.ourRef) return false
    if (ourRef === 'unassigned' && c.ourRef) return false
    if (pay !== 'all' && payStateOf(c.status) !== pay) return false
    return true
  }).sort((a, b) => (b.lastUpdated || '').localeCompare(a.lastUpdated || '')), [cases, q, dob, insurer, facility, status, ourRef, pay, showArchived])

  const summary = useMemo(() => {
    const active = cases.filter((c) => !c.archived)
    return {
      total: active.length,
      unassigned: active.filter((c) => !c.ourRef).length,
      needsReview: active.filter((c) => c.status === 'Needs Review').length,
      paidClosed: active.filter((c) => payStateOf(c.status) === 'paid').length,
      followUp: active.filter((c) => payStateOf(c.status) === 'open').length,
    }
  }, [cases])

  const hasFilters = q || dob || insurer !== 'all' || facility !== 'all' || status !== 'all' || ourRef !== 'all' || pay !== 'all' || showArchived
  function clearFilters() {
    setQ(''); setDob(''); setInsurer('all'); setFacility('all'); setStatus('all'); setOurRef('all'); setPay('all'); setShowArchived(false)
  }

  const selected = cases.find((c) => c.id === selectedId) || null

  // ---- mutations (local demo state only) ----
  function patch(id, fn) {
    setCases((cs) => cs.map((c) => (c.id === id ? fn(c) : c)))
  }
  function setCaseStatus(id, next, reason) {
    const cur = cases.find((c) => c.id === id)
    if (!cur || cur.status === next) return
    const at = nowISO()
    patch(id, (c) => ({
      ...c,
      status: next,
      lastUpdated: at,
      statusHistory: [...c.statusHistory, { status: next, at, by: 'Admin', reason: reason || undefined }],
      auditHistory: [...c.auditHistory, { action: 'Status changed', at, by: 'Admin', detail: `${cur.status} → ${next}` }],
    }))
    toast({ kind: 'success', title: 'Status updated — demo only', message: `${cur.patientName}: ${cur.status} → ${next}` })
  }
  function setCaseNotes(id, notes) {
    const at = nowISO()
    patch(id, (c) => ({ ...c, notes: notes.trim() || null, lastUpdated: at, auditHistory: [...c.auditHistory, { action: 'Notes updated', at, by: 'Admin' }] }))
    toast({ kind: 'success', title: 'Notes saved — demo only', message: 'Not written to any database.' })
  }
  function setCaseOurRef(id, value) {
    const v = value.trim()
    if (!v) return
    const at = nowISO()
    patch(id, (c) => ({ ...c, ourRef: v, lastUpdated: at, auditHistory: [...c.auditHistory, { action: 'OUR Ref set', at, by: 'Admin', detail: v }] }))
    toast({ kind: 'success', title: 'OUR Ref saved — demo only', message: v })
  }
  function setArchived(id, archived) {
    const at = nowISO()
    patch(id, (c) => ({ ...c, archived, lastUpdated: at, auditHistory: [...c.auditHistory, { action: archived ? 'Archived' : 'Restored', at, by: 'Admin' }] }))
    toast({ kind: archived ? 'warning' : 'info', title: `${archived ? 'Archived' : 'Restored'} — demo only`, message: '' })
  }
  function removeCase(id) {
    setCases((cs) => cs.filter((c) => c.id !== id))
    setSelectedId(null)
    toast({ kind: 'warning', title: 'Deleted — demo only', message: 'Synthetic row removed from local state.' })
  }

  return (
    <AdminShell active="legacy" searchPlaceholder="Search old cases by patient…">
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6 max-w-[1600px] w-full mx-auto pb-32">

        {/* HERO */}
        <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-7 lg:px-10 lg:py-9 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={280} color="#2DD4C7" opacity={0.28} />
          <MeshCorner position="bl" size={240} color="#1E4180" opacity={0.20} />
          <div className="relative z-10">
            <div className="p-eyebrow" style={{ color: '#7FE7DE' }}><Archive className="w-3.5 h-3.5" /> Admin · Historical Cases</div>
            <h1 className="p-display p-display-light text-[30px] lg:text-[38px] mt-2">
              Old <span style={{ color: '#7FE7DE' }}>Cases.</span>
            </h1>
            <p className="text-sm lg:text-base mt-2 max-w-2xl" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Historical insurance cases from the Master Sheet — search, follow up, complete missing OUR Refs, and update status. Showing sample data only; the real import is pending the closing snapshot.
            </p>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-rise-1">
          <PremiumKpi label="Total Old Cases"   value={summary.total}       icon={ListChecks}    tone="navy" />
          <PremiumKpi label="Active Follow-Up"  value={summary.followUp}    icon={Activity}      tone="teal" />
          <PremiumKpi label="Paid / Closed"     value={summary.paidClosed}  icon={CheckCircle2}  tone="cash" />
          <PremiumKpi label="Needs Review"      value={summary.needsReview} icon={AlertTriangle} tone="mixed" />
          <PremiumKpi label="Not Prev. Assigned" value={summary.unassigned} icon={Hash}         tone="pending" />
        </section>

        {/* FILTERS */}
        <section className="p-card p-3 sm:p-4 p-rise-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <div className="col-span-2"><PremiumInput prefix={<Search className="w-4 h-4" />} placeholder="Search patient name" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <PremiumInput placeholder="DOB (YYYY or YYYY-MM-DD)" value={dob} onChange={(e) => setDob(e.target.value)} />
            <PremiumSelect value={insurer} onChange={(e) => setInsurer(e.target.value)}>
              <option value="all">All insurers</option>
              {insurers.map((i) => <option key={i} value={i}>{i}</option>)}
            </PremiumSelect>
            <PremiumSelect value={facility} onChange={(e) => setFacility(e.target.value)}>
              <option value="all">All facilities</option>
              {facilities.map((f) => <option key={f} value={f}>{f}</option>)}
            </PremiumSelect>
            <PremiumSelect value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {OLD_CASE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </PremiumSelect>
            <PremiumSelect value={ourRef} onChange={(e) => setOurRef(e.target.value)}>
              <option value="all">OUR Ref: all</option>
              <option value="has">Has OUR Ref</option>
              <option value="unassigned">Not Previously Assigned</option>
            </PremiumSelect>
            <PremiumSelect value={pay} onChange={(e) => setPay(e.target.value)}>
              <option value="all">Paid / Open / Review</option>
              <option value="paid">Paid / Closed</option>
              <option value="open">Open (follow-up)</option>
              <option value="needs_review">Needs Review</option>
            </PremiumSelect>
            <label className="inline-flex items-center gap-2 h-11 px-1 text-xs font-medium select-none" style={{ color: 'var(--p-ink-600)' }}>
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Show archived
            </label>
            <button onClick={clearFilters} disabled={!hasFilters} className="p-btn-ghost h-11 px-3 text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-40">
              <Filter className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </section>

        {/* TABLE */}
        <section className="p-card overflow-hidden p-rise-3">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--p-border)' }}>
            <SectionLabel eyebrow="Old Cases" title={`${list.length} case${list.length === 1 ? '' : 's'}`} description="Click a row to view and follow up. All data is synthetic sample data." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.10em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
                <tr>
                  <th className="text-start px-3 py-3">OUR Ref</th>
                  <th className="text-start px-3 py-3">Patient</th>
                  <th className="text-start px-3 py-3">DOB</th>
                  <th className="text-start px-3 py-3">Insurer</th>
                  <th className="text-start px-3 py-3">Ins. Ref</th>
                  <th className="text-start px-3 py-3">Facility</th>
                  <th className="text-start px-3 py-3">Curr.</th>
                  <th className="text-start px-3 py-3">Status</th>
                  <th className="text-center px-3 py-3">Notes</th>
                  <th className="text-start px-3 py-3">Updated</th>
                  <th className="text-start px-3 py-3">Source</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
                {list.map((c) => (
                  <tr key={c.id} onClick={() => setSelectedId(c.id)} className={`cursor-pointer transition-colors hover:bg-[var(--p-surface-tint)] ${c.archived ? 'opacity-55' : ''}`}>
                    <td className="px-3 py-3 font-mono text-[11px]" style={{ color: 'var(--p-ink-700)' }}>
                      {c.ourRef || <StatusPill tone="mixed" size="sm">Unassigned</StatusPill>}
                    </td>
                    <td className="px-3 py-3"><div className="font-semibold text-sm whitespace-nowrap" style={{ color: 'var(--p-ink-900)' }}>{c.patientName}</div></td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-600)' }}>{c.dob || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{c.insurer || '—'}</td>
                    <td className="px-3 py-3 font-mono text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{c.insuranceRef || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--p-ink-600)' }}>{c.facility || '—'}</td>
                    <td className="px-3 py-3" style={{ color: 'var(--p-ink-600)' }}>{c.currency || '—'}</td>
                    <td className="px-3 py-3"><StatusPill tone={STATUS_TONE[c.status] || 'navy'}>{c.status}</StatusPill></td>
                    <td className="px-3 py-3 text-center">{c.notes ? <FileText className="w-4 h-4 inline" style={{ color: 'var(--p-brand-mid)' }} /> : <span style={{ color: 'var(--p-ink-300)' }}>—</span>}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{fmtDate(c.lastUpdated)}</td>
                    <td className="px-3 py-3"><StatusPill tone="navy" size="sm">Legacy Import</StatusPill></td>
                    <td className="px-3 py-3 text-end"><ChevronRight className="w-4 h-4" style={{ color: 'var(--p-ink-300)' }} /></td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={12} className="px-5 py-14 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No matching old cases. Try clearing the filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="rounded-xl px-4 py-3.5 flex items-start gap-2.5" style={{ background: 'var(--p-insurance-soft)', border: '1px solid rgba(15,181,169,0.20)' }}>
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#0A8F87' }} />
          <div className="text-xs leading-relaxed" style={{ color: '#0A6E64' }}>
            Sample data only. Status, notes and OUR Ref edits are kept in local prototype state and confirmed with a toast — nothing is written to any database, and no real Master Sheet import has run.
          </div>
        </div>
      </div>

      <OldCaseDrawer
        c={selected}
        onClose={() => setSelectedId(null)}
        onSetStatus={setCaseStatus}
        onSetNotes={setCaseNotes}
        onSetOurRef={setCaseOurRef}
        onSetArchived={setArchived}
        onDelete={removeCase}
      />
    </AdminShell>
  )
}

function OldCaseDrawer({ c, onClose, onSetStatus, onSetNotes, onSetOurRef, onSetArchived, onDelete }) {
  const [statusDraft, setStatusDraft] = useState('Pending')
  const [reasonDraft, setReasonDraft] = useState('')
  const [notesDraft, setNotesDraft] = useState('')
  const [refDraft, setRefDraft] = useState('')

  useEffect(() => {
    if (!c) return
    setStatusDraft(c.status)
    setReasonDraft('')
    setNotesDraft(c.notes || '')
    setRefDraft(c.ourRef || '')
  }, [c?.id]) // resync when a different case is opened

  if (!c) return null

  return (
    <Drawer open={!!c} onClose={onClose} title={c.patientName} subtitle={c.ourRef || 'Not Previously Assigned'} width="xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={STATUS_TONE[c.status] || 'navy'}>{c.status}</StatusPill>
          <StatusPill tone="navy">Legacy Import</StatusPill>
          {c.archived && <StatusPill tone="pending">Archived</StatusPill>}
        </div>

        {/* Read-only details */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl p-4" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
          <Detail label="Date of birth" value={c.dob} />
          <Detail label="Currency" value={c.currency} />
          <Detail label="Insurance company" value={c.insurer} />
          <Detail label="Insurance reference" value={c.insuranceRef} mono />
          <Detail label="Facility / treated at" value={c.facility} />
          <Detail label="Last updated" value={fmtDate(c.lastUpdated, { withTime: true })} />
        </div>

        {/* Edit: status */}
        <Block title="Update status">
          <div className="flex flex-col sm:flex-row gap-2">
            <PremiumSelect value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)} className="sm:w-56">
              {OLD_CASE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </PremiumSelect>
            <PremiumInput placeholder="Reason / note (optional)" value={reasonDraft} onChange={(e) => setReasonDraft(e.target.value)} />
            <PremiumButton size="md" leftIcon={<Save className="w-4 h-4" />} onClick={() => onSetStatus(c.id, statusDraft, reasonDraft)}>Update</PremiumButton>
          </div>
        </Block>

        {/* Edit: OUR Ref */}
        <Block title={c.ourRef ? 'OUR Ref' : 'Assign OUR Ref'}>
          <div className="flex flex-col sm:flex-row gap-2">
            <PremiumInput placeholder="e.g. SHMC-1052026.418" value={refDraft} onChange={(e) => setRefDraft(e.target.value)} className="font-mono" />
            <PremiumButton variant="dark" size="md" leftIcon={<Hash className="w-4 h-4" />} onClick={() => onSetOurRef(c.id, refDraft)}>{c.ourRef ? 'Update' : 'Assign'}</PremiumButton>
          </div>
        </Block>

        {/* Edit: notes */}
        <Block title="Notes">
          <textarea
            rows={3}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Add a follow-up note…"
            className="w-full rounded-xl p-3 text-sm focus-visible:outline-none"
            style={{ border: '1px solid var(--p-border-strong)', background: 'var(--p-surface)', color: 'var(--p-ink-900)' }}
          />
          <div className="flex justify-end mt-2">
            <PremiumButton variant="dark" size="sm" leftIcon={<Save className="w-4 h-4" />} onClick={() => onSetNotes(c.id, notesDraft)}>Save notes</PremiumButton>
          </div>
        </Block>

        {/* Lifecycle */}
        <Block title="Lifecycle">
          <div className="flex flex-wrap items-center gap-2">
            <PremiumButton variant="ghost" size="sm" leftIcon={c.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />} onClick={() => onSetArchived(c.id, !c.archived)}>
              {c.archived ? 'Restore case' : 'Archive case'}
            </PremiumButton>
            <button
              onClick={() => { if (window.confirm('Permanently delete this synthetic case? This cannot be undone.')) onDelete(c.id) }}
              className="inline-flex items-center gap-2 h-9 px-3.5 text-xs font-semibold rounded-lg transition-colors"
              style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid rgba(226,106,106,0.30)' }}
            >
              <Trash2 className="w-4 h-4" /> Delete (synthetic)
            </button>
            <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>Prefer Archive for real cases — it keeps follow-up history.</span>
          </div>
        </Block>

        {/* History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Block title="Status history" icon={History}>
            <ol className="space-y-2.5">
              {[...c.statusHistory].reverse().map((h, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <StatusPill tone={STATUS_TONE[h.status] || 'navy'} size="sm">{h.status}</StatusPill>
                  <div style={{ color: 'var(--p-ink-500)' }}>
                    <div className="text-[12px]">{fmtDate(h.at, { withTime: true })} · {h.by}</div>
                    {h.reason && <div className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>{h.reason}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </Block>
          <Block title="Audit history" icon={ListChecks}>
            <ol className="space-y-2 text-sm">
              {[...c.auditHistory].reverse().map((a, i) => (
                <li key={i} style={{ color: 'var(--p-ink-600)' }}>
                  <span className="font-semibold" style={{ color: 'var(--p-ink-900)' }}>{a.action}</span>
                  <span className="text-[12px]"> · {fmtDate(a.at, { withTime: true })} · {a.by}</span>
                  {a.detail && <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}> — {a.detail}</span>}
                </li>
              ))}
            </ol>
          </Block>
        </div>
      </div>
    </Drawer>
  )
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--p-ink-400)' }}>{label}</div>
      <div className={`mt-0.5 text-sm ${mono ? 'font-mono text-[12px]' : ''}`} style={{ color: 'var(--p-ink-900)' }}>{value || '—'}</div>
    </div>
  )
}

function Block({ title, icon: Icon, children }) {
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-2 text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>
        {Icon && <Icon className="w-3.5 h-3.5" />} {title}
      </div>
      {children}
    </section>
  )
}
