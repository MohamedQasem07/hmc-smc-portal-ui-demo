import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Settings, FlaskConical, Sparkles, Building2, Users, ArrowLeftRight,
  Wallet, Heart, ListChecks, Tag, BookOpen, ChevronRight, History,
  Plus, Search, Lock, Shield, GripVertical, ChevronUp, ChevronDown,
  CircleAlert, MapPin, Star, Pencil, Archive, Landmark, Coins,
} from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import {
  PremiumKpi, PremiumButton, PremiumField, PremiumInput, PremiumSelect,
  StatusPill, SectionLabel, MeshCorner, Avatar,
} from '../../premium/primitives'
import {
  UsagePill, KindBadge, StatusBadge, ItemActions, EditDrawer,
  GovernanceFooter, ChangeHistoryDrawer,
} from '../../premium/governance'
import {
  BILLING_FACILITIES, CLINICS, CLINIC_TYPES, USERS, ROLES, PERMISSIONS,
  TRANSFER_DESTINATIONS, LOCATION_TYPES, PAYMENT_METHODS, COMPANIES, COMPANY_TYPES,
  INSURANCE_WORKFLOW, CASE_STATUSES_LIST, CURRENCIES_LIST, REFERENCE_LISTS,
  PROTECTED_SYSTEM_VALUES, CHANGE_HISTORY, governanceSummary,
} from '../../data/controlCenter'
import { FACILITIES, getBranchName } from '../../data/mock'
import { useToast } from '../../components/ui/Toast'
import { cn } from '../../lib/cn'

const CATEGORIES = [
  { id: 'billing',     icon: Landmark,       name: 'Billing Facilities',       description: 'Medical entity under whose name an invoice is opened — HMC, SMC.' },
  { id: 'clinics',     icon: Building2,      name: 'Operational Clinics',      description: 'Branches and locations where cases are registered.' },
  { id: 'users',       icon: Users,          name: 'Users & Access',           description: 'Demo users, roles, clinic assignments.' },
  { id: 'transfers',   icon: ArrowLeftRight, name: 'Transfer Destinations',    description: 'Where cases can be routed without duplicating Our Ref.' },
  { id: 'payments',    icon: Wallet,         name: 'Payment Methods',          description: 'Methods used to record cash settlements.' },
  { id: 'currencies',  icon: Coins,          name: 'Currencies',               description: 'Configurable currency list — no exchange-rate conversion.' },
  { id: 'companies',   icon: Heart,          name: 'Insurance & Assistance',   description: 'Insurance carriers, assistance & case providers.' },
  { id: 'insurance_wf',icon: ListChecks,     name: 'Insurance Workflow',       description: 'NOC, GOP, Final GOP, Invoice, Paid lifecycle (editable).' },
  { id: 'case_status', icon: Tag,            name: 'Case Statuses',            description: 'Open / Closed only. Route and insurance progression are separate.' },
  { id: 'reference',   icon: BookOpen,       name: 'Reference Lists',          description: 'Hotels, case sources, transport types.' },
]

