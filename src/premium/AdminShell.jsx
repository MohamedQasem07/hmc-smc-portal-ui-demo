import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, FileBarChart2, FileLock2, Settings,
  Bell, Search, ChevronDown, Sparkles, BookOpen, Plus, Banknote,
  Stethoscope, Menu, X, History, Calendar, Send, LogOut, Users,
} from 'lucide-react'
import { BrandWordmark } from './BrandMark'
import { Avatar, StatusPill } from './primitives'
import { useUserMode } from '../context/UserModeContext'
import { cn } from '../lib/cn'

/**
 * AdminShell — premium dark sidebar + glass topbar for Admin preview routes.
 * Active nav item is controlled by `active` prop. Sidebar is FIXED on desktop so it stays
 * visible while the main content scrolls. Mobile shows a top bar with a menu drawer.
 */
export function AdminShell({ active = 'dashboard', searchPlaceholder = 'Search patient, Our Ref, insurance ref…', children }) {
  return (
    <div className="theme-premium min-h-screen" style={{ background: 'var(--p-canvas)' }}>
      <PremiumSidebar active={active} />
      <main className="flex-1 min-w-0 flex flex-col lg:pl-[260px]">
        <PremiumTopBar placeholder={searchPlaceholder} active={active} />
        {children}
      </main>
    </div>
  )
}

// --------------------------------------------------------------------
const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',           icon: LayoutDashboard, to: '/design-preview/admin-dashboard' },
  { id: 'new-case',     label: '+ New Case',          icon: Plus,            to: '/design-preview/admin/new-case', emphasis: true },
  { id: 'cases',        label: 'Cases Master',        icon: ClipboardList,   to: '/design-preview/admin/cases-master' },
  { id: 'legacy',       label: 'Legacy Review',       icon: BookOpen,        to: '/design-preview/admin/legacy-review' },
  { id: 'collections',  label: 'Collections & Treasury', icon: Banknote,     to: '/design-preview/admin/collections' },
  { id: 'reports-daily',  label: 'Daily Report',      icon: FileBarChart2,   to: '/design-preview/admin/reports/daily',   indent: true },
  { id: 'reports-monthly',label: 'Monthly Report',    icon: Calendar,        to: '/design-preview/admin/reports/monthly', indent: true },
  { id: 'repatriation', label: 'Repatriation Entry',  icon: Stethoscope,     to: '/design-preview/admin/repatriation' },
  { id: 'p2c-cases',    label: 'Clinic & Reception',  icon: Send,            to: '/design-preview/admin/p2c-cases', section: 'Clinic & Reception' },
  { id: 'insurance-completion', label: 'Insurance Completion', icon: FileLock2, to: '/design-preview/admin/insurance-completion', section: 'Clinic & Reception' },
  { id: 'users-staff',  label: 'Users & Staff',       icon: Users,           to: '/design-preview/admin/users-staff', section: 'Administration' },
  { id: 'control',      label: 'Control Center',      icon: Settings,        to: '/design-preview/admin-control-center', section: 'Configuration' },
  { id: 'manager',      label: 'Invoice Manager',     icon: FileLock2,       to: '/design-preview/admin-dashboard', restricted: true, section: 'Protected' },
]

