import { AdminShell } from '../../premium/AdminShell'
import { IS_SUPABASE } from '../../lib/api/config'
import LiveAttendancePanel from './p2c/live/LiveAttendancePanel'

/**
 * PremiumAdminAttendance (Sprint 2) — admin all-clinics attendance overview
 * inside the admin shell. Read-only; RLS returns every location for admin.
 * Live (Supabase) only; mock mode shows a short note so the nav item is
 * harmless during owner UAT.
 */
export default function PremiumAdminAttendance() {
  return (
    <AdminShell active="attendance" searchPlaceholder="Search attendance…">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-12 max-w-[1500px] mx-auto">
        {IS_SUPABASE ? (
          <LiveAttendancePanel mode="admin" />
        ) : (
          <div className="p-card p-8 text-center text-sm" style={{ color: 'var(--p-ink-500)' }}>
            The live all-clinics attendance overview appears here when the portal is connected to the backend.
          </div>
        )}
      </div>
    </AdminShell>
  )
}