export default function PremiumAdminControlCenter() {
  const { toast } = useToast()
  const summary = useMemo(() => governanceSummary(), [])
  const [category, setCategory] = useState('billing')
  const [editing, setEditing] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [overrides, setOverrides] = useState({}) // id → field overrides

  function applyOverride(id, patch) {
    setOverrides((o) => ({ ...o, [id]: { ...(o[id] || {}), ...patch } }))
  }

  function applyAction(action, item, moduleName) {
    const messages = {
      edit:     { kind: 'info',    title: 'Saved — demo only',     msg: `${item.name} updated locally.` },
      archive:  { kind: 'success', title: 'Archived — demo only',  msg: `${item.name} preserved with all historical records.` },
      restore:  { kind: 'success', title: 'Restored — demo only',  msg: `${item.name} is active again.` },
      delete:   { kind: 'success', title: 'Deleted — demo only',   msg: `${item.name} removed (unused custom item).` },
      add:      { kind: 'success', title: 'Created — demo only',   msg: `${item.name} added to ${moduleName}.` },
    }[action]
    if (messages) toast({ kind: messages.kind, title: messages.title, message: messages.msg })
  }

  return (
    <AdminShell active="control" searchPlaceholder="Search configuration: clinic, user, status, payment method…">
      <div className="px-6 lg:px-10 py-7 lg:py-9 space-y-7 max-w-[1500px] w-full mx-auto">

        {/* HERO BAND */}
        <section className="p-mesh p-grid-overlay rounded-2xl px-7 py-8 lg:px-10 lg:py-10 relative overflow-hidden p-rise" style={{ borderRadius: 'var(--p-radius-hero)' }}>
          <MeshCorner position="tr" size={280} color="#2DD4C7" opacity={0.28} />
          <MeshCorner position="bl" size={240} color="#1E4180" opacity={0.20} />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-6 lg:justify-between">
            <div className="max-w-2xl">
              <div className="p-eyebrow" style={{ color: '#7FE7DE' }}>
                <Settings className="w-3.5 h-3.5" /> System Setup · Admin Only
              </div>
              <h1 className="p-display p-display-light text-[34px] lg:text-[42px] mt-2">
                Admin <span style={{ color: '#7FE7DE' }}>Control Center.</span>
              </h1>
              <p className="text-sm lg:text-base mt-2.5 max-w-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Configure branches, access, workflow lists and reference data — used everywhere across the Portal.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(217, 165, 116, 0.18)', border: '1px solid rgba(217, 165, 116, 0.32)' }}>
                <FlaskConical className="w-3.5 h-3.5" style={{ color: '#E0C291' }} />
                <span className="text-[11px] font-semibold tracking-[0.10em] uppercase" style={{ color: '#E0C291' }}>Demo Configuration Only — no database is connected</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <PremiumButton variant="ghost" size="md" leftIcon={<History className="w-4 h-4" />} onClick={() => setHistoryOpen(true)}>
                Change History
              </PremiumButton>
              <PremiumButton variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => applyAction('add', { name: 'New configuration item' }, CATEGORIES.find((c) => c.id === category).name)}>
                Add Configuration
              </PremiumButton>
            </div>
          </div>
        </section>

        {/* SUMMARY TILES */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-rise-1">
          <PremiumKpi label="Billing Facilities"  value={summary.billingFacilities} icon={Landmark}     tone="navy" />
          <PremiumKpi label="Active Clinics"      value={summary.activeClinics}     icon={Building2}    tone="navy" />
          <PremiumKpi label="Active Users"        value={summary.activeUsers}       icon={Users}        tone="navy" />
          <PremiumKpi label="Currencies"          value={summary.currencies}        icon={Coins}        tone="cash" />
          <PremiumKpi label="Insurance Statuses"  value={summary.insuranceStatuses} icon={ListChecks}   tone="teal" />
          <PremiumKpi label="Archived Values"     value={summary.archivedValues}    icon={Archive}      tone="pending" />
        </section>

        {/* MAIN GRID */}
        <section className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5 p-rise-2">
          {/* LEFT — categories rail */}
          <aside className="space-y-1.5 xl:sticky xl:top-20 self-start">
            <SectionLabel eyebrow="Configuration" title="Categories" />
            <div className="p-card p-1.5 space-y-0.5">
              {CATEGORIES.map((c) => (
                <CategoryRow key={c.id} c={c} active={category === c.id} onClick={() => setCategory(c.id)} count={categoryCount(c.id)} />
              ))}
            </div>
          </aside>

          {/* RIGHT — selected module workspace */}
          <div>
            {category === 'billing'      && <BillingFacilitiesModule overrides={overrides} apply={applyAction} setEditing={setEditing} applyOverride={applyOverride} />}
            {category === 'clinics'      && <FacilitiesModule   overrides={overrides} apply={applyAction} setEditing={setEditing} applyOverride={applyOverride} />}
            {category === 'users'        && <UsersModule        overrides={overrides} apply={applyAction} setEditing={setEditing} applyOverride={applyOverride} />}
            {category === 'transfers'    && <TransfersModule    overrides={overrides} apply={applyAction} setEditing={setEditing} applyOverride={applyOverride} />}
            {category === 'payments'     && <PaymentMethodsModule overrides={overrides} apply={applyAction} setEditing={setEditing} applyOverride={applyOverride} />}
            {category === 'currencies'   && <CurrenciesModule   overrides={overrides} apply={applyAction} setEditing={setEditing} applyOverride={applyOverride} />}
            {category === 'companies'    && <CompaniesModule    overrides={overrides} apply={applyAction} setEditing={setEditing} applyOverride={applyOverride} />}
            {category === 'insurance_wf' && <InsuranceWorkflowModule overrides={overrides} apply={applyAction} setEditing={setEditing} applyOverride={applyOverride} />}
            {category === 'case_status'  && <CaseStatusModule   overrides={overrides} apply={applyAction} setEditing={setEditing} applyOverride={applyOverride} />}
            {category === 'reference'    && <ReferenceListsModule overrides={overrides} apply={applyAction} setEditing={setEditing} applyOverride={applyOverride} />}
          </div>
        </section>

        {/* PROTECTED SYSTEM VALUES */}
        <ProtectedSystemPanel />

        <p className="text-center text-[11px] pt-2" style={{ color: 'var(--p-ink-400)' }}>
          Premium visual direction · P2B.1 · Mock CRUD only
        </p>
      </div>

      <EditDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.name || ''}
        subtitle={editing?.module ? `${editing.module} · edit configuration` : ''}
        footer={editing && (
          <>
            <button className="p-btn-ghost h-10 px-4 text-sm" onClick={() => setEditing(null)}>Cancel</button>
            <PremiumButton size="md" onClick={() => { applyAction('edit', editing, editing.module || ''); setEditing(null) }}>
              Save Changes
            </PremiumButton>
          </>
        )}
      >
        {editing && <EditDrawerBody item={editing} />}
      </EditDrawer>

      <ChangeHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} entries={CHANGE_HISTORY} />
    </AdminShell>
  )
}

