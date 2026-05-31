import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Plus, X, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { SectionHead } from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import { fetchServiceCatalog, fetchCaseServices, recordCaseService, removeCaseService } from '../../../../lib/api/portalData'
import { fmtDMYHM } from '../../../../lib/displayDate'

/* =========================================================================
 * LiveCaseServices (Bundle 1 / Phase B) — supabase mode only.
 * "Services / Checklist" on the active case. Pick performed services from the
 * active catalog → portal_case_services (qty / performed_at / notes). NO price,
 * NO invoice. billing_status: 'draft' when the catalog item has a canonical
 * billing name, else 'needs_review'. Read-only once the case is closed.
 * ========================================================================= */

const CAT_LABEL = {
  basic: 'Basic', specialist: 'Specialist', labs: 'Labs', radiology: 'Radiology',
  procedure: 'Procedure', medication: 'Medication', other: 'Other',
}
function nowLocalDatetime() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function LiveCaseServices({ caseId, readOnly = false }) {
  const [catalog, setCatalog] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [pick, setPick] = useState('')
  const [qty, setQty] = useState('')
  const [when, setWhen] = useState(nowLocalDatetime())
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [cat, cs] = await Promise.all([fetchServiceCatalog({ activeOnly: true }), fetchCaseServices(caseId)])
      setCatalog(cat); setRows(cs)
    } catch (e) { setError(e?.message || 'Could not load services.') } finally { setLoading(false) }
  }, [caseId])
  useEffect(() => { load() }, [load])

  const selected = useMemo(() => catalog.find((c) => c.id === pick) || null, [catalog, pick])

  async function add() {
    if (!selected) { setError('Pick a service from the catalog.'); return }
    setBusy(true); setError(null)
    try {
      await recordCaseService(caseId, { catalogItem: selected, quantity: qty, performedAt: when ? new Date(when).toISOString() : undefined, notes: note.trim() || null })
      setPick(''); setQty(''); setNote(''); setWhen(nowLocalDatetime())
      await load()
    } catch (e) { setError(e?.message || 'Could not add the service.') } finally { setBusy(false) }
  }
  async function remove(id) {
    setBusy(true); setError(null)
    try { await removeCaseService(id); await load() }
    catch (e) { setError(e?.message || 'Could not remove the service.') } finally { setBusy(false) }
  }

  const grouped = Object.entries(
    catalog.reduce((acc, c) => { (acc[c.category] ||= []).push(c); return acc }, {}),
  )

  return (
    <section className="p-card p-5 space-y-4">
      <SectionHead eyebrow="Services · Live" title="Services / Checklist"
        description="Tick what was performed. Captured for billing later — no prices, no invoice here." />

      {error && (
        <div className="rounded-xl px-3 py-2 flex items-start gap-2 text-[12px]" style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="font-semibold">{error}</span>
        </div>
      )}

      {/* selected services */}
      {loading ? (
        <div className="text-sm text-center py-4" style={{ color: 'var(--p-ink-400)' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl p-4 text-center text-sm" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
          No services recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((s) => (
            <div key={s.id} className="rounded-xl p-3 flex items-start gap-3" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
              <span className="inline-flex items-center px-2 h-6 rounded-md text-[10px] font-bold shrink-0" style={{ background: 'white', border: '1px solid var(--p-border)', color: 'var(--p-brand-mid)' }}>{CAT_LABEL[s.category] || s.category}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{s.displayName}{s.quantity > 1 ? ` ×${s.quantity}` : ''}</div>
                <div className="text-[11px] mt-0.5 flex flex-wrap gap-x-3" style={{ color: 'var(--p-ink-500)' }}>
                  <span>{s.performedAt ? fmtDMYHM(s.performedAt) : '—'}</span>
                  {s.canonicalBillingName && <span>Billing: {s.canonicalBillingName}</span>}
                  {s.notes && <span>{s.notes}</span>}
                </div>
              </div>
              {s.billingStatus === 'needs_review'
                ? <StatusPill tone="amber" icon={Clock}>Needs review</StatusPill>
                : <StatusPill tone="navy" icon={CheckCircle2}>Draft</StatusPill>}
              {!readOnly && (
                <button onClick={() => remove(s.id)} disabled={busy} className="ml-0.5 w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0" style={{ background: 'var(--p-mixed-soft)', color: '#B14242' }}><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* add form / empty-catalog notice */}
      {!readOnly && !loading && (catalog.length === 0 ? (
        <div className="rounded-xl p-4 text-center text-[12px]" style={{ background: 'var(--p-pending-soft)', color: '#A1672A', border: '1px solid #F0C97A' }}>
          <ClipboardList className="w-5 h-5 mx-auto mb-1" />
          No service catalog items yet. Ask an admin to add them in <strong>Reference Lists → Service Catalog</strong>.
        </div>
      ) : (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-brand-mid)' }}>
            <ClipboardList className="w-4 h-4" /> Add Service
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <Field className="sm:col-span-6" label="Service">
              <select className="p-input" value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Select service…</option>
                {grouped.map(([cat, list]) => (
                  <optgroup key={cat} label={CAT_LABEL[cat] || cat}>
                    {list.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field className="sm:col-span-2" label="Qty">
              <input type="number" min="1" step="1" className="p-input" value={qty} onChange={(e) => setQty(e.target.value)} placeholder={String(selected?.defaultQuantity ?? 1)} />
            </Field>
            <Field className="sm:col-span-4" label="Performed at">
              <input type="datetime-local" className="p-input" value={when} onChange={(e) => setWhen(e.target.value)} />
            </Field>
            <Field className="sm:col-span-12" label="Note (optional)">
              <input className="p-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. left arm, 2nd dose" />
            </Field>
          </div>
          {selected && !selected.canonicalBillingName && (
            <div className="text-[11px]" style={{ color: '#A1672A' }}>This item has no billing mapping yet — it will be saved as <strong>needs review</strong> for Claude/admin.</div>
          )}
          <div className="flex justify-end">
            <button onClick={add} disabled={busy || !selected} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-sm font-bold p-btn-primary disabled:opacity-40">
              <Plus className="w-4 h-4" /> {busy ? 'Adding…' : 'Add Service'}
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</label>
      {children}
    </div>
  )
}
