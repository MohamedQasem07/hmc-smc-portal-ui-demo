import { Link } from 'react-router-dom'
import {
  Plus, ArrowLeftRight, Wallet, FileText, ClipboardList, Clock,
  Building2, ArrowUpRight, ArrowDownRight, Inbox, FileBarChart2,
  MapPin, ChevronRight, FlaskConical, LogOut, Bell,
  LayoutDashboard, FilePlus2, FolderOpen,
} from 'lucide-react'
import {
  PremiumKpi, StatusPill, PremiumButton, Avatar, SectionLabel,
  MeshCorner, Sparkline,
} from '../../premium/primitives'
import { BrandMark } from '../../premium/BrandMark'
import { CASES, FACILITIES, getBranchName, getBranch, DEMO_TODAY, DEMO_TODAY_LABEL } from '../../data/mock'
import { useUserMode } from '../../context/UserModeContext'
import { fmtRelative } from '../../lib/format'

export default function PremiumClinicDashboard() {
  const { user } = useUserMode()
  const branch = getBranch(user.branchId)
  const facility = FACILITIES.find((f) => f.id === user.facilityId)
  const branchCases = CASES.filter((c) => c.branchId === user.branchId)
  const todayCases  = branchCases.filter((c) => (c.visitDate || '').slice(0, 10) === DEMO_TODAY)
  const cashToday   = todayCases.filter((c) => c.financialType === 'Cash').length
  const insToday    = todayCases.filter((c) => c.financialType === 'Insurance').length
  const pendingToday= todayCases.filter((c) => c.financialType === 'Pending').length
  const transfersIn = branchCases.filter((c) => c.route === 'Transferred In' && !c.transferReceivedAt)
  const awaiting    = branchCases.filter((c) => c.financialType === 'Pending').slice(0, 4)
  const recent      = branchCases.filter((c) => c.route !== 'Direct').slice(0, 4)

  return (
    <div className="theme-premium min-h-screen" style={{ background: 'var(--p-canvas)' }}>
      {/* ============ HERO BAND ============ */}
      <header className="p-mesh p-grid-overlay relative overflow-hidden" style={{ paddingBottom: '52px' }}>
        <MeshCorner position="tr" size={200} color="#2DD4C7" opacity={0.30} />
        <MeshCorner position="bl" size={200} color="#1E4180" opacity={0.25} />

        <div className="relative z-10 px-5 pt-5">
          {/* Top row — brand + bell + avatar */}
          <div className="flex items-center justify-between">
            <BrandMark size={36} variant="dark" />
            <div className="flex items-center gap-2">
              <button aria-label="Notifications" className="w-9 h-9 rounded-full flex items-center justify-center relative" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <Bell className="w-4 h-4 text-white/85" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: '#2DD4C7' }} />
              </button>
              <button aria-label="Sign out" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <Avatar name={user.name} size={28} tone="teal" />
              </button>
            </div>
          </div>

          {/* Demo strip */}
          <div className="mt-4 inline-flex items-center gap-2 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <FlaskConical className="w-3 h-3" style={{ color: '#7FE7DE' }} />
            <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: '#7FE7DE' }}>Design Preview · Demo Data Only</span>
          </div>

          {/* Greeting */}
          <div className="mt-4 p-rise-1">
            <div className="p-eyebrow" style={{ color: '#7FE7DE' }}>{DEMO_TODAY_LABEL} · {facility?.name}</div>
            <h1 className="p-display p-display-light text-[28px] mt-1.5 leading-tight">
              Good morning, {user.name.split(' ')[0]}.
            </h1>
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.70)' }}>
              <span className="font-semibold text-white">{branch?.name}</span> · <span>{user.title}</span>
            </p>
          </div>
        </div>
      </header>

      {/* ============ BODY (pulls up over hero) ============ */}
      <main className="px-4 pb-28 -mt-9 relative z-10 space-y-5">
        {/* Primary action card */}
        <div className="p-hero-card overflow-hidden p-rise-2 relative">
          <MeshCorner position="tr" size={140} color="#0FB5A9" opacity={0.10} />
          <div className="p-5">
            <div className="p-eyebrow mb-1.5">Primary Action</div>
            <h2 className="p-h2 text-lg">Register a new patient visit</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--p-ink-500)' }}>
              Capture in under a minute — patient, route, financial classification, documents.
            </p>
            <Link to="/design-preview/new-case" className="block mt-4">
              <PremiumButton fullWidth size="xl" leftIcon={<Plus className="w-5 h-5" />} rightIcon={<ArrowRight />}>
                Register New Case
              </PremiumButton>
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to="/design-preview/clinic-dashboard" className="block">
                <SecondaryChip icon={Inbox} label="Receive Transfer" count={transfersIn.length} tone="teal" />
              </Link>
              <Link to="/design-preview/clinic-dashboard" className="block">
                <SecondaryChip icon={FileBarChart2} label="Daily Report" tone="navy" />
              </Link>
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <section className="p-rise-3">
          <SectionLabel eyebrow="Today at the branch" title="Live Operations" />
          <div className="grid grid-cols-2 gap-3">
            <PremiumKpi label="Cases Today"     value={todayCases.length} icon={ClipboardList} tone="navy" trend={{ dir: 'up', value: '+12%', note: 'vs yesterday' }} />
            <PremiumKpi label="Cash"            value={cashToday}         icon={Wallet}        tone="cash" />
            <PremiumKpi label="Insurance"       value={insToday}          icon={FileText}      tone="teal" />
            <PremiumKpi label="Pending"         value={pendingToday}      icon={Clock}         tone="pending" />
          </div>
        </section>

        {/* Incoming transfers preview */}
        {transfersIn.length > 0 && (
          <section className="p-rise-4">
            <SectionLabel
              eyebrow="Arriving now"
              title="Incoming Transfers"
              action={<StatusPill tone="amber" dot>{transfersIn.length} pending</StatusPill>}
            />
            <div className="space-y-2.5">
              {transfersIn.map((t) => (
                <Link key={t.id} to="/design-preview/clinic-dashboard" className="block">
                  <div className="p-card p-4 relative overflow-hidden">
                    <div className="flex items-start gap-3">
                      <Avatar name={t.patient.name} size={42} tone="teal" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-[15px] truncate" style={{ color: 'var(--p-ink-900)' }}>{t.patient.name}</div>
                          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--p-ink-300)' }} />
                        </div>
                        <div className="text-[11px] font-mono" style={{ color: 'var(--p-ink-400)' }}>{t.ourRef}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <StatusPill tone="transferred">{t.transferFromName?.replace(' Clinic','').replace(' Branch','')}</StatusPill>
                          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--p-ink-500)' }}>
                            <Clock className="w-3 h-3" /> {fmtRelative(t.transferSentAt)}
                          </span>
                        </div>
                        {t.transferNote && (
                          <div className="mt-2 text-[12px] italic leading-relaxed" style={{ color: 'var(--p-ink-600)' }}>
                            “{t.transferNote}”
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Awaiting Classification */}
        {awaiting.length > 0 && (
          <section>
            <SectionLabel
              eyebrow="Needs attention"
              title="Awaiting Financial Classification"
              action={<button className="text-xs font-semibold" style={{ color: 'var(--p-teal)' }}>See all</button>}
            />
            <div className="space-y-2">
              {awaiting.map((c) => (
                <div key={c.id} className="p-card p-3.5 flex items-center gap-3">
                  <Avatar name={c.patient.name} size={38} tone="navy" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
                    <div className="text-[11px] font-mono" style={{ color: 'var(--p-ink-400)' }}>{c.ourRef}</div>
                  </div>
                  <StatusPill tone="pending" dot>Pending</StatusPill>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent transfer movement */}
        {recent.length > 0 && (
          <section>
            <SectionLabel
              eyebrow="Activity"
              title="Recent Transfer Movement"
            />
            <div className="p-card p-1.5">
              <div className="divide-y" style={{ borderColor: 'var(--p-border)' }}>
                {recent.map((c) => (
                  <div key={c.id} className="px-3 py-3 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: c.route === 'Transferred In' ? 'var(--p-teal)' : 'var(--p-transfer)' }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{c.patient.name}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>
                        {c.transferFromName || branch?.name} → {c.transferToName || branch?.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusPill tone="transferred">{c.route}</StatusPill>
                        <span className="text-[10px]" style={{ color: 'var(--p-ink-400)' }}>{fmtRelative(c.transferSentAt || c.visitDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <p className="text-center text-[10px] pt-2" style={{ color: 'var(--p-ink-400)' }}>
          Premium visual direction preview · P2A
        </p>
      </main>

      {/* ============ PREMIUM BOTTOM NAV ============ */}
      <PremiumBottomNav pendingTransfers={transfersIn.length} />
    </div>
  )
}

function SecondaryChip({ icon: Icon, label, count, tone }) {
  const styles = tone === 'teal'
    ? { bg: 'var(--p-insurance-soft)', fg: '#0A8F87', border: 'rgba(15,181,169,0.25)' }
    : { bg: 'var(--p-surface-tint)',   fg: 'var(--p-brand-mid)', border: 'var(--p-border-strong)' }
  return (
    <div className="h-12 px-3.5 rounded-xl flex items-center justify-between gap-2 transition-all"
         style={{ background: styles.bg, border: `1px solid ${styles.border}` }}>
      <span className="flex items-center gap-2 text-sm font-semibold truncate" style={{ color: styles.fg }}>
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </span>
      {typeof count === 'number' && count > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.85)', color: styles.fg }}>
          {count}
        </span>
      )}
    </div>
  )
}

function PremiumBottomNav({ pendingTransfers }) {
  // Same items as the P1 mobile nav but with premium styling
  const items = [
    { to: '/design-preview/clinic-dashboard', icon: LayoutDashboard, label: 'Home',    active: true  },
    { to: '/design-preview/clinic-dashboard', icon: ArrowLeftRight,  label: 'Transfers', badge: pendingTransfers },
    { to: '/design-preview/new-case',         icon: FilePlus2,       label: 'New Case', emphasis: true },
    { to: '/design-preview/clinic-dashboard', icon: FolderOpen,      label: 'My Cases' },
    { to: '/design-preview/clinic-dashboard', icon: FileBarChart2,   label: 'Report' },
  ]
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 px-3 pb-3 pt-2 safe-bottom">
      <div className="rounded-2xl p-2" style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        border: '1px solid rgba(15, 27, 56, 0.08)',
        boxShadow: '0 -8px 30px rgba(10, 27, 61, 0.10), 0 2px 6px rgba(10, 27, 61, 0.04)',
      }}>
        <ul className="grid grid-cols-5">
          {items.map((it, i) => (
            <li key={i} className="contents">
              <Link to={it.to} className="relative flex flex-col items-center justify-center py-1.5 gap-0.5">
                <span className={
                  it.emphasis
                    ? 'w-12 h-12 -mt-4 rounded-2xl flex items-center justify-center text-white relative'
                    : 'w-7 h-7 rounded-lg flex items-center justify-center'
                } style={
                  it.emphasis
                    ? { background: 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)', boxShadow: 'var(--p-shadow-glow)', border: '3px solid white' }
                    : it.active ? { background: 'var(--p-brand-deep)', color: 'white' } : { color: 'var(--p-ink-400)' }
                }>
                  <it.icon className={it.emphasis ? 'w-5 h-5' : 'w-4 h-4'} />
                </span>
                <span className="text-[10px] font-semibold leading-none mt-1" style={{ color: it.active ? 'var(--p-ink-900)' : 'var(--p-ink-500)' }}>
                  {it.label}
                </span>
                {typeof it.badge === 'number' && it.badge > 0 && (
                  <span className="absolute top-0.5 right-[18%] min-w-[16px] h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-1"
                        style={{ background: 'var(--p-mixed)' }}>
                    {it.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}