// ====================================================================
// Helpers
// ====================================================================
function categoryCount(id) {
  switch (id) {
    case 'billing':      return BILLING_FACILITIES.length
    case 'clinics':      return CLINICS.length
    case 'users':        return USERS.length
    case 'transfers':    return TRANSFER_DESTINATIONS.length
    case 'payments':     return PAYMENT_METHODS.length
    case 'currencies':   return CURRENCIES_LIST.length
    case 'companies':    return COMPANIES.length
    case 'insurance_wf': return INSURANCE_WORKFLOW.length
    case 'case_status':  return CASE_STATUSES_LIST.length
    case 'reference':    return Object.values(REFERENCE_LISTS).reduce((n, g) => n + g.items.length, 0)
    default:             return 0
  }
}

function CategoryRow({ c, active, onClick, count }) {
  return (
    <button onClick={onClick} className={cn('w-full text-start rounded-xl p-3.5 transition-all flex items-start gap-3', active ? 'shadow-sm' : 'hover:bg-[var(--p-surface-tint)]')}
      style={active ? { background: 'linear-gradient(135deg, rgba(15,181,169,0.10) 0%, rgba(30,65,128,0.08) 100%)', border: '1px solid rgba(15,181,169,0.30)' } : { border: '1px solid transparent' }}>
      <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: active ? 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)' : 'var(--p-surface-tint)', color: active ? 'white' : 'var(--p-brand-mid)', boxShadow: active ? 'var(--p-shadow-glow)' : 'none' }}>
        <c.icon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{c.name}</span>
          <span className="text-[11px] font-bold p-numeric" style={{ color: active ? 'var(--p-teal)' : 'var(--p-ink-400)' }}>{count}</span>
        </div>
        <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--p-ink-500)' }}>{c.description}</p>
      </div>
      {active && <ChevronRight className="w-4 h-4 mt-2.5 shrink-0" style={{ color: 'var(--p-teal)' }} />}
    </button>
  )
}

