import { useCallback, useEffect, useState } from 'react'
import {
  ShieldCheck, Plus, X, CheckCircle2, AlertTriangle, Power, Save, ChevronDown, Pencil, Building2,
} from 'lucide-react'
import { SectionHead } from '../../../../premium/p2cPrimitives'
import {
  fetchInsuranceCompaniesAdmin, upsertInsuranceCompany, setInsuranceCompanyActive,
  fetchLocalAssistanceCompanies, upsertLocalAssistanceCompany,
  fetchBillingFacilities,
} from '../../../../lib/api/portalData'
import { cn } from '../../../../lib/cn'

/* =========================================================================
 * LiveInsurerConfig (Bundle 1 / Phase C) — admin, supabase mode only.
 * View/edit insurance company master (workflow_type, default assistance,
 * contact, default billing facility, notes) + maintain assistance companies.
 * Existing cases keep their snapshot insurer text regardless of this master.
 * ========================================================================= */

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

export default function LiveInsurerConfig() {
  const [tab, setTab] = useState('insurers')
  const [banner, setBanner] = useState(null)
  const ok = (m) => setBanner({ tone: 'ok', m })
  const err = (e) => setBanner({ tone: 'err', m: e?.message || String(e) })
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        {[['insurers', 'Insurance Companies', ShieldCheck], ['assistance', 'Assistance Companies', Building2]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => { setTab(id); setBanner(null) }}
            className={cn('inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-bold', tab === id ? 'p-btn-primary' : 'p-btn-ghost')}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>
      {banner && <Banner tone={banner.tone}>{banner.m}</Banner>}
      {tab === 'insurers' ? <InsurerList onOk={ok} onErr={err} /> : <AssistanceList onOk={ok} onErr={err} />}
    </div>
  )
}

