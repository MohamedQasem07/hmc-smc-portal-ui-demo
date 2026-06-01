import { Link } from 'react-router-dom'
import { AdminShell } from '../../premium/AdminShell'
import { IS_SUPABASE } from '../../lib/api/config'
import LiveSpecialistVisitsReport from './p2c/live/LiveSpecialistVisitsReport'

/* =========================================================================
 * Admin · Specialist Visits Report — every specialist visit recorded on
 * cases (portal_encounters, type 'session'), enriched with case / patient /
 * branch and parsed specialist fields. Admin-only (RLS = all). No billing.
 * ========================================================================= */
export default function PremiumAdminSpecialistVisits() {
  return (
    <AdminShell active="specialist-visits" searchPlaceholder="Search specialist visits…">
      <div className="px-5 md:px-8 lg:px-10 pt-6 pb-16 max-w-[1280px] mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="p-eyebrow mb-1">Administration · {IS_SUPABASE ? 'Live' : 'Concept'}</div>
            <h1 className="p-h1 text-2xl sm:text-3xl" style={{ color: 'var(--p-ink-900)' }}>Specialist Visits Report</h1>
            <p className="text-sm mt-1 max-w-2xl" style={{ color: 'var(--p-ink-500)' }}>
              All specialist visits recorded on patient cases. Filter by date, branch, specialty, doctor or source.
            </p>
          </div>
          <Link to="/admin-dashboard" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold p-btn-ghost">← Admin Dashboard</Link>
        </div>
        {IS_SUPABASE ? <LiveSpecialistVisitsReport /> : <MockNote />}
      </div>
    </AdminShell>
  )
}

function MockNote() {
  return (
    <div className="p-card p-6 text-sm" style={{ color: 'var(--p-ink-600, #475569)' }}>
      The Specialist Visits Report is live in the connected (Supabase) build. This local mock preview has no backend data.
    </div>
  )
}
