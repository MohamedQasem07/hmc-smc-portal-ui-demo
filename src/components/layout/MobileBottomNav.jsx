import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FilePlus2, ArrowLeftRight, FolderOpen, ClipboardList, FileBarChart2, Settings, FileLock2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useUserMode } from '../../context/UserModeContext'
import { CASES } from '../../data/mock'

/**
 * MobileBottomNav — fixed bottom navigation. Primary nav for mobile.
 * Role-aware. Visible only below lg breakpoint.
 */
export function MobileBottomNav() {
  const { role, user } = useUserMode()
  const incomingTransfers = CASES.filter(
    (c) => c.route === 'Transferred In' && c.branchId === user.branchId && !c.transferReceivedAt,
  ).length

  const items = role === 'clinic' ? [
    { to: '/clinic/dashboard',    icon: LayoutDashboard, label: 'Home' },
    { to: '/clinic/transfers',    icon: ArrowLeftRight,  label: 'Transfers', badge: incomingTransfers },
    { to: '/clinic/new-case',     icon: FilePlus2,       label: 'New Case', emphasis: true },
    { to: '/clinic/cases',        icon: FolderOpen,      label: 'My Cases' },
    { to: '/clinic/daily-report', icon: FileBarChart2,   label: 'Report' },
  ] : [
    { to: '/admin/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/cases',           icon: ClipboardList,   label: 'Cases' },
    { to: '/admin/daily-report',    icon: FileBarChart2,   label: 'Report' },
    { to: '/admin/invoice-manager', icon: FileLock2,       label: 'Manager' },
    { to: '/admin/settings',        icon: Settings,        label: 'Settings' },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-white/95 backdrop-blur safe-bottom">
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.to} className="contents">
            <NavLink
              to={it.to}
              className={({ isActive }) => cn(
                'flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors',
                isActive ? 'text-navy-800' : 'text-ink-400 hover:text-ink-700',
                it.emphasis && '',
              )}
            >
              {({ isActive }) => (
                <>
                  <span className={cn(
                    'inline-flex items-center justify-center rounded-lg transition-all',
                    it.emphasis
                      ? cn('w-10 h-10 -mt-3 shadow-card-hover ring-4 ring-white',
                          isActive ? 'bg-navy-800 text-white' : 'bg-sky-600 text-white')
                      : 'w-7 h-7',
                  )}>
                    <it.icon className={cn(it.emphasis ? 'w-5 h-5' : 'w-5 h-5')} />
                  </span>
                  <span className={cn('text-[10px] font-medium leading-none mt-1', it.emphasis && 'mt-0')}>{it.label}</span>
                  {typeof it.badge === 'number' && it.badge > 0 && (
                    <span className="absolute top-1 right-[20%] min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                      {it.badge}
                    </span>
                  )}
                  {isActive && !it.emphasis && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-navy-800" />
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
