import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, X, ChevronDown, Building2, Mail, Phone } from 'lucide-react'
import { useInsurers, useDemoState } from '../context/DemoStateContext'

/* =========================================================================
 * InsurerCombobox (R3.1)
 * -----------------------------------------------------------------------
 * Demo-runtime insurer selector used in Insurance intake.
 *
 *   - Search-by-name on the live state.insurers list.
 *   - Pick an existing insurer to auto-fill email + phone.
 *   - Or open "Add new insurer" inline: enter name + email + phone →
 *     dispatched as INSURER_ADD → becomes selectable for the next case
 *     in the same session.
 *
 * Demo-only — no persistence across page refresh.
 * ========================================================================= */

export function InsurerCombobox({ value, onChange, autoFillContacts }) {
  const insurers = useInsurers()
  const { actions } = useDemoState()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(value || '')
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', email: '', phone: '' })

  // Keep input value in sync with prop
  useEffect(() => { setQ(value || '') }, [value])

  const matches = useMemo(() => {
    const ql = (q || '').trim().toLowerCase()
    if (!ql) return insurers.slice(0, 20)
    return insurers.filter((i) => i.name.toLowerCase().includes(ql)).slice(0, 20)
  }, [insurers, q])

  function pickInsurer(ins) {
    onChange?.(ins.name)
    autoFillContacts?.({ email: ins.email || '', phone: ins.phone || '' })
    setQ(ins.name)
    setOpen(false)
  }

  function addNew() {
    if (!newForm.name.trim()) return
    actions.addInsurer({ name: newForm.name.trim(), email: newForm.email.trim(), phone: newForm.phone.trim() })
    onChange?.(newForm.name.trim())
    autoFillContacts?.({ email: newForm.email.trim(), phone: newForm.phone.trim() })
    setQ(newForm.name.trim())
    setAddingNew(false)
    setNewForm({ name: '', email: '', phone: '' })
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); onChange?.(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search or type a new insurer name…"
          className="p-input pl-9 pr-9" />
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md inline-flex items-center justify-center"
          style={{ color: 'var(--p-ink-400)' }} aria-label="Toggle list">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-1 z-20 rounded-xl overflow-hidden"
             style={{ background: 'white', border: '1px solid var(--p-border-strong)', boxShadow: 'var(--p-shadow-card)' }}>
          <div className="px-3 py-2 text-[10px] uppercase tracking-[0.12em] font-bold flex items-center justify-between"
               style={{ color: 'var(--p-ink-500)', background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
            <span>{matches.length} matching insurer{matches.length !== 1 ? 's' : ''}</span>
            <button type="button" onClick={() => setOpen(false)} className="text-[11px]"><X className="w-3 h-3" /></button>
          </div>
          <ul className="max-h-56 overflow-y-auto">
            {matches.map((ins) => (
              <li key={ins.id}>
                <button type="button" onClick={() => pickInsurer(ins)}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--p-surface-tint)] flex items-start gap-2">
                  <Building2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--p-brand-mid)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: 'var(--p-ink-900)' }}>{ins.name}</div>
                    <div className="text-[10px] flex items-center gap-2 flex-wrap mt-0.5" style={{ color: 'var(--p-ink-500)' }}>
                      {ins.email && <span className="inline-flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> {ins.email}</span>}
                      {ins.phone && <span className="inline-flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> {ins.phone}</span>}
                    </div>
                  </div>
                </button>
              </li>
            ))}
            {matches.length === 0 && !addingNew && (
              <li className="px-3 py-3 text-xs text-center" style={{ color: 'var(--p-ink-500)' }}>
                No matches. <button type="button" onClick={() => { setAddingNew(true); setNewForm((f) => ({ ...f, name: q })) }} className="font-bold underline">Add "{q}" as new</button>
              </li>
            )}
          </ul>

          {!addingNew ? (
            <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--p-border)', background: 'var(--p-surface-tint)' }}>
              <button type="button" onClick={() => setAddingNew(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold p-btn-ghost">
                <Plus className="w-3 h-3" /> Add new insurer
              </button>
            </div>
          ) : (
            <div className="px-3 py-3 space-y-2 border-t" style={{ borderColor: 'var(--p-border)', background: 'var(--p-brand-pale)' }}>
              <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-brand-mid)' }}>Add new insurer (demo runtime)</div>
              <input value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Insurance company name *" className="p-input h-9" />
              <input value={newForm.email} onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email (optional)" className="p-input h-9" />
              <input value={newForm.phone} onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Phone (optional)" className="p-input h-9" />
              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={() => { setAddingNew(false); setNewForm({ name: '', email: '', phone: '' }) }}
                  className="h-8 px-3 rounded-full text-xs font-semibold p-btn-ghost">Cancel</button>
                <button type="button" onClick={addNew} disabled={!newForm.name.trim()}
                  className={'h-8 px-3 rounded-full text-xs font-bold p-btn-primary ' + (!newForm.name.trim() ? 'opacity-40 cursor-not-allowed' : '')}>
                  <Plus className="w-3 h-3 inline mr-1" /> Add & Select
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
