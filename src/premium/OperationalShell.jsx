import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Plus, ClipboardList, Send, Inbox, FileBarChart2,
  Banknote, User, Menu, X, Bell, ChevronDown, Building2, Sparkles, ShieldCheck,
  ArrowLeft, MapPin, Wallet, Users, BedDouble, Receipt, LogOut,
} from 'lucide-react'
import { Avatar, StatusPill } from './primitives'
import { BrandWordmark } from './BrandMark'
import { cn } from '../lib/cn'
import { useUserMode } from '../context/UserModeContext'
import { EXTERNAL_CLINICS, getClinicName } from '../data/p2c'

/**
 * OperationalShell — mobile-first shell for external clinic + reception roles.
 *
 * Layout:
 *   - Mobile: top bar (demo badge + menu) + bottom nav (5 primary tabs)
 *   - Tablet/desktop: collapsible left rail with same items
 *
 * Visual language: matches AdminShell's Aegis identity but lighter weight,
 * larger touch targets, and a persistent identity strip ("which clinic / which branch").
 */
export function OperationalShell({
  role,            // 'clinic_nurse' | 'reception_kawther' | 'reception_sheraton'
  active,          // 'dashboard' | 'new-case' | 'cases' | 'transfers' | 'report'
  identityName,    // e.g. "Tropitel Clinic"
  identitySub,     // e.g. "External Clinic Workspace"
  children,
}) {
  const navItems = navItemsFor(role)

  return (
    <div className="theme-premium min-h-screen" style={{ background: 'var(--p-canvas)' }}>
      {/* Persistent identity top strip (mobile + desktop) */}
      <OperationalTopBar role={role} identityName={identityName} identitySub={identitySub} />

      {/* Desktop side rail (md+) */}
      <div className="flex">
        <DesktopRail role={role} active={active} identityName={identityName} identitySub={identitySub} />
        <main className="flex-1 min-w-0 pb-24 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav role={role} active={active} navItems={navItems} />
    </div>
  )
}

// ---------------------------------------------------------------------------
function navItemsFor(role) {
  // P2C.R3 — standalone Expenses removed; expenses live inside Treasury.
  const base = role === 'clinic_nurse'
    ? [
        { id: 'dashboard',  label: 'Home',       icon: LayoutDashboard, to: '/design-preview/clinic/dashboard' },
        { id: 'new-case',   label: '+ New Case', icon: Plus,           to: '/design-preview/clinic/new-case', emphasis: true },
        { id: 'cases',      label: 'My Cases',   icon: ClipboardList,  to: '/design-preview/clinic/cases' },
        { id: 'transfers',  label: 'Transfers',  icon: Send,           to: '/design-preview/clinic/transfers' },
        { id: 'treasury',   label: 'Treasury',   icon: Wallet,         to: '/design-preview/clinic/treasury' },
        { id: 'attendance', label: 'Attendance', icon: Users,          to: '/design-preview/clinic/attendance' },
        { id: 'report',     label: 'Daily',      icon: FileBarChart2,  to: '/design-preview/clinic/daily-report' },
      ]
    : [
        { id: 'dashboard',  label: 'Home',       icon: LayoutDashboard, to: receptionRoute(role, 'dashboard') },
        { id: 'new-case',   label: '+ Direct',   icon: Plus,            to: receptionRoute(role, 'new-case'), emphasis: true },
        { id: 'transfers',  label: 'Incoming',   icon: Inbox,           to: receptionRoute(role, 'incoming-transfers') },
        { id: 'cases',      label: 'Branch',     icon: ClipboardList,   to: receptionRoute(role, 'cases') },
        { id: 'rooms',      label: 'Rooms',      icon: BedDouble,       to: receptionRoute(role, 'rooms') },
        { id: 'treasury',   label: 'Treasury',   icon: Wallet,          to: receptionRoute(role, 'treasury') },
        { id: 'collections',label: 'Cash',       icon: Banknote,        to: receptionRoute(role, 'collections') },
        { id: 'report',     label: 'Daily',      icon: FileBarChart2,   to: receptionRoute(role, 'daily-report') },
      ]
  return base
}

export function receptionRoute(role, leaf) {
  const branch = role === 'reception_kawther' ? 'al-kawther' : 'sheraton'
  return `/design-preview/reception/${branch}/${leaf}`
}

