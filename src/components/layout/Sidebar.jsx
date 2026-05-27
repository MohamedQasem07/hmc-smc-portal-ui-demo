import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FilePlus2, ArrowLeftRight, FolderOpen,
  ClipboardList, FileBarChart2, FileLock2, Settings, LogOut, ShieldCheck,
} from 'lucide-react'
import { Brand } from './Brand'
import { NavItem } from './NavItem'
import { useUserMode } from '../../context/UserModeContext'
import { CASES, getBranchName, FACILITIES } from '../../data/mock'

/**
 * Sidebar — desktop primary navigation.
 * Role-aware. Mounted once at the AppShell level; visible only on lg+ screens.
 */
export function Sidebar({ onLogout }) {
  const { role, user } = useUserMode()
  const navigate = useNavigate()

  // Incoming transfer count for clinic user
  const incomingTransfers = CASES.filter(
    (c) => c.route === 'Transferred In' && c.branchId === user.branchId && !c.transferReceivedAt,
  ).length

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-e border-border bg-white">
      <div className="px-5 py-5 border-b border-border">
        <Brand />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {role === 'clinic' ? (
          <>
            <SectionLabel>Branch Workspace</SectionLabel>
            <NavItem to="/clinic/dashboard"    icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/clinic/new-case"     icon={FilePlus2}       label="Add New Case" />
            <NavItem to="/clinic/transfers"    icon={ArrowLeftRight}  label="Incoming Transfers" badge={incomingTransfers} />
            <NavItem to="/clinic/cases"        icon={FolderOpen}      label="My Cases" />
            <NavItem to="/clinic/daily-report" icon={FileBarChart2}   label="Daily Report" />
          </>
        ) : (
          <>
            <SectionLabel>Admin Workspace</SectionLabel>
            <NavItem to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/admin/cases" icon={ClipboardList} label="Cases Master" />
            <NavItem to="/admin/daily-report" icon={FileBarChart2} label="Daily Report" />
            <div className="pt-3 pb-1">
              <SectionLabel>Protected Modules</SectionLabel>
            </div>
            <NavItem to="/admin/invoice-manager" icon={FileLock2} label="Invoice Manager" restricted />
            <NavItem to="/admin/settings" icon={Settings} label="Settings" />
          </>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <div className="rounded-lg bg-subtle/70 p-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-navy-800 text-white flex items-center justify-center font-semibold">
              {user.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink-900 truncate">{user.name}</div>
              <div className="text-[11px] text-ink-500 truncate">
                {role === 'admin' ? (user.title || 'Administrator') : `${(FACILITIES.find((f) => f.id === user.facilityId) || {}).name || ''} · ${getBranchName(user.branchId)}`}
              </div>
            </div>
          </div>
          {role === 'admin' && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-700">
              <ShieldCheck className="w-3 h-3" /> Admin · Full access
            </div>
          )}
        </div>
        <button
          onClick={() => { onLogout?.(); navigate('/login') }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-600 hover:bg-subtle hover:text-ink-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.12em] font-semibold text-ink-400">
      {children}
    </div>
  )
}
