import { Link } from 'react-router-dom'
import {
  ListChecks, BedDouble, MapPin, CreditCard, ShieldCheck, Coins,
  Lock, ChevronRight,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import { SectionHead, DemoBanner } from '../../premium/p2cPrimitives'
import { StatusPill } from '../../premium/primitives'
import { EXTERNAL_CLINICS, RECEIVING_BRANCHES } from '../../data/p2c'
import {
  R1_PAYMENT_METHODS, R1_CURRENCIES, R1_OTHER_TRANSFER_DESTINATIONS,
} from '../../data/p2cR1'

/* =========================================================================
 * P2C.R2 — Admin Control Center · Reference Lists (UI concept)
 * -----------------------------------------------------------------------
 * Read-only previews of the admin-configurable reference data the
 * operational workflows use. No backend, no editing — these screens
 * just demonstrate WHAT will be configurable in the future.
 * ========================================================================= */

const INSURERS = [
  'Demo Allianz Worldwide Care',
  'Demo Europ Assistance',
  'Demo Bupa',
  'Demo Mondial Assistance',
  'Demo Roland Assistance',
  'Demo AXA Assistance',
]

export default function PremiumAdminReferenceLists() {
  return (
    <AdminShell active="reference-lists">
      <div className="px-5 md:px-8 lg:px-10 pt-6 pb-16 max-w-[1200px] mx-auto space-y-6">

        <DemoBanner>
          Admin Control Center · Reference Lists — read-only UI concept. Future-configurable lists, no backend.
        </DemoBanner>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="p-eyebrow mb-1">Control Center</div>
            <h1 className="p-h1 text-2xl sm:text-3xl" style={{ color: 'var(--p-ink-900)' }}>Reference Lists</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--p-ink-500)' }}>
              The lists below are used across all P2C workflows. They are read-only here — admin editing is a future feature.
            </p>
          </div>
          <Link to="/design-preview/admin-dashboard"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold p-btn-ghost">
            ← Admin Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          <RefCard icon={MapPin} title="Transfer Destinations"
            description="Primary main branches + admin-configurable Other destinations. Used in External Clinic Route step.">
            <List items={[
              ...RECEIVING_BRANCHES.map((b) => ({ label: b.name, kind: 'Branch · core' })),
              ...R1_OTHER_TRANSFER_DESTINATIONS.map((d) => ({ label: d, kind: 'Other · configurable' })),
            ]} />
          </RefCard>

          <RefCard icon={BedDouble} title="Main Branch Treatment Rooms"
            description="15 internal rooms per main branch (admin-configurable list concept for the future).">
            <div className="grid grid-cols-2 gap-2">
              {RECEIVING_BRANCHES.map((b) => (
                <div key={b.id} className="rounded-xl p-3" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                  <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>{b.name}</div>
                  <div className="mt-2 grid grid-cols-5 gap-1">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <span key={i} className="h-7 rounded-md text-[10px] font-bold inline-flex items-center justify-center"
                        style={{ background: 'white', color: 'var(--p-ink-700)', border: '1px solid var(--p-border)' }}>{String(i + 1).padStart(2, '0')}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </RefCard>

          <RefCard icon={CreditCard} title="Payment Methods"
            description="Used in cash + excess payment lines. Visa / Card always settles in EGP.">
            <List items={R1_PAYMENT_METHODS.map((m) => ({ label: m, kind: m === 'Visa / Card' ? 'Settles EGP only · Bank Collection' : 'Physical cash if currency = local cash' }))} />
          </RefCard>

          <RefCard icon={Coins} title="Currencies"
            description="Cash treasury balances are tracked separately per currency. Visa / Bank uses EGP only.">
            <List items={R1_CURRENCIES.map((c) => ({ label: c, kind: c === 'EGP' ? 'Local + Visa settlement' : 'Foreign cash + FX-referenced visa line' }))} />
          </RefCard>

          <RefCard icon={ShieldCheck} title="Insurance Companies"
            description="Demo insurer names. Operational user picks an insurer when opening an Insurance case.">
            <List items={INSURERS.map((n) => ({ label: n, kind: 'Demo placeholder' }))} />
          </RefCard>

          <RefCard icon={ListChecks} title="External Clinic Identities"
            description="Sources where external clinic users register cases. Each is a separate workspace identity.">
            <List items={EXTERNAL_CLINICS.map((c) => ({ label: c.name, kind: `${c.city}` }))} />
          </RefCard>

        </div>

        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'var(--p-pending-soft)', color: '#7A4F1F', border: '1px solid #F0C97A' }}>
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="text-[12px] leading-relaxed">
            <strong>Future capability — read-only here.</strong> Editing these lists, audit logging, version diffing, and configurable
            per-branch / per-clinic overrides are out of scope for the R2 demo. Invoice Manager remains a protected placeholder.
          </div>
        </div>

      </div>
    </AdminShell>
  )
}

function RefCard({ icon: Icon, title, description, children }) {
  return (
    <section className="p-card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0"
          style={{ background: 'var(--p-teal-soft)', color: '#0A8F87' }}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="p-h2 text-base" style={{ color: 'var(--p-ink-900)' }}>{title}</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{description}</p>
        </div>
        <StatusPill tone="navy"><Lock className="w-3 h-3" /> Read-only</StatusPill>
      </div>
      {children}
    </section>
  )
}

function List({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
          style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{item.label}</span>
          <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>{item.kind}</span>
        </li>
      ))}
    </ul>
  )
}