function PremiumSidebar({ active }) {
  return (
    <aside className="hidden lg:flex flex-col w-[260px] fixed inset-y-0 left-0 z-30 overflow-hidden" style={{
      background: 'linear-gradient(180deg, #0A1B3D 0%, #08213F 100%)',
      borderRight: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span className="absolute -top-32 -left-16 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(15,181,169,0.18) 0%, transparent 65%)' }} />
      <span className="absolute -bottom-32 -right-16 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(94,131,181,0.15) 0%, transparent 65%)' }} />

      <div className="relative z-10 px-5 py-5 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <BrandWordmark variant="light" />
      </div>

      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <NavSection label="Admin Workspace" />
        {NAV_ITEMS.filter((n) => !n.section).map((n) => (
          <NavLink key={n.id} to={n.to} icon={n.icon} label={n.label} active={active === n.id} emphasis={n.emphasis} indent={n.indent} />
        ))}

        {['Clinic & Reception', 'Administration', 'Configuration', 'Protected'].map((sec) => (
          <div key={sec}>
            <NavSection label={sec} className="mt-4" />
            {NAV_ITEMS.filter((n) => n.section === sec).map((n) => (
              <NavLink key={n.id} to={n.to} icon={n.icon} label={n.label} active={active === n.id} restricted={n.restricted} />
            ))}
          </div>
        ))}

        <NavSection label="Other" className="mt-4" />
        <NavLink to="/design-preview/admin-dashboard" icon={Settings} label="Settings" />
      </nav>

      <SidebarUserCard />
    </aside>
  )
}

function SidebarUserCard() {
  const navigate = useNavigate()
  const { currentUser, signOut } = useUserMode()
  const name = currentUser?.displayName || 'Demo Administrator'
  const role = currentUser?.role === 'admin' ? 'Financial Director'
    : currentUser?.role === 'clinic_nurse' ? 'External Clinic User'
    : currentUser?.role === 'reception_kawther' ? 'Al-Kawther Reception'
    : currentUser?.role === 'reception_sheraton' ? 'Sheraton Reception'
    : 'Demo Administrator'
  function doSignOut() {
    signOut()
    navigate('/design-preview/login', { replace: true })
  }
  return (
    <div className="relative z-10 px-4 pb-4 pt-3 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <Avatar name={name} size={36} tone="teal" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">{name}</div>
            <div className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>{role}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={doSignOut}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[12px] font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.78)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </div>
  )
}

function NavSection({ label, className }) {
  return <div className={cn('px-3 pt-2 pb-1.5 text-[10px] uppercase tracking-[0.16em] font-bold', className)} style={{ color: 'rgba(255,255,255,0.32)' }}>{label}</div>
}

function NavLink({ to, icon: Icon, label, active, restricted, emphasis, indent }) {
  return (
    <Link to={to} className={cn(
      'relative flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition-all',
      indent ? 'px-3 ms-3' : 'px-3',
      active ? 'text-white' : 'hover:bg-white/5',
    )} style={{
      background: active ? 'linear-gradient(135deg, rgba(15,181,169,0.18) 0%, rgba(30,65,128,0.18) 100%)' :
                  emphasis ? 'linear-gradient(135deg, rgba(15,181,169,0.10) 0%, rgba(15,181,169,0.04) 100%)' :
                  'transparent',
      color: active ? 'white' : emphasis ? '#7FE7DE' : 'rgba(255,255,255,0.65)',
      border: active ? '1px solid rgba(15,181,169,0.32)' :
              emphasis ? '1px solid rgba(15,181,169,0.20)' :
              '1px solid transparent',
      boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.04)' : 'none',
    }}>
      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: '#0FB5A9' }} />}
      <Icon className={cn('shrink-0', emphasis ? 'w-4 h-4' : 'w-4 h-4', indent && 'ms-1.5')} />
      <span className="flex-1 text-[13px]">{label}</span>
      {restricted && (
        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: 'rgba(217, 165, 116, 0.18)', color: '#E0C291', border: '1px solid rgba(217, 165, 116, 0.32)' }}>
          Protected
        </span>
      )}
    </Link>
  )
}