// ====================================================================
// MODULE: Billing Facilities — invoicing entity
// ====================================================================
function BillingFacilitiesModule({ setEditing, apply }) {
  return (
    <div className="space-y-4">
      <ModuleHeader
        eyebrow="Configuration · Billing"
        title="Billing Facilities"
        description="The medical entity under whose name an insurance case is opened and later invoiced. A case may be registered at any operational clinic but billed under a different facility (e.g. Tropitel Clinic → opened under SMC)."
        onAdd={() => apply('add', { name: 'New Billing Facility' }, 'Billing Facilities')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BILLING_FACILITIES.map((f) => (
          <div key={f.id} className="p-card overflow-hidden">
            <div className="p-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1E4180 0%, #0A1B3D 100%)', color: 'white', boxShadow: '0 6px 16px rgba(10,27,61,0.20)' }}>
                  <Landmark className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-base" style={{ color: 'var(--p-ink-900)' }}>{f.name}</div>
                  <div className="text-[12px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
                    <span className="font-mono font-bold" style={{ color: 'var(--p-brand-mid)' }}>{f.shortName}</span>
                    <span style={{ color: 'var(--p-ink-300)' }}>·</span>
                    Invoicing entity
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <KindBadge kind={f.kind} />
                    <StatusBadge status={f.isActive} />
                    <UsagePill count={f.usageCount} />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t text-xs flex items-center justify-end" style={{ borderColor: 'var(--p-border)', background: 'var(--p-surface-tint)' }}>
              <ItemActions item={{ ...f, casesCount: f.usageCount }}
                onEdit={(it) => setEditing({ ...it, module: 'Billing Facilities' })}
                onArchive={(it) => apply('archive', it, 'Billing Facilities')}
                onDelete={(it) => apply('delete', it, 'Billing Facilities')}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl px-4 py-3.5 flex items-start gap-2.5" style={{ background: 'var(--p-insurance-soft)', border: '1px solid rgba(15,181,169,0.20)' }}>
        <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#0A8F87' }} />
        <div className="text-xs leading-relaxed" style={{ color: '#0A6E64' }}>
          When registering an Insurance case, Admin sees an explicit <span className="font-semibold">"Open Insurance Case Under: HMC / SMC"</span> selector. This is independent of where the patient was physically registered.
        </div>
      </div>

      <GovernanceFooter entityName="billing facility" />
    </div>
  )
}

// ====================================================================
// MODULE: Operational Clinics
// ====================================================================
function FacilitiesModule({ setEditing, apply }) {
  return (
    <div className="space-y-4">
      <ModuleHeader
        eyebrow="Configuration · Clinics"
        title="Operational Clinics"
        description="Branches and locations where cases are registered. A clinic with historical cases can be deactivated but never deleted."
        onAdd={() => apply('add', { name: 'New Clinic' }, 'Operational Clinics')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CLINICS.map((c) => {
          const fac = BILLING_FACILITIES.find((f) => f.id === c.defaultBillingFacility)
          return (
            <div key={c.id} className="p-card overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--p-brand-pale)', color: 'var(--p-brand-mid)' }}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{c.name}</div>
                    <div className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
                      <span className="font-semibold">Default → {fac?.shortName}</span>
                      <span style={{ color: 'var(--p-ink-300)' }}>·</span>
                      <MapPin className="w-3 h-3" /> {c.area}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <StatusPill tone="navy">{c.type}</StatusPill>
                      {c.acceptsTransfers && <StatusPill tone="teal">Accepts transfers</StatusPill>}
                      {c.isActive ? <StatusPill tone="cash" dot>Active</StatusPill> : <StatusPill tone="amber" dot>Inactive</StatusPill>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t flex items-center justify-between gap-2 text-xs" style={{ borderColor: 'var(--p-border)', background: 'var(--p-surface-tint)' }}>
                <div className="flex items-center gap-3" style={{ color: 'var(--p-ink-600)' }}>
                  <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> <span className="font-semibold p-numeric">{c.assignedUsers}</span> users</span>
                  <span className="text-ink-300">·</span>
                  <UsagePill count={c.casesCount} />
                </div>
                <ItemActions item={{ ...c, kind: 'custom' }}
                  onEdit={(it) => setEditing({ ...it, module: 'Operational Clinics' })}
                  onArchive={(it) => apply('archive', it, 'Operational Clinics')}
                  onDelete={(it) => apply('delete', it, 'Operational Clinics')}
                />
              </div>
            </div>
          )
        })}
      </div>

      <GovernanceFooter entityName="clinic" />
    </div>
  )
}

// ====================================================================
// MODULE: Currencies
// ====================================================================
function CurrenciesModule({ setEditing, apply }) {
  return (
    <div className="space-y-4">
      <ModuleHeader
        eyebrow="Configuration · Currencies"
        title="Currencies"
        description="Configurable list of currencies. No exchange-rate conversion is performed anywhere. Reports group amounts by original currency; mixed-currency activity is flagged for Admin review."
        onAdd={() => apply('add', { name: 'New Currency' }, 'Currencies')}
      />

      <div className="p-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
            <tr>
              <th className="text-start px-4 py-3">Code</th>
              <th className="text-start px-4 py-3">Name</th>
              <th className="text-start px-4 py-3">Symbol</th>
              <th className="text-start px-4 py-3">In Registration</th>
              <th className="text-start px-4 py-3">In Payments</th>
              <th className="text-start px-4 py-3">Status</th>
              <th className="text-start px-4 py-3">Usage</th>
              <th className="text-end px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
            {CURRENCIES_LIST.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-[var(--p-surface-tint)]">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-mono font-bold" style={{ background: 'var(--p-brand-pale)', color: 'var(--p-brand-mid)' }}>{c.code}</span>
                </td>
                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--p-ink-900)' }}>{c.name}</td>
                <td className="px-4 py-3 text-lg" style={{ color: 'var(--p-ink-800)' }}>{c.symbol}</td>
                <td className="px-4 py-3"><StatusPill tone={c.inRegistration ? 'cash' : 'ghost'}>{c.inRegistration ? 'Yes' : 'No'}</StatusPill></td>
                <td className="px-4 py-3"><StatusPill tone={c.inPayments ? 'cash' : 'ghost'}>{c.inPayments ? 'Yes' : 'No'}</StatusPill></td>
                <td className="px-4 py-3"><StatusBadge status={c.isActive} /></td>
                <td className="px-4 py-3"><UsagePill count={c.usageCount} /></td>
                <td className="px-4 py-3 text-end">
                  <ItemActions item={c}
                    onEdit={(it) => setEditing({ ...it, module: 'Currencies' })}
                    onArchive={(it) => apply('archive', it, 'Currencies')}
                    onDelete={(it) => apply('delete', it, 'Currencies')}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl px-4 py-3.5 flex items-start gap-2.5" style={{ background: 'var(--p-pending-soft)', border: '1px solid rgba(225, 161, 72, 0.32)' }}>
        <Coins className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#A1672A' }} />
        <div className="text-xs leading-relaxed" style={{ color: '#7A4F1F' }}>
          <span className="font-semibold" style={{ color: '#5C3A12' }}>Currency policy:</span> no exchange-rate conversion is performed anywhere in the Portal. Every report groups amounts by original currency. A case with mixed-currency payments shows the orange <span className="font-semibold">Mixed Currency — Admin Review Required</span> banner.
        </div>
      </div>

      <GovernanceFooter entityName="currency" />
    </div>
  )
}

// ====================================================================
// MODULE: Users & Access
// ====================================================================
function UsersModule({ setEditing, apply }) {
  const [selected, setSelected] = useState(USERS[1].id)
  const user = USERS.find((u) => u.id === selected) || USERS[0]
  const role = ROLES.find((r) => r.id === user.role)

  return (
    <div className="space-y-4">
      <ModuleHeader
        eyebrow="Configuration · Users"
        title="Users & Access"
        description="Demo accounts and their assigned clinics. Real authentication and password policy are future work."
        onAdd={() => apply('add', { name: 'New User' }, 'Users & Access')}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-4">
        {/* Users list */}
        <div className="p-card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--p-border)' }}>
            <div className="text-[11px] uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--p-ink-500)' }}>Demo users</div>
            <StatusPill tone="teal">{USERS.length}</StatusPill>
          </div>
          <ul className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
            {USERS.map((u) => {
              const isActive = selected === u.id
              const r = ROLES.find((x) => x.id === u.role)
              return (
                <li key={u.id}>
                  <button onClick={() => setSelected(u.id)} className={cn('w-full text-start px-4 py-3 transition-colors flex items-center gap-3', isActive ? '' : 'hover:bg-[var(--p-surface-tint)]')} style={isActive ? { background: 'linear-gradient(90deg, rgba(15,181,169,0.06) 0%, transparent 100%)' } : {}}>
                    {isActive && <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--p-teal)' }} />}
                    <Avatar name={u.name} size={36} tone={u.role === 'admin' ? 'teal' : u.role === 'branch_manager' ? 'navy' : 'gold'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{u.name}</span>
                        <StatusBadge status={u.status} />
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{u.email}</div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <StatusPill tone={u.role === 'admin' ? 'navy' : u.role === 'branch_manager' ? 'teal' : 'pending'}>{r?.name}</StatusPill>
                        <span className="text-[10px]" style={{ color: 'var(--p-ink-400)' }}>
                          {u.clinicIds.length === 0 ? 'All clinics' : `${u.clinicIds.length} clinic${u.clinicIds.length > 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Permissions panel for selected user */}
        <div className="p-card overflow-hidden">
          <div className="p-5 border-b" style={{ borderColor: 'var(--p-border)' }}>
            <div className="flex items-start gap-3">
              <Avatar name={user.name} size={48} tone={user.role === 'admin' ? 'teal' : 'navy'} />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-base" style={{ color: 'var(--p-ink-900)' }}>{user.name}</div>
                <div className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{user.email}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusPill tone={user.role === 'admin' ? 'navy' : user.role === 'branch_manager' ? 'teal' : 'pending'}>{role?.name}</StatusPill>
                  <StatusBadge status={user.status} />
                </div>
              </div>
              <button onClick={() => setEditing({ ...user, module: 'Users & Access' })} className="p-btn-ghost h-9 px-3 text-xs inline-flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
              <Kv label="Facilities" value={user.facilityIds.map((f) => FACILITIES.find((x) => x.id === f)?.name).join(', ') || 'All'} />
              <Kv label="Clinics"    value={user.clinicIds.length === 0 ? 'All clinics' : user.clinicIds.map((c) => getBranchName(c)).join(', ')} />
              <Kv label="Last Login" value="Yesterday" />
            </div>
          </div>

          <div className="p-5">
            <div className="p-eyebrow mb-3">Permissions · demo</div>
            <ul className="space-y-1.5">
              {PERMISSIONS.map((p) => {
                const v = user.permissions[p.id]
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm" style={{ color: 'var(--p-ink-800)' }}>{p.label}</span>
                      {p.future && <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(217, 165, 116, 0.16)', color: '#A1672A', border: '1px solid rgba(217, 165, 116, 0.30)' }}>Future</span>}
                    </div>
                    <PermissionSwitch checked={v} />
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="p-btn-ghost h-9 px-3 text-xs">Reset</button>
              <PremiumButton size="sm" onClick={() => apply('edit', user, 'Users & Access')}>Save Permissions</PremiumButton>
            </div>
          </div>
        </div>
      </div>

      <GovernanceFooter entityName="user" />
    </div>
  )
}

function PermissionSwitch({ checked }) {
  return (
    <span
      className="relative w-10 h-6 rounded-full inline-block transition-all shrink-0"
      style={{ background: checked ? 'var(--p-teal)' : 'var(--p-border-strong)' }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow"
        style={{ left: checked ? '18px' : '2px', boxShadow: '0 1px 2px rgba(10,27,61,0.25)' }}
      />
    </span>
  )
}

function Kv({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-[0.14em] font-bold" style={{ color: 'var(--p-ink-400)' }}>{label}</div>
      <div className="text-[12px] font-semibold mt-0.5 truncate" style={{ color: 'var(--p-ink-800)' }}>{value}</div>
    </div>
  )
}

// ====================================================================
// MODULE: Transfer Destinations
// ====================================================================
function TransfersModule({ setEditing, apply }) {
  return (
    <div className="space-y-4">
      <ModuleHeader
        eyebrow="Configuration · Transfers"
        title="Transfer Destinations"
        description="Transfer destinations define where the same Our Ref case can continue without creating a duplicate case."
        onAdd={() => apply('add', { name: 'New Destination' }, 'Transfer Destinations')}
      />

      <div className="p-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
            <tr>
              <th className="text-start px-4 py-3">Destination</th>
              <th className="text-start px-4 py-3">Facility</th>
              <th className="text-start px-4 py-3">Type</th>
              <th className="text-start px-4 py-3">Accepts Incoming</th>
              <th className="text-start px-4 py-3">Status</th>
              <th className="text-start px-4 py-3">Usage</th>
              <th className="text-end px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
            {TRANSFER_DESTINATIONS.map((d) => (
              <tr key={d.id} className="transition-colors hover:bg-[var(--p-surface-tint)]">
                <td className="px-4 py-3">
                  <div className="font-semibold" style={{ color: 'var(--p-ink-900)' }}>{d.name}</div>
                  <div className="text-[11px] mt-0.5"><KindBadge kind={d.kind} /></div>
                </td>
                <td className="px-4 py-3 uppercase text-[11px] font-semibold" style={{ color: 'var(--p-ink-600)' }}>{d.facility}</td>
                <td className="px-4 py-3"><StatusPill tone="navy">{d.locationType}</StatusPill></td>
                <td className="px-4 py-3"><StatusPill tone={d.acceptsIncoming ? 'cash' : 'ghost'}>{d.acceptsIncoming ? 'Yes' : 'No'}</StatusPill></td>
                <td className="px-4 py-3"><StatusBadge status={d.isActive} /></td>
                <td className="px-4 py-3"><UsagePill count={d.usageCount} /></td>
                <td className="px-4 py-3 text-end">
                  <ItemActions item={d}
                    onEdit={(it) => setEditing({ ...it, module: 'Transfer Destinations' })}
                    onArchive={(it) => apply('archive', it, 'Transfer Destinations')}
                    onDelete={(it) => apply('delete', it, 'Transfer Destinations')}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <GovernanceFooter entityName="destination" />
    </div>
  )
}

// ====================================================================
// MODULE: Payment Methods
// ====================================================================
function PaymentMethodsModule({ setEditing, apply }) {
  return (
    <div className="space-y-4">
      <ModuleHeader
        eyebrow="Configuration · Payments"
        title="Payment Methods"
        description="Payment methods only classify collected amounts. Treasury and accounting logic are not included in the Portal prototype."
        onAdd={() => apply('add', { name: 'New Method' }, 'Payment Methods')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PAYMENT_METHODS.map((m) => (
          <div key={m.id} className="p-card p-4 flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: m.kind === 'system' ? 'var(--p-cash-soft)' : 'var(--p-teal-soft)', color: m.kind === 'system' ? '#0A8F62' : '#0A8F87' }}>
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{m.name}</div>
                <KindBadge kind={m.kind} />
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <StatusBadge status={m.isActive} />
                <UsagePill count={m.usageCount} />
                {m.availableForClinic ? <StatusPill tone="teal">Clinic visible</StatusPill> : <StatusPill tone="ghost">Admin only</StatusPill>}
              </div>
            </div>
            <ItemActions item={m}
              onEdit={(it) => setEditing({ ...it, module: 'Payment Methods' })}
              onArchive={(it) => apply('archive', it, 'Payment Methods')}
              onDelete={(it) => apply('delete', it, 'Payment Methods')}
              onUnarchive={!m.isActive ? (it) => apply('restore', it, 'Payment Methods') : undefined}
            />
          </div>
        ))}
      </div>

      <GovernanceFooter entityName="payment method" />
    </div>
  )
}

// ====================================================================
// MODULE: Insurance / Assistance Companies
// ====================================================================
function CompaniesModule({ setEditing, apply }) {
  const [type, setType] = useState('all')
  const filtered = COMPANIES.filter((c) => type === 'all' || c.type === type)
  return (
    <div className="space-y-4">
      <ModuleHeader
        eyebrow="Configuration · Companies"
        title="Insurance & Assistance Companies"
        description="Carriers, assistance partners, and case providers used when classifying a case as Insurance."
        onAdd={() => apply('add', { name: 'New Company' }, 'Insurance & Assistance')}
        rightSlot={
          <div className="flex items-center gap-1.5">
            <FilterTag active={type === 'all'}                    onClick={() => setType('all')}>All</FilterTag>
            {COMPANY_TYPES.map((t) => <FilterTag key={t} active={type === t} onClick={() => setType(t)}>{t}</FilterTag>)}
          </div>
        }
      />

      <div className="p-card overflow-hidden">
        <ul className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
          {filtered.map((c) => (
            <li key={c.id} className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--p-insurance-soft)', color: '#0A8F87' }}>
                <Heart className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{c.name}</div>
                  <div className="flex items-center gap-1.5">
                    <StatusPill tone={c.type === 'Insurance Company' ? 'insurance' : c.type === 'Assistance Company' ? 'teal' : 'navy'}>{c.type}</StatusPill>
                  </div>
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{c.contactNote || '—'}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <StatusBadge status={c.status} />
                  <UsagePill count={c.usageCount} />
                </div>
              </div>
              <ItemActions item={{ ...c, isActive: c.status === 'Active', kind: 'custom' }}
                onEdit={(it) => setEditing({ ...it, module: 'Insurance & Assistance' })}
                onArchive={(it) => apply('archive', it, 'Insurance & Assistance')}
                onDelete={(it) => apply('delete', it, 'Insurance & Assistance')}
              />
            </li>
          ))}
        </ul>
      </div>

      <GovernanceFooter entityName="company" />
    </div>
  )
}

function FilterTag({ active, onClick, children }) {
  return (
    <button onClick={onClick} className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all" style={active ? { background: 'var(--p-brand-deep)', color: 'white', border: '1px solid var(--p-brand-deep)' } : { background: 'var(--p-surface-tint)', color: 'var(--p-ink-600)', border: '1px solid var(--p-border)' }}>
      {children}
    </button>
  )
}

// ====================================================================
// MODULE: Insurance Workflow Statuses
// ====================================================================
function InsuranceWorkflowModule({ setEditing, apply }) {
  return (
    <div className="space-y-4">
      <ModuleHeader
        eyebrow="Configuration · Insurance Workflow"
        title="Insurance Workflow Statuses"
        description="Insurance Workflow Status tracks coverage and settlement progress such as NOC, GOP, Final GOP and Paid. It is separate from the clinical / operational Case Status."
        onAdd={() => apply('add', { name: 'New Status' }, 'Insurance Workflow Statuses')}
      />

      <div className="p-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] font-bold" style={{ borderColor: 'var(--p-border)', background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)' }}>
          <span className="w-5" />
          <span className="w-7" />
          <span className="flex-1">Status</span>
          <span className="w-28 hidden md:inline">Cases Using</span>
          <span className="w-20 hidden md:inline">Type</span>
          <span className="w-20">Status</span>
          <span className="w-24 text-end">Actions</span>
        </div>
        <ul className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
          {INSURANCE_WORKFLOW.map((s, i) => (
            <li key={s.id} className="px-4 py-3 flex items-center gap-3 transition-colors hover:bg-[var(--p-surface-tint)]">
              <span className="w-5 text-[10px] font-bold p-numeric text-end" style={{ color: 'var(--p-ink-400)' }}>{s.order}</span>
              <span className="w-7 h-7 rounded-md shrink-0" style={{ background: s.color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }} aria-label={`Color ${s.color}`} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{s.name}</div>
                <div className="text-[10px] font-mono" style={{ color: 'var(--p-ink-400)' }}>{s.color}</div>
              </div>
              <span className="w-28 hidden md:flex"><UsagePill count={s.casesCount} /></span>
              <span className="w-20 hidden md:flex"><KindBadge kind={s.kind} /></span>
              <span className="w-20"><StatusBadge status={s.isActive} /></span>
              <span className="w-24 flex justify-end">
                <ItemActions item={s}
                  onEdit={(it) => setEditing({ ...it, module: 'Insurance Workflow Statuses' })}
                  onArchive={(it) => apply('archive', it, 'Insurance Workflow Statuses')}
                  onDelete={(it) => apply('delete', it, 'Insurance Workflow Statuses')}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <PreviewTimeline />
      <GovernanceFooter entityName="status" />
    </div>
  )
}

function PreviewTimeline() {
  const sample = INSURANCE_WORKFLOW.slice(0, 6)
  return (
    <div className="p-card p-5">
      <div className="p-eyebrow mb-3">Preview · workflow timeline</div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {sample.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: s.color + '22', border: `1px solid ${s.color}66` }}>
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--p-ink-800)' }}>{s.name}</span>
            </div>
            {i < sample.length - 1 && <ChevronRight className="w-3 h-3" style={{ color: 'var(--p-ink-300)' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ====================================================================
// MODULE: Case Statuses
// ====================================================================
function CaseStatusModule({ setEditing, apply }) {
  return (
    <div className="space-y-4">
      <ModuleHeader
        eyebrow="Configuration · Case Statuses"
        title="Operational Case Statuses"
        description="Case Status represents the operational state of the patient case. Insurance progression is managed separately under Insurance Workflow."
        onAdd={() => apply('add', { name: 'New Status' }, 'Case Statuses')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CASE_STATUSES_LIST.map((s) => (
          <div key={s.id} className="p-card p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl shrink-0" style={{ background: s.color + '22', border: `1px solid ${s.color}55` }}>
              <span className="block w-full h-full rounded-xl" style={{ background: `linear-gradient(135deg, ${s.color} 0%, transparent 100%)`, opacity: 0.6 }} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-sm" style={{ color: 'var(--p-ink-900)' }}>{s.name}</div>
                <KindBadge kind={s.kind} />
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <StatusBadge status={s.isActive} />
                <UsagePill count={s.casesCount} />
                <span className="text-[10px] font-mono" style={{ color: 'var(--p-ink-400)' }}>{s.color}</span>
              </div>
            </div>
            <ItemActions item={s}
              onEdit={(it) => setEditing({ ...it, module: 'Case Statuses' })}
              onArchive={(it) => apply('archive', it, 'Case Statuses')}
              onDelete={(it) => apply('delete', it, 'Case Statuses')}
            />
          </div>
        ))}
      </div>

      <GovernanceFooter entityName="case status" />
    </div>
  )
}

// ====================================================================
// MODULE: Reference Lists
// ====================================================================
function ReferenceListsModule({ setEditing, apply }) {
  const groups = Object.entries(REFERENCE_LISTS)
  return (
    <div className="space-y-5">
      <ModuleHeader
        eyebrow="Configuration · Reference Lists"
        title="Reference Lists"
        description="Dropdown values that drive registration fields across Add New Case and reports."
        onAdd={() => apply('add', { name: 'New value' }, 'Reference Lists')}
      />

      {groups.map(([key, group]) => (
        <div key={key} className="p-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--p-border)' }}>
            <div>
              <div className="p-eyebrow">{group.title}</div>
              <p className="text-[11px] mt-1 max-w-lg" style={{ color: 'var(--p-ink-500)' }}>{group.helper}</p>
            </div>
            <button onClick={() => apply('add', { name: `New value in ${group.title}` }, group.title)} className="p-btn-ghost h-9 px-3 text-xs inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add value
            </button>
          </div>
          <ul className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
            {group.items.map((item) => (
              <li key={item.id} className="px-5 py-3 flex items-center gap-3 transition-colors hover:bg-[var(--p-surface-tint)]">
                <Star className="w-3.5 h-3.5" style={{ color: 'var(--p-ink-300)' }} />
                <div className="font-semibold text-sm flex-1" style={{ color: 'var(--p-ink-900)' }}>{item.name}</div>
                <KindBadge kind={item.kind} />
                <StatusBadge status={item.isActive} />
                <UsagePill count={item.usageCount} />
                <ItemActions item={item}
                  onEdit={(it) => setEditing({ ...it, module: group.title })}
                  onArchive={(it) => apply('archive', it, group.title)}
                  onDelete={(it) => apply('delete', it, group.title)}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <GovernanceFooter entityName="value" />
    </div>
  )
}

// ====================================================================
// Protected System Panel
// ====================================================================
function ProtectedSystemPanel() {
  return (
    <section className="p-card overflow-hidden p-rise-3 relative" style={{ background: 'linear-gradient(180deg, #FBF5EC 0%, #FFFFFF 100%)', border: '1px solid rgba(217, 165, 116, 0.32)' }}>
      <MeshCorner position="tr" size={180} color="#D9A574" opacity={0.10} />
      <div className="relative z-10 p-6 lg:p-8">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(217, 165, 116, 0.18)', color: '#9A6E36' }}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="p-eyebrow" style={{ color: '#9A6E36' }}>Protected System Values</div>
              <h2 className="p-h2 text-lg mt-1">Locked workflow concepts</h2>
              <p className="text-sm mt-1.5 max-w-2xl" style={{ color: 'var(--p-ink-600)' }}>
                These three sets drive every workflow and every report. Any future change requires owner approval and a coordinated backend design review.
              </p>
            </div>
          </div>
          <KindBadge kind="protected" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(PROTECTED_SYSTEM_VALUES).map(([key, def]) => (
            <div key={key} className="rounded-xl bg-white p-4 border" style={{ borderColor: 'rgba(217, 165, 116, 0.32)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Lock className="w-3.5 h-3.5" style={{ color: '#9A6E36' }} />
                <span className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{def.label}</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--p-ink-500)' }}>{def.helper}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {def.values.map((v) => (
                  <span key={v} className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: 'var(--p-pending-soft)', color: '#7A4F1F', border: '1px solid rgba(225, 161, 72, 0.32)' }}>
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ====================================================================
// Module header + edit drawer body
// ====================================================================
function ModuleHeader({ eyebrow, title, description, onAdd, rightSlot }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-1">
      <div>
        <div className="p-eyebrow">{eyebrow}</div>
        <h2 className="p-h2 text-xl mt-1">{title}</h2>
        <p className="text-sm mt-1.5 max-w-2xl" style={{ color: 'var(--p-ink-500)' }}>{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightSlot}
        {onAdd && (
          <PremiumButton size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={onAdd}>
            Add
          </PremiumButton>
        )}
      </div>
    </div>
  )
}

function EditDrawerBody({ item }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg px-3 py-2.5 text-xs flex items-start gap-2" style={{ background: 'var(--p-insurance-soft)', border: '1px solid rgba(15,181,169,0.20)', color: '#0A6E64' }}>
        <FlaskConical className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>Edits saved here are <span className="font-semibold">local prototype state only</span>. No database is connected. This UI demonstrates how the production edit flow will feel.</span>
      </div>

      <PremiumField label="Name" required>
        <PremiumInput defaultValue={item.name} />
      </PremiumField>

      {item.color && (
        <PremiumField label="Display color">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-xl shrink-0" style={{ background: item.color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }} />
            <PremiumInput defaultValue={item.color} />
          </div>
        </PremiumField>
      )}

      {item.casesCount !== undefined && (
        <div className="rounded-lg px-3 py-2.5 text-xs flex items-start gap-2" style={{ background: 'var(--p-pending-soft)', border: '1px solid rgba(225, 161, 72, 0.32)', color: '#7A4F1F' }}>
          <Archive className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>This item is used by <span className="font-semibold">{item.casesCount}</span> case(s). It can be renamed or archived but never hard-deleted.</span>
        </div>
      )}

      <PremiumField label="Status">
        <PremiumSelect defaultValue={item.isActive === false ? 'inactive' : 'active'}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </PremiumSelect>
      </PremiumField>

      <PremiumField label="Reason / Note" hint="Optional — recorded in change history.">
        <PremiumInput placeholder="e.g. Renamed for clarity" />
      </PremiumField>
    </div>
  )
}
