import { useCallback, useEffect, useState } from 'react'
import {
  ClipboardList, Plus, X, CheckCircle2, AlertTriangle, Power, Save, ChevronDown, Pencil,
} from 'lucide-react'
import { SectionHead } from '../../../../premium/p2cPrimitives'
import {
  fetchServiceCatalog, upsertServiceCatalogItem, setServiceCatalogActive, SERVICE_CATEGORIES,
} from '../../../../lib/api/portalData'
import { cn } from '../../../../lib/cn'

/* =========================================================================
 * LiveServiceCatalogConfig (Bundle 1 / Phase B) — admin, supabase mode only.
 * Maintain the service checklist catalog Claude later maps to the locked
 * HMC/SMC billing engine. NO prices here. Categories are fixed
 * (basic/specialist/labs/radiology/procedure/medication/other). Empty state
 * tells the admin to add items — NO automatic seed.
 * ========================================================================= */

const CAT_LABEL = {
  basic: 'Basic', specialist: 'Specialist', labs: 'Labs', radiology: 'Radiology',
  procedure: 'Procedure', medication: 'Medication', other: 'Other',
}

function Banner({ tone, children }) {
  const s = tone === 'ok'
    ? { bg: 'var(--p-finalized-soft)', fg: '#076D4A', bd: '#9FD4BB', I: CheckCircle2 }
    : { bg: 'var(--p-mixed-soft)', fg: '#B14242', bd: '#F0B5B5', I: AlertTriangle }
  const I = s.I
  return (
    <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]" style={{ background: s.bg, color: s.fg, border: `1px solid ${s.bd}` }}>
      <I className="w-4 h-4 mt-0.5 shrink-0" /><span className="font-semibold">{children}</span>
    </div>
  )
}
function Select({ value, onChange, children, className, disabled }) {
  return (
    <div className={cn('relative', className)}>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="p-input appearance-none w-full pr-8 h-9 text-[12px] disabled:opacity-50">{children}</select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
    </div>
  )
}

