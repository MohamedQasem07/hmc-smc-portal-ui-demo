import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BedDouble, CreditCard, Globe2, Plus, RefreshCw, AlertTriangle, CheckCircle2,
  Search, Save, X, ShieldCheck,
} from 'lucide-react'
import { SectionHead } from '../../../../premium/p2cPrimitives'
import { StatusPill } from '../../../../premium/primitives'
import {
  fetchLocations, fetchRooms, upsertRoom, setRoomActive,
  fetchPaymentMethods, setPaymentMethodActive,
  fetchNationalities, setNationalityActive,
} from '../../../../lib/api/portalData'
import { cn } from '../../../../lib/cn'

/* =========================================================================
 * LiveReferenceConfig (config-first staging) — supabase mode only.
 * Admin-configurable reference data persisted to portal_*:
 *   - Rooms (portal_rooms) per main branch — add / rename / activate
 *   - Payment methods (portal_payment_methods) — toggle active
 *   - Nationalities (portal_nationalities) — search + toggle active (245 seeded)
 * All writes gated by admin RLS.
 * ========================================================================= */

function Banner({ tone, children, onClose }) {
  const s = tone === 'ok'
    ? { bg: 'var(--p-finalized-soft)', fg: '#076D4A', bd: '#9FD4BB', I: CheckCircle2 }
    : { bg: 'var(--p-mixed-soft)', fg: '#B14242', bd: '#F0B5B5', I: AlertTriangle }
  const I = s.I
  return (
    <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]" style={{ background: s.bg, color: s.fg, border: `1px solid ${s.bd}` }}>
      <I className="w-4 h-4 mt-0.5 shrink-0" /><span className="flex-1 font-semibold">{children}</span>
      {onClose && <button onClick={onClose}><X className="w-3.5 h-3.5" /></button>}
    </div>
  )
}

export default function LiveReferenceConfig() {
  const [tab, setTab] = useState('rooms')
  const [feedback, setFeedback] = useState(null)
  const ok = (m) => setFeedback({ tone: 'ok', m })
  const err = (e) => setFeedback({ tone: 'err', m: e?.message || String(e) })

  return (
    <div className="space-y-5">
      <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-[12px]"
        style={{ background: 'var(--p-brand-pale)', color: 'var(--p-ink-800)', border: '1px solid #BCCDE8' }}>
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--p-brand-mid)' }} />
        <span>Live admin configuration — saved to Supabase (<strong>portal_rooms</strong>, <strong>portal_payment_methods</strong>, <strong>portal_nationalities</strong>). Admin-only via RLS.</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {[['rooms', 'Rooms', BedDouble], ['payments', 'Payment Methods', CreditCard], ['nationalities', 'Nationalities', Globe2]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => { setTab(id); setFeedback(null) }}
            className={cn('inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-bold', tab === id ? 'p-btn-primary' : 'p-btn-ghost')}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {feedback && <Banner tone={feedback.tone} onClose={() => setFeedback(null)}>{feedback.m}</Banner>}

      {tab === 'rooms' && <RoomsConfig onOk={ok} onErr={err} />}
      {tab === 'payments' && <PaymentMethodsConfig onOk={ok} onErr={err} />}
      {tab === 'nationalities' && <NationalitiesConfig onOk={ok} onErr={err} />}
    </div>
  )
}

