import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, FileBarChart2, FileLock2, Settings,
  Bell, Search, ChevronDown, Sparkles, BookOpen, Plus, Banknote,
  Stethoscope, Menu, X, History, Calendar, Send, LogOut, Users, Archive, UserCheck,
} from 'lucide-react'
import { BrandWordmark } from './BrandMark'
import { Avatar, StatusPill } from './primitives'
import { useUserMode } from '../context/UserModeContext'
import { cn } from '../lib/cn'
import { IS_SUPABASE } from '../lib/api/config'

/**
 * AdminShell — premium dark sidebar + glass topbar for Admin preview routes.
 * Active nav item is controlled by `active` prop. Sidebar is FIXED on desktop so it stays
 * visible while the main content scrolls. Mobile shows a top bar with a menu drawer.
 */
export function AdminShell({ active = 'dashboard', searchPlaceholder = 'Search patient, Our Ref, insurance ref…', children }) {
  return (
    <div className="theme-premium p-app min-h-screen">
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
  { id: 'dashboard',    label: 'Dashboard',           icon: LayoutDashboard, to: '/admin-dashboard' },
  { id: 'new-case',     label: '+ New Case',          icon: Plus,            to: '/admin/new-case', emphasis: true },
  { id: 'cases',        label: 'Cases Master',        icon: ClipboardList,   to: '/admin/cases-master' },
  { id: 'legacy',       label: 'Old Cases',           icon: Archive,         to: '/admin/legacy-review' },
  { id: 'collections',  label: 'Collections & Treasury', icon: Banknote,     to: '/admin/collections' },
  { id: 'reports-daily',  label: 'Daily Report',      icon: FileBarChart2,   to: '/admin/reports/daily',   indent: true },
  { id: 'reports-monthly',label: 'Monthly Report',    icon: Calendar,        to: '/admin/reports/monthly', indent: true },
  { id: 'repatriation', label: 'Repatriation Entry',  icon: Stethoscope,     to: '/admin/repatriation' },
  { id: 'p2c-cases',    label: 'Clinic & Reception',  icon: Send,            to: '/admin/p2c-cases', section: 'Clinic & Reception' },
  { id: 'insurance-completion', label: 'Insurance Completion', icon: FileLock2, to: '/admin/insurance-completion', section: 'Clinic & Reception' },
  { id: 'attendance',   label: 'Attendance',          icon: UserCheck,       to: '/admin/attendance', section: 'Administration' },
  { id: 'users-staff',  label: 'Users & Staff',       icon: Users,           to: '/admin/users-staff', section: 'Administration' },
  { id: 'specialist-doctors', label: 'Specialist Doctors',       icon: Stethoscope,   to: '/admin/specialist-doctors', section: 'Administration' },
  { id: 'specialist-visits',  label: 'Specialist Visits Report', icon: FileBarChart2, to: '/admin/specialist-visits',  section: 'Administration' },
  { id: 'reference-lists', label: 'Operational Config', icon: BookOpen,       to: '/admin/reference-lists', section: 'Configuration' },
  { id: 'control',      label: 'Control Center',      icon: Settings,        to: '/admin-control-center', section: 'Configuration' },
  { id: 'manager',      label: 'Invoice Manager',     icon: FileLock2,       to: '/admin-dashboard', restricted: true, section: 'Protected' },
]

// In the live pilot (Supabase mode) hide mock-only surfaces so admins only see
// real, backend-connected pages. Control Center is demo config cards; Invoice
// Manager is a non-functional placeholder; "Cases Master" is the legacy mock
// unified view — its route already redirects to the live /admin/p2c-cases
// ("All P2C Cases"), which stays reachable via the "Clinic & Reception" item,
// so the redundant nav entry is hidden in pilot. All stay available in mock mode.
const MOCK_ONLY_NAV_IDS = ['control', 'manager', 'cases', 'repatriation', 'reports-monthly']
const NAV_ITEMS_VISIBLE = IS_SUPABASE
  ? NAV_ITEMS.filter((n) => !MOCK_ONLY_NAV_IDS.includes(n.id))
  : NAV_ITEMS
const NAV_SECTIONS = ['Clinic & Reception', 'Administration', 'Configuration', 'Protected']
const NAV_SECTIONS_VISIBLE = NAV_SECTIONS.filter((sec) => NAV_ITEMS_VISIBLE.some((n) => n.section === sec))

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
        {NAV_ITEMS_VISIBLE.filter((n) => !n.section).map((n) => (
          <NavLink key={n.id} to={n.to} icon={n.icon} label={n.label} active={active === n.id} emphasis={n.emphasis} indent={n.indent} />
        ))}

        {NAV_SECTIONS_VISIBLE.map((sec) => (
          <div key={sec}>
            <NavSection label={sec} className="mt-4" />
            {NAV_ITEMS_VISIBLE.filter((n) => n.section === sec).map((n) => (
              <NavLink key={n.id} to={n.to} icon={n.icon} label={n.label} active={active === n.id} restricted={n.restricted} />
            ))}
          </div>
        ))}

        {!IS_SUPABASE && (
          <>
            <NavSection label="Other" className="mt-4" />
            <NavLink to="/admin-dashboard" icon={Settings} label="Settings" />
          </>
        )}
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
    navigate('/login', { replace: true })
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
      active ? 'text-white' : 'hover:bg-white/10 hover:text-white',
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
  const pageTitle = (NAV_ITEMS.find((n) => n.id === active)?.label || 'Dashboard').replace('+ ', '')
  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden lg:flex sticky top-0 z-20 h-16 px-6 lg:px-10 items-center justify-between gap-4" style={{
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        borderBottom: '1px solid var(--p-border-strong)',
      }}>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: 'var(--p-teal)' }}>Aegis · Admin Workspace</div>
          <div className="text-[15px] font-extrabold leading-tight truncate" style={{ color: 'var(--p-ink-900)', letterSpacing: '-0.01em' }}>{pageTitle}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden xl:inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-semibold" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)', color: 'var(--p-ink-500)' }}>
            <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--p-ink-400)' }} />
            {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--p-ink-400)' }} />
            <input
              placeholder={placeholder}
              className="h-10 w-56 xl:w-72 rounded-full pl-9 pr-4 text-sm focus-visible:outline-none transition-all"
              style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border-strong)', color: 'var(--p-ink-700)' }}
            />
          </div>
          <button className="w-10 h-10 rounded-full relative flex items-center justify-center transition-colors hover:bg-[var(--p-surface-tint)]" style={{ border: '1px solid var(--p-border)' }}>
            <Bell className="w-4 h-4" style={{ color: 'var(--p-ink-600)' }} />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full" style={{ background: 'var(--p-mixed)' }} />
          </button>
          <TopBarUserMenu />
        </div>
      </header>

      {/* Mobile top bar — page-title hierarchy + safe-area */}
      <header className="lg:hidden sticky top-0 z-30 h-14 px-3 flex items-center gap-2" style={{
        background: 'rgba(10, 27, 61, 0.96)',
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.10)', color: 'white' }}>
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 text-center px-1">
          <div className="text-[9px] uppercase tracking-[0.16em] font-bold" style={{ color: 'rgba(127,231,222,0.9)' }}>Aegis Admin</div>
          <div className="text-[13px] font-bold text-white truncate leading-tight">{pageTitle}</div>
        </div>
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
              {NAV_ITEMS_VISIBLE.filter((n) => !n.section).map((n) => (
                <NavLink key={n.id} to={n.to} icon={n.icon} label={n.label} active={active === n.id} emphasis={n.emphasis} indent={n.indent} />
              ))}
              {NAV_SECTIONS_VISIBLE.map((sec) => (
                <div key={sec}>
                  <NavSection label={sec} className="mt-4" />
                  {NAV_ITEMS_VISIBLE.filter((n) => n.section === sec).map((n) => (
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
    navigate('/login', { replace: true })
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
      onClick={() => { signOut(); navigate('/login', { replace: true }) }}
      aria-label="Sign out"
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: 'rgba(255,255,255,0.10)', color: 'white' }}
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
          onClick={() => { signOut(); navigate('/login', { replace: true }) }}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[12px] font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.78)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </div>
  )
}