export default function LiveServiceCatalogConfig() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState(null)
  const [editing, setEditing] = useState(null)  // id | 'new' | null
  const ok = (m) => setBanner({ tone: 'ok', m })
  const err = (e) => setBanner({ tone: 'err', m: e?.message || String(e) })

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await fetchServiceCatalog()) } catch (e) { err(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function save(form) {
    if (!form.displayName.trim()) { err(new Error('Display name is required.')); return }
    setBusy(true)
    try { await upsertServiceCatalogItem(form); ok('Service item saved.'); setEditing(null); await load() }
    catch (e) { err(e) } finally { setBusy(false) }
  }
  async function toggle(it) {
    setBusy(true)
    try { await setServiceCatalogActive(it.id, !it.isActive); ok('Updated.'); await load() }
    catch (e) { err(e) } finally { setBusy(false) }
  }

  const byCat = SERVICE_CATEGORIES.map((cat) => [cat, rows.filter((r) => r.category === cat)]).filter(([, list]) => list.length)

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]"
        style={{ background: 'var(--p-brand-pale)', color: 'var(--p-ink-800)', border: '1px solid #BCCDE8' }}>
        <ClipboardList className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--p-brand-mid)' }} />
        <span>Service checklist catalog. <strong>No prices</strong> are stored or shown here — the portal only captures what was performed; Claude Code maps the <strong>canonical billing name</strong> to the locked HMC/SMC engine at invoice time.</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <SectionHead eyebrow="portal_service_catalog" title={`Service Catalog — ${rows.length}`}
          description="Admin-maintained checklist items grouped by category. Clinic/reception tick these on a case." />
        <button onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-bold p-btn-primary shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Item
        </button>
      </div>

      {banner && <Banner tone={banner.tone}>{banner.m}</Banner>}
      {editing === 'new' && <ItemForm busy={busy} onCancel={() => setEditing(null)} onSave={save} />}

      {loading ? (
        <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading catalog…</div>
      ) : rows.length === 0 ? (
        <div className="p-card p-8 text-center space-y-2">
          <ClipboardList className="w-8 h-8 mx-auto" style={{ color: 'var(--p-ink-300)' }} />
          <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-700)' }}>No service catalog items yet.</div>
          <div className="text-[12px]" style={{ color: 'var(--p-ink-500)' }}>Add items above (e.g. ER Examination, General Surgery Consultation, CBC, CRP, CT Brain). No items are seeded automatically.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {byCat.map(([cat, list]) => (
            <div key={cat} className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{CAT_LABEL[cat]} — {list.length}</div>
              {list.map((it) => editing === it.id ? (
                <ItemForm key={it.id} initial={it} busy={busy} onCancel={() => setEditing(null)} onSave={save} />
              ) : (
                <div key={it.id} className={cn('p-card px-3 py-2.5 flex items-center gap-3', !it.isActive && 'opacity-60')}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{it.displayName}</div>
                    <div className="text-[11px] flex flex-wrap gap-x-3" style={{ color: 'var(--p-ink-500)' }}>
                      {it.canonicalBillingName
                        ? <span>Billing: {it.canonicalBillingName}{it.sourceCode ? ` (${it.sourceCode})` : ''}</span>
                        : <span style={{ color: '#A1672A' }}>No billing mapping → needs review</span>}
                      {it.billingMappingHint && <span>Hint: {it.billingMappingHint}</span>}
                    </div>
                  </div>
                  <button onClick={() => setEditing(it.id)} disabled={busy} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold p-btn-ghost shrink-0"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                  <button onClick={() => toggle(it)} disabled={busy} className={cn('inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold shrink-0', it.isActive ? 'p-btn-ghost' : 'p-btn-primary')}><Power className="w-3 h-3" /> {it.isActive ? 'Active' : 'Inactive'}</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ItemForm({ initial, busy, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    id: initial?.id, category: initial?.category || 'basic', displayName: initial?.displayName || '',
    canonicalBillingName: initial?.canonicalBillingName || '', sourceSystem: initial?.sourceSystem || '',
    sourceCode: initial?.sourceCode || '', billingMappingHint: initial?.billingMappingHint || '',
    defaultQuantity: initial?.defaultQuantity ?? 1, notes: initial?.notes || '', isActive: initial?.isActive ?? true,
  }))
  const set = (patch) => setForm((p) => ({ ...p, ...patch }))
  return (
    <div className="p-card p-4 space-y-3" style={{ border: '1px solid var(--p-brand-mid)' }}>
      <div className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{initial ? 'Edit service item' : 'New service item'}</div>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <L className="sm:col-span-3" label="Category">
          <Select value={form.category} onChange={(v) => set({ category: v })}>{SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}</Select>
        </L>
        <L className="sm:col-span-5" label="Display name (no price)"><input value={form.displayName} onChange={(e) => set({ displayName: e.target.value })} className="p-input h-9" placeholder="e.g. ER Examination" /></L>
        <L className="sm:col-span-4" label="Canonical billing name (engine)"><input value={form.canonicalBillingName} onChange={(e) => set({ canonicalBillingName: e.target.value })} className="p-input h-9" placeholder="e.g. Doctor Examination" /></L>
        <L className="sm:col-span-3" label="Source system"><input value={form.sourceSystem} onChange={(e) => set({ sourceSystem: e.target.value })} className="p-input h-9" placeholder="HMC / SMC / manual" /></L>
        <L className="sm:col-span-3" label="Source code"><input value={form.sourceCode} onChange={(e) => set({ sourceCode: e.target.value })} className="p-input h-9" placeholder="e.g. Er-Ex / CBC" /></L>
        <L className="sm:col-span-2" label="Default qty"><input type="number" min="1" step="1" value={form.defaultQuantity} onChange={(e) => set({ defaultQuantity: e.target.value })} className="p-input h-9" /></L>
        <L className="sm:col-span-4" label="Billing mapping hint (for Claude)"><input value={form.billingMappingHint} onChange={(e) => set({ billingMappingHint: e.target.value })} className="p-input h-9" placeholder="e.g. Electrolytes → Na, K, Cl" /></L>
        <L className="sm:col-span-12" label="Notes"><input value={form.notes} onChange={(e) => set({ notes: e.target.value })} className="p-input h-9" /></L>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={busy} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold p-btn-ghost"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={() => onSave(form)} disabled={busy || !form.displayName.trim()} className={cn('inline-flex items-center gap-1.5 h-9 px-5 rounded-full text-xs font-bold p-btn-primary', (busy || !form.displayName.trim()) && 'opacity-40')}><Save className="w-3.5 h-3.5" /> Save</button>
      </div>
    </div>
  )
}

function L({ label, children, className = '' }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</label>
      {children}
    </div>
  )
}