// ---------------------------------------------------------------------------
function OperationalTopBar({ role, identityName, identitySub }) {
  const navigate = useNavigate()
  const { currentUser, signOut, isSignedIn } = useUserMode()

  function doSignOut() {
    signOut()
    navigate('/design-preview/login', { replace: true })
  }

  const displayName = currentUser?.displayName
    || (role === 'admin' ? 'Admin' : role === 'clinic_nurse' ? 'Clinic User' : 'Reception')

  return (
    <header className="sticky top-0 z-30 px-4 md:px-7 h-14 flex items-center justify-between gap-3" style={{
      background: 'linear-gradient(180deg, rgba(10,27,61,0.96) 0%, rgba(18,43,83,0.92) 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(14px) saturate(160%)',
      WebkitBackdropFilter: 'blur(14px) saturate(160%)',
    }}>
      <div className="flex items-center gap-3 min-w-0">
        <BrandWordmark variant="light" compact />
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <div className="hidden sm:flex flex-col items-end leading-tight min-w-0">
          <span className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>{identitySub}</span>
          <span className="text-sm font-semibold text-white truncate max-w-[180px]">{identityName}</span>
        </div>
        {isSignedIn && (
          <button
            onClick={doSignOut}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.78)' }}
            aria-label="Sign out"
            title={`Signed in as ${displayName}`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px] font-semibold">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  )
}

function ClinicSwitcher({ currentId, onChange }) {
  return (
    <label className="relative inline-flex items-center gap-2 h-9 rounded-full px-3 transition-colors cursor-pointer"
           style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
      <Building2 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
      <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>Clinic</span>
      <span className="text-xs font-semibold text-white truncate max-w-[140px]">{getClinicName(currentId)}</span>
      <ChevronDown className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.55)' }} />
      <select
        value={currentId}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label="Switch demo clinic"
      >
        {EXTERNAL_CLINICS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  )
}

// ---------------------------------------------------------------------------
function DesktopRail({ role, active, identityName, identitySub }) {
  const navItems = navItemsFor(role)
  return (
    <aside className="hidden md:flex flex-col w-[240px] shrink-0 sticky top-14 self-start h-[calc(100vh-56px)] overflow-hidden" style={{
      background: 'linear-gradient(180deg, #0A1B3D 0%, #08213F 100%)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span className="absolute -top-24 -left-16 w-60 h-60 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(15,181,169,0.18) 0%, transparent 65%)' }} />

      <div className="relative z-10 px-4 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="p-eyebrow" style={{ color: '#7FE7DE' }}>{identitySub}</div>
        <div className="mt-1 text-base font-bold text-white leading-tight">{identityName}</div>
      </div>

      <nav className="relative z-10 flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {navItems.map((n) => (
          <RailLink key={n.id} {...n} active={active === n.id} />
        ))}
      </nav>

      <div className="relative z-10 px-3 pb-4 pt-3 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="rounded-2xl p-2.5 flex items-center gap-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <RoleAvatar role={role} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">{roleDisplay(role)}</div>
            <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>{identityName}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function RailLink({ to, icon: Icon, label, active, emphasis }) {
  return (
    <Link to={to} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all relative')}
          style={{
            background: active ? 'linear-gradient(135deg, rgba(15,181,169,0.18) 0%, rgba(30,65,128,0.18) 100%)' :
                        emphasis ? 'linear-gradient(135deg, rgba(15,181,169,0.10) 0%, rgba(15,181,169,0.04) 100%)' :
                        'transparent',
            color: active ? 'white' : emphasis ? '#7FE7DE' : 'rgba(255,255,255,0.65)',
            border: active ? '1px solid rgba(15,181,169,0.32)' :
                    emphasis ? '1px solid rgba(15,181,169,0.20)' :
                    '1px solid transparent',
          }}>
      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: '#0FB5A9' }} />}
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-[13px]">{label}</span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
function MobileBottomNav({ role, active, navItems }) {
  // Show at most 5 items — keep the most-used operational tabs on phones
  const keepOnMobile = role === 'clinic_nurse'
    ? ['dashboard', 'new-case', 'cases', 'treasury', 'report']
    : ['dashboard', 'new-case', 'transfers', 'rooms', 'treasury']
  const items = navItems.length > 5
    ? navItems.filter((n) => keepOnMobile.includes(n.id))
    : navItems
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2" style={{
      background: 'rgba(255,255,255,0.92)',
      borderTop: '1px solid var(--p-border)',
      backdropFilter: 'blur(16px) saturate(160%)',
      WebkitBackdropFilter: 'blur(16px) saturate(160%)',
    }}>
      <ul className="grid grid-cols-5 gap-0.5">
        {items.slice(0, 5).map((n) => {
          const isActive = active === n.id
          return (
            <li key={n.id} className="min-w-0">
              <Link to={n.to} className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-colors',
                'min-h-[52px] touch-manipulation',
              )} style={{
                background: isActive ? 'var(--p-teal-soft)' : 'transparent',
                color: isActive ? 'var(--p-teal)' : 'var(--p-ink-500)',
              }}>
                <n.icon className="w-5 h-5 shrink-0" />
                <span className={cn('text-[10px] font-semibold tracking-tight', n.emphasis && !isActive && 'text-[var(--p-teal)]')}>{n.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// ---------------------------------------------------------------------------
function RoleAvatar({ role }) {
  const tone = role === 'admin' ? 'teal' : role === 'clinic_nurse' ? 'navy' : 'navy'
  return <Avatar name={roleDisplay(role)} size={32} tone={tone} />
}

function roleDisplay(role) {
  switch (role) {
    case 'clinic_nurse':       return 'Demo Nurse'
    case 'reception_kawther':  return 'Demo Reception'
    case 'reception_sheraton': return 'Demo Reception'
    default:                   return 'Demo User'
  }
}

// ---------------------------------------------------------------------------
/**
 * IdentityHeader — used by every operational page (clinic + reception) to
 * make the current scope (which clinic / which branch) crystal clear in the
 * page body itself, not only in the chrome.
 */
export function IdentityHeader({ icon: Icon = Building2, tone = 'teal', label, subtitle, action, badges }) {
  const toneBg = tone === 'gold' ? 'linear-gradient(135deg, #D9A574 0%, #B8854D 100%)'
               : tone === 'navy' ? 'linear-gradient(135deg, #1E4180 0%, #0A1B3D 100%)'
               :                    'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)'
  return (
    <div className="p-card p-5 lg:p-6 flex items-start gap-4 p-rise">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white" style={{ background: toneBg, boxShadow: 'var(--p-shadow-glow)' }}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="p-eyebrow">{subtitle}</div>
        <h1 className="p-h1 text-xl sm:text-2xl mt-1 truncate">{label}</h1>
        {badges && <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
