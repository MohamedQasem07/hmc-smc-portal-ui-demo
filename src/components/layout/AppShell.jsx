import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileTopBar } from './MobileTopBar'
import { MobileBottomNav } from './MobileBottomNav'
import { DemoBanner } from '../ui/DemoBanner'
import { useUserMode } from '../../context/UserModeContext'
import { Calendar, ChevronRight, RefreshCw } from 'lucide-react'
import { DEMO_TODAY_LABEL } from '../../data/mock'
import { Badge } from '../ui/Badge'

/**
 * AppShell — wraps every authenticated route (clinic + admin).
 * Includes:
 *   - DemoBanner (persistent prototype reminder)
 *   - Sidebar (desktop, role-aware)
 *   - MobileTopBar (mobile burger menu)
 *   - MobileBottomNav (mobile primary nav)
 *   - SecondaryTopBar (page-level: today + role-switch chip)
 *   - <Outlet /> for the active page
 */
export function AppShell() {
  const { role, user, setRole } = useUserMode()
  const navigate = useNavigate()

  const handleLogout = () => {
    /* prototype-only — clear role and route back */
    try { window.sessionStorage.removeItem('portal_ux_p0_role') } catch { /* */ }
  }

  const switchRole = () => {
    const next = role === 'clinic' ? 'admin' : 'clinic'
    setRole(next)
    navigate(next === 'clinic' ? '/clinic/dashboard' : '/admin/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <DemoBanner />
      <div className="flex-1 flex">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 flex flex-col min-w-0">
          <MobileTopBar onLogout={handleLogout} />
          <SecondaryTopBar role={role} user={user} onSwitchRole={switchRole} />
          <div className="flex-1 overflow-y-auto pb-24 lg:pb-8">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}

function SecondaryTopBar({ role, user, onSwitchRole }) {
  return (
    <div className="hidden lg:flex sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-border h-14 px-6 items-center justify-between">
      <div className="flex items-center gap-3 text-sm">
        <Badge tone={role === 'admin' ? 'navy' : 'sky'} dot>
          {role === 'admin' ? 'Admin Workspace' : `Branch · ${user.branchName}`}
        </Badge>
        <ChevronRight className="w-3.5 h-3.5 text-ink-300" />
        <div className="flex items-center gap-1.5 text-ink-600">
          <Calendar className="w-4 h-4 text-ink-400" />
          <span className="font-medium">{DEMO_TODAY_LABEL}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onSwitchRole}
          title="Demo only — switch between Clinic and Admin views"
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border-strong bg-white text-sm text-ink-700 hover:bg-subtle"
        >
          <RefreshCw className="w-4 h-4 text-ink-400" />
          Switch to {role === 'clinic' ? 'Admin' : 'Clinic'} View
          <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded ms-1">
            Demo
          </span>
        </button>
      </div>
    </div>
  )
}