// ===================================================================== Rooms
function RoomsConfig({ onOk, onErr }) {
  const [locations, setLocations] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [locs, rms] = await Promise.all([fetchLocations(), fetchRooms()])
      setLocations(locs.filter((l) => l.type === 'main_branch'))
      setRooms(rms)
    } catch (e) { onErr(e) } finally { setLoading(false) }
  }, [onErr])
  useEffect(() => { load() }, [load])

  const byBranch = useMemo(() => {
    const m = {}
    for (const r of rooms) (m[r.locationId] ||= []).push(r)
    return m
  }, [rooms])

  async function addRoom(loc) {
    setBusy(true)
    try {
      const existing = byBranch[loc.id] || []
      const nextNum = existing.length + 1
      const code = String(nextNum).padStart(2, '0')
      await upsertRoom({ locationId: loc.id, roomCode: code, roomName: `Room ${code}`, sortOrder: nextNum, active: true })
      onOk(`Room ${code} added to ${loc.name}.`)
      await load()
    } catch (e) { onErr(e) } finally { setBusy(false) }
  }
  async function toggle(room) {
    setBusy(true)
    try { await setRoomActive(room.id, !room.active); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  async function rename(room, name) {
    if (!name || name === room.roomName) return
    setBusy(true)
    try { await upsertRoom({ id: room.id, locationId: room.locationId, roomCode: room.roomCode, roomName: name, sortOrder: room.sortOrder, active: room.active }); onOk('Room renamed.'); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }

  if (loading) return <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading rooms…</div>

  return (
    <div className="space-y-5">
      <SectionHead eyebrow="portal_rooms" title="Branch Treatment Rooms" description="Add, rename, or deactivate rooms per main branch. Reception room-assignment uses active rooms." />
      {locations.length === 0 && <div className="p-card p-6 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No main branches.</div>}
      {locations.map((loc) => {
        const list = (byBranch[loc.id] || [])
        const activeN = list.filter((r) => r.active).length
        return (
          <section key={loc.id} className="p-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--p-ink-900)' }}>{loc.name}</h3>
                <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{activeN} active · {list.length} total rooms</div>
              </div>
              <button onClick={() => addRoom(loc)} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-bold p-btn-primary">
                <Plus className="w-3.5 h-3.5" /> Add Room
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {list.map((r) => (
                <div key={r.id} className={cn('rounded-xl px-3 py-2.5 flex items-center justify-between gap-2', !r.active && 'opacity-55')}
                  style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                  <div className="min-w-0">
                    <input defaultValue={r.roomName} onBlur={(e) => rename(r, e.target.value.trim())}
                      className="bg-transparent text-sm font-semibold w-full focus:outline-none" style={{ color: 'var(--p-ink-900)' }} />
                    <div className="text-[10px] font-mono" style={{ color: 'var(--p-ink-500)' }}>code {r.roomCode}</div>
                  </div>
                  <button onClick={() => toggle(r)} disabled={busy} className="shrink-0">
                    {r.active ? <StatusPill tone="cash">Active</StatusPill> : <StatusPill tone="navy">Off</StatusPill>}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ============================================================ Payment methods
function PaymentMethodsConfig({ onOk, onErr }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await fetchPaymentMethods()) } catch (e) { onErr(e) } finally { setLoading(false) }
  }, [onErr])
  useEffect(() => { load() }, [load])

  async function toggle(m) {
    setBusy(true)
    try { await setPaymentMethodActive(m.code, !m.active); onOk(`${m.label} ${!m.active ? 'enabled' : 'disabled'}.`); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  if (loading) return <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading…</div>
  return (
    <div className="space-y-3">
      <SectionHead eyebrow="portal_payment_methods" title="Payment Methods" description="Toggle which methods/purposes are active. Cash settles in original currency; Visa/Card settles EGP. Patient excess is a collection purpose." />
      <div className="p-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
            {['Method / Purpose', 'Kind', 'Settlement', 'Status'].map((h) => <th key={h} className="px-4 py-2.5 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.code} style={{ borderTop: '1px solid var(--p-border)' }}>
                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--p-ink-900)' }}>{m.label}<div className="text-[10px] font-mono" style={{ color: 'var(--p-ink-400)' }}>{m.code}</div></td>
                <td className="px-4 py-3"><span className="text-[11px] uppercase font-bold" style={{ color: m.kind === 'purpose' ? '#A1672A' : 'var(--p-brand-mid)' }}>{m.kind}</span></td>
                <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--p-ink-600)' }}>{m.settlement_note}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(m)} disabled={busy}>
                    {m.active ? <StatusPill tone="cash" icon={CheckCircle2}>Active</StatusPill> : <StatusPill tone="navy">Inactive</StatusPill>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================= Nationalities
function NationalitiesConfig({ onOk, onErr }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await fetchNationalities({ activeOnly: false })) } catch (e) { onErr(e) } finally { setLoading(false) }
  }, [onErr])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = s ? rows.filter((r) => r.name_en.toLowerCase().includes(s)) : rows
    return list.slice(0, 60)
  }, [rows, q])
  const activeN = rows.filter((r) => r.active).length

  async function toggle(n) {
    setBusy(true)
    try { await setNationalityActive(n.id, !n.active); await load() }
    catch (e) { onErr(e) } finally { setBusy(false) }
  }
  if (loading) return <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading…</div>
  return (
    <div className="space-y-3">
      <SectionHead eyebrow="portal_nationalities" title={`Nationalities — ${activeN}/${rows.length} active`} description="Full reference list (seeded from the legacy list). Toggle active; active ones appear in the New Case nationality picker." />
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search nationality…" className="p-input h-10 pl-9 pr-3 w-full" />
      </div>
      <div className="p-card overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n) => (
            <div key={n.id} className={cn('flex items-center justify-between gap-2 px-4 py-2.5', !n.active && 'opacity-50')} style={{ borderTop: '1px solid var(--p-border)' }}>
              <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--p-ink-900)' }}>{n.flag ? `${n.flag} ` : ''}{n.name_en}</span>
              <button onClick={() => toggle(n)} disabled={busy} className="shrink-0">
                {n.active ? <StatusPill tone="cash">On</StatusPill> : <StatusPill tone="navy">Off</StatusPill>}
              </button>
            </div>
          ))}
        </div>
      </div>
      {q.trim() === '' && rows.length > 60 && <div className="text-[11px] text-center" style={{ color: 'var(--p-ink-400)' }}>Showing first 60 — search to find others.</div>}
    </div>
  )
}
