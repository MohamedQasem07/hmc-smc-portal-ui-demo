import { useState } from 'react'
import { Menu, X, LogOut, ShieldCheck, ArrowLeftRight, ClipboardList, FileBarChart2, FileLock2, Settings, LayoutDashboard, FilePlus2, FolderOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Brand } from './Brand'
import { NavItem } from './NavItem'
import { useUserMode } from '../../context/UserModeContext'
import { CASES, getBranchName, FACILITIES } from '../../data/mock'

/**
 * MobileTopBar — slim top bar for mobile + a drawer menu trigger.
 * For Admin we also render a drawer with the full nav. For Clinic, the bottom nav handles primary nav,
 * but we still expose user/logout via the drawer.
 */
export function MobileTopBar({ onLogout }) {
  const [open, setOpen] = useState(false)
  const { role, user } = useUserMode()
  const navigate = useNavigate()

  const incomingTransfers = CASES.filter(
    (c) => c.route === 'Transferred In' && c.branchId === user.branchId && !c.transferReceivedAt,
  ).length

  const handleLogout = () => {
    setOpen(false)
    onLogout?.()
    navigate('/login')
  }

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-border h-14 px-3 flex items-center justify-between">
        <button
          aria-label="Menu"
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-ink-700 hover:bg-subtle -ms-1"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Brand compact />
        <div className="w-9 h-9 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-semibold">
          {user.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
        </div>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 animate-fade-in">
          <div className="absolute inset-0 bg-navy-950/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[80%] bg-white shadow-popover flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <Brand />
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg text-ink-500 hover:bg-subtle">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {role === 'clinic' ? (
                <>
                  <NavItem to="/clinic/dashboard"    icon={LayoutDashboard} label="Dashboard" onClick={() => setOpen(false)} />
                  <NavItem to="/clinic/new-case"     icon={FilePlus2}       label="Add New Case" onClick={() => setOpen(false)} />
                  <NavItem to="/clinic/transfers"    icon={ArrowLeftRight}  label="Incoming Transfers" badge={incomingTransfers} onClick={() => setOpen(false)} />
                  <NavItem to="/clinic/cases"        icon={FolderOpen}      label="My Cases" onClick={() => setOpen(false)} />
                  <NavItem to="/clinic/daily-report" icon={FileBarChart2}   label="Daily Report" onClick={() => setOpen(false)} />
                </>
              ) : (
                <>
                  <NavItem to="/admin/dashboard"      icon={LayoutDashboard} label="Dashboard" onClick={() => setOpen(false)} />
                  <NavItem to="/admin/cases"          icon={ClipboardList}   label="Cases Master" onClick={() => setOpen(false)} />
                  <NavItem to="/admin/daily-report"   icon={FileBarChart2}   label="Daily Report" onClick={() => setOpen(false)} />
                  <NavItem to="/admin/invoice-manager" icon={FileLock2}      label="Invoice Manager" restricted onClick={() => setOpen(false)} />
                  <NavItem to="/admin/settings"       icon={Settings}        label="Settings" onClick={() => setOpen(false)} />
                </>
              )}
            </nav>
            <div className="px-3 py-3 border-t border-border">
              <div className="rounded-lg bg-subtle/70 p-3 mb-2">
                <div className="text-sm font-semibold text-ink-900 truncate">{user.name}</div>
                <div className="text-[11px] text-ink-500 truncate">
                  {role === 'admin' ? (user.title || 'Administrator') : `${(FACILITIES.find((f) => f.id === user.facilityId) || {}).name || ''} · ${getBranchName(user.branchId)}`}
                </div>
                {role === 'admin' && (
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-700">
                    <ShieldCheck className="w-3 h-3" /> Admin · Full access
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-600 hover:bg-subtle hover:text-ink-900"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