function PremiumTopBar({ placeholder, active }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden lg:flex sticky top-0 z-20 h-16 px-6 lg:px-10 items-center justify-between" style={{
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        borderBottom: '1px solid var(--p-border)',
      }}>
        <div className="flex items-center gap-3">
          <StatusPill tone="navy" dot>Admin Workspace</StatusPill>
          <span className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>Wednesday, 27 May 2026</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--p-ink-400)' }} />
            <input
              placeholder={placeholder}
              className="h-10 w-80 rounded-full pl-9 pr-4 text-sm focus-visible:outline-none transition-all"
              style={{
                background: 'var(--p-surface-tint)',
                border: '1px solid var(--p-border)',
                color: 'var(--p-ink-700)',
              }}
            />
          </div>
          <button className="w-10 h-10 rounded-full relative flex items-center justify-center transition-colors hover:bg-[var(--p-surface-tint)]">
            <Bell className="w-4 h-4" style={{ color: 'var(--p-ink-600)' }} />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full" style={{ background: 'var(--p-mixed)' }} />
          </button>
          <TopBarUserMenu />
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between" style={{
        background: 'rgba(10, 27, 61, 0.95)',
        backdropFilter: 'blur(14px) saturate(160%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}>
          <Menu className="w-5 h-5" />
        </button>
        <BrandWordmark variant="light" compact />
        <MobileSignOutButton />
      </header>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 p-fade-in">
          <div className="absolute inset-0" style={{ background: 'rgba(10,27,61,0.5)', backdropFilter: 'blur(2px)' }} onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85%] flex flex-col overflow-hidden" style={{
            background: 'linear-gradient(180deg, #0A1B3D 0%, #08213F 100%)',
            animation: 'p-rise 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
          }}>
            <div className="px-5 py-5 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <BrandWordmark variant="light" compact />
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              <NavSection label="Admin Workspace" />
              {NAV_ITEMS.filter((n) => !n.section).map((n) => (
                <NavLink key={n.id} to={n.to} icon={n.icon} label={n.label} active={active === n.id} emphasis={n.emphasis} indent={n.indent} />
              ))}
              {['Administration', 'Configuration', 'Protected'].map((sec) => (
                <div key={sec}>
                  <NavSection label={sec} className="mt-4" />
                  {NAV_ITEMS.filter((n) => n.section === sec).map((n) => (
                    <NavLink key={n.id} to={n.to} icon={n.icon} label={n.label} active={active === n.id} restricted={n.restricted} />
                  ))}
                </div>
              ))}
            </nav>
            <MobileSignOutFooter />
          </aside>
        </div>
      )}
    </>
  )
}

function TopBarUserMenu() {
  const navigate = useNavigate()
  const { currentUser, signOut } = useUserMode()
  const [open, setOpen] = useState(false)
  const name = currentUser?.displayName || 'Admin'
  const short = currentUser?.role === 'admin' ? 'Admin'
    : currentUser?.role === 'clinic_nurse' ? 'Clinic'
    : currentUser?.role === 'reception_kawther' ? 'Al-Kawther'
    : currentUser?.role === 'reception_sheraton' ? 'Sheraton'
    : 'User'
  function doSignOut() {
    setOpen(false)
    signOut()
    navigate('/design-preview/login', { replace: true })
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-full transition-colors hover:bg-[var(--p-surface-tint)]"
        style={{ border: '1px solid var(--p-border-strong)' }}
      >
        <Avatar name={name} size={26} tone="teal" />
        <span className="text-xs font-semibold" style={{ color: 'var(--p-ink-700)' }}>{short}</span>
        <ChevronDown className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute right-0 top-12 z-40 w-64 rounded-2xl overflow-hidden"
            style={{ background: 'white', border: '1px solid var(--p-border)', boxShadow: 'var(--p-shadow-card)' }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--p-border)' }}>
              <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>{name}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{currentUser?.username ? `@${currentUser.username}` : '—'}</div>
            </div>
            <button
              type="button"
              onClick={doSignOut}
              className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-[var(--p-surface-tint)]"
              style={{ color: 'var(--p-ink-700)' }}
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function MobileSignOutButton() {
  const navigate = useNavigate()
  const { signOut } = useUserMode()
  return (
    <button
      type="button"
      onClick={() => { signOut(); navigate('/design-preview/login', { replace: true }) }}
      aria-label="Sign out"
      className="w-9 h-9 rounded-lg flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
    >
      <LogOut className="w-4 h-4" />
    </button>
  )
}

function MobileSignOutFooter() {
  const navigate = useNavigate()
  const { currentUser, signOut } = useUserMode()
  const name = currentUser?.displayName || 'Admin'
  return (
    <div className="relative z-10 px-4 pb-4 pt-3 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <Avatar name={name} size={32} tone="teal" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">{name}</div>
            <div className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>{currentUser?.username ? `@${currentUser.username}` : 'Signed in'}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { signOut(); navigate('/design-preview/login', { replace: true }) }}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[12px] font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.78)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </div>
  )
}
