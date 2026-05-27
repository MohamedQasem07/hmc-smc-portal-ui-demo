import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'

/**
 * NavItem — single sidebar row. Uses react-router NavLink for active state.
 * Variants kept minimal — every nav row should look identical here.
 */
export function NavItem({ to, icon: Icon, label, end, badge, restricted, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-navy-50 text-navy-900'
            : 'text-ink-600 hover:text-navy-900 hover:bg-subtle',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn(
            'inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
            isActive ? 'bg-white text-sky-700 shadow-sm' : 'text-ink-400 group-hover:text-navy-700',
          )}>
            <Icon className="w-4 h-4" />
          </span>
          <span className="flex-1 truncate">{label}</span>
          {typeof badge === 'number' && badge > 0 && (
            <span className={cn(
              'px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums',
              isActive ? 'bg-sky-100 text-sky-800' : 'bg-subtle text-ink-600',
            )}>
              {badge}
            </span>
          )}
          {restricted && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
              Protected
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