// ============================================================ Insurers
function InsurerList({ onOk, onErr }) {
  const [rows, setRows] = useState([])
  const [assist, setAssist] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(null)   // id | 'new' | null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, a, f] = await Promise.all([
        fetchInsuranceCompaniesAdmin(), fetchLocalAssistanceCompanies({ activeOnly: true }), fetchBillingFacilities(),
      ])
      setRows(r); setAssist(a); setFacilities(f)
    } catch (e) { onErr(e) } finally { setLoading(false) }
  }, [onErr])
  useEffect(() => { load() }, [load])

  async function save(form) {
    if (!form.name.trim()) { onErr(new Error('Company name is required.')); return }
    setBusy(true)
    try { await upsertInsuranceCompany(form); onOk('Insurance company saved.'); setEditing(null); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  async function toggle(c) {
    setBusy(true)
    try { await setInsuranceCompanyActive(c.id, !c.active); onOk('Updated.'); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }

  if (loading) return <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading insurers…</div>
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SectionHead eyebrow="portal_insurance_companies" title={`Insurance Companies — ${rows.length}`}
          description="Master list reception selects during intake. Workflow type, default assistance, contact, default facility and notes are optional." />
        <button onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-bold p-btn-primary shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Insurer
        </button>
      </div>

      {editing === 'new' && <InsurerForm assist={assist} facilities={facilities} busy={busy} onCancel={() => setEditing(null)} onSave={save} />}

      <div className="space-y-2">
        {rows.length === 0 && <div className="p-card p-6 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No insurers yet. Add the first one.</div>}
        {rows.map((c) => editing === c.id ? (
          <InsurerForm key={c.id} initial={c} assist={assist} facilities={facilities} busy={busy} onCancel={() => setEditing(null)} onSave={save} />
        ) : (
          <div key={c.id} className={cn('p-card p-4 flex flex-col lg:flex-row lg:items-center gap-3', !c.active && 'opacity-60')}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{c.name}</span>
                {c.workflowType && <span className="inline-flex items-center px-2 h-6 rounded-full text-[10px] font-bold uppercase tracking-[0.08em]"
                  style={{ background: 'var(--p-brand-pale)', color: 'var(--p-brand-mid)', border: '1px solid #BCCDE8' }}>{c.workflowType}</span>}
                {c.defaultBillingFacility && <span className="inline-flex items-center px-2 h-6 rounded-md text-[10px] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-700)', border: '1px solid var(--p-border)' }}>{c.defaultBillingFacility}</span>}
              </div>
              <div className="text-[11px] mt-0.5 flex flex-wrap gap-x-3" style={{ color: 'var(--p-ink-500)' }}>
                {c.email && <span>{c.email}</span>}{c.phone && <span>{c.phone}</span>}
                {c.defaultContactPerson && <span>Contact: {c.defaultContactPerson}</span>}
                {c.defaultAssistanceName && <span>Assistance: {c.defaultAssistanceName}</span>}
              </div>
              {c.notes && <div className="text-[11px] mt-1 italic" style={{ color: 'var(--p-ink-500)' }}>{c.notes}</div>}
            </div>
            <button onClick={() => setEditing(c.id)} disabled={busy} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-bold p-btn-ghost shrink-0">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={() => toggle(c)} disabled={busy} className={cn('inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-bold shrink-0', c.active ? 'p-btn-ghost' : 'p-btn-primary')}>
              <Power className="w-3.5 h-3.5" /> {c.active ? 'Active' : 'Inactive'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function InsurerForm({ initial, assist, facilities, busy, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    id: initial?.id, name: initial?.name || '', email: initial?.email || '', phone: initial?.phone || '',
    workflowType: initial?.workflowType || '', defaultAssistanceCompanyId: initial?.defaultAssistanceCompanyId || '',
    defaultContactPerson: initial?.defaultContactPerson || '', defaultBillingFacilityId: initial?.defaultBillingFacilityId || '',
    notes: initial?.notes || '', active: initial?.active ?? true,
  }))
  const set = (patch) => setForm((p) => ({ ...p, ...patch }))
  return (
    <div className="p-card p-4 space-y-3" style={{ border: '1px solid var(--p-brand-mid)' }}>
      <div className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{initial ? 'Edit insurer' : 'New insurer'}</div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        <L className="lg:col-span-5" label="Company name"><input value={form.name} onChange={(e) => set({ name: e.target.value })} className="p-input h-9" placeholder="e.g. Allianz Worldwide Care" /></L>
        <L className="lg:col-span-4" label="Email"><input value={form.email} onChange={(e) => set({ email: e.target.value })} className="p-input h-9" /></L>
        <L className="lg:col-span-3" label="Phone"><input value={form.phone} onChange={(e) => set({ phone: e.target.value })} className="p-input h-9" /></L>
        <L className="lg:col-span-3" label="Workflow">
          <Select value={form.workflowType} onChange={(v) => set({ workflowType: v })}>
            <option value="">—</option><option value="direct">Direct</option><option value="assistance">Assistance</option>
          </Select>
        </L>
        <L className="lg:col-span-4" label="Default assistance company">
          <Select value={form.defaultAssistanceCompanyId} onChange={(v) => set({ defaultAssistanceCompanyId: v })}>
            <option value="">—</option>
            {assist.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </L>
        <L className="lg:col-span-2" label="Default facility">
          <Select value={form.defaultBillingFacilityId} onChange={(v) => set({ defaultBillingFacilityId: v })}>
            <option value="">—</option>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.code}</option>)}
          </Select>
        </L>
        <L className="lg:col-span-3" label="Default contact person"><input value={form.defaultContactPerson} onChange={(e) => set({ defaultContactPerson: e.target.value })} className="p-input h-9" /></L>
        <L className="lg:col-span-12" label="Notes"><input value={form.notes} onChange={(e) => set({ notes: e.target.value })} className="p-input h-9" /></L>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={busy} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold p-btn-ghost"><X className="w-3.5 h-3.5" /> Cancel</button>
        <button onClick={() => onSave(form)} disabled={busy || !form.name.trim()} className={cn('inline-flex items-center gap-1.5 h-9 px-5 rounded-full text-xs font-bold p-btn-primary', (busy || !form.name.trim()) && 'opacity-40')}><Save className="w-3.5 h-3.5" /> Save</button>
      </div>
    </div>
  )
}

// ============================================================ Assistance
function AssistanceList({ onOk, onErr }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', defaultContactPerson: '' })
  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await fetchLocalAssistanceCompanies()) } catch (e) { onErr(e) } finally { setLoading(false) }
  }, [onErr])
  useEffect(() => { load() }, [load])

  async function add() {
    if (!form.name.trim()) { onErr(new Error('Name is required.')); return }
    setBusy(true)
    try { await upsertLocalAssistanceCompany(form); onOk('Assistance company saved.'); setForm({ name: '', email: '', phone: '', defaultContactPerson: '' }); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  async function toggle(a) {
    setBusy(true)
    try { await upsertLocalAssistanceCompany({ ...a, active: !a.active }); onOk('Updated.'); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  if (loading) return <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading…</div>
  return (
    <div className="space-y-3">
      <SectionHead eyebrow="portal_local_assistance_companies" title={`Assistance Companies — ${rows.length}`}
        description="Local assistance partners referenced by insurers (default assistance) and admin billing prep." />
      <div className="p-card p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-end">
        <L className="lg:col-span-4" label="Name"><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="p-input h-9" /></L>
        <L className="lg:col-span-3" label="Email"><input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="p-input h-9" /></L>
        <L className="lg:col-span-2" label="Phone"><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="p-input h-9" /></L>
        <L className="lg:col-span-2" label="Contact"><input value={form.defaultContactPerson} onChange={(e) => setForm((p) => ({ ...p, defaultContactPerson: e.target.value }))} className="p-input h-9" /></L>
        <div className="sm:col-span-2 lg:col-span-1"><button onClick={add} disabled={busy || !form.name.trim()} className={cn('w-full inline-flex items-center justify-center gap-1 h-9 rounded-full text-xs font-bold p-btn-primary', (busy || !form.name.trim()) && 'opacity-40')}><Plus className="w-3.5 h-3.5" /></button></div>
      </div>
      <div className="space-y-1.5">
        {rows.map((a) => (
          <div key={a.id} className={cn('p-card px-3 py-2 flex items-center gap-3', !a.active && 'opacity-60')}>
            <Building2 className="w-4 h-4 shrink-0" style={{ color: 'var(--p-ink-400)' }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{a.name}</div>
              <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{[a.email, a.phone, a.defaultContactPerson].filter(Boolean).join(' · ') || '—'}</div>
            </div>
            <button onClick={() => toggle(a)} disabled={busy} className={cn('inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold', a.active ? 'p-btn-ghost' : 'p-btn-primary')}><Power className="w-3 h-3" /> {a.active ? 'Active' : 'Inactive'}</button>
          </div>
        ))}
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
