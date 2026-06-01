import { Link } from 'react-router-dom'
import { AdminShell } from '../../premium/AdminShell'
import { IS_SUPABASE } from '../../lib/api/config'
import LiveSpecialistDirectory from './p2c/live/LiveSpecialistDirectory'

/* =========================================================================
 * Admin · Specialist Doctors (directory of EXTERNAL visiting specialists).
 * These are NOT staff: no login, no attendance, no clinic assignment.
 * Live (Supabase): admin-managed roster in portal_specialist_doctors.
 * Mock: concept note (no backend roster locally).
 * ========================================================================= */
export default function PremiumAdminSpecialistDoctors() {
  return (
    <AdminShell active="specialist-doctors" searchPlaceholder="Search specialist…">
      <div className="px-5 md:px-8 lg:px-10 pt-6 pb-16 max-w-[1200px] mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="p-eyebrow mb-1">Administration · {IS_SUPABASE ? 'Live' : 'Concept'}</div>
            <h1 className="p-h1 text-2xl sm:text-3xl" style={{ color: 'var(--p-ink-900)' }}>Specialist Doctors</h1>
            <p className="text-sm mt-1 max-w-2xl" style={{ color: 'var(--p-ink-500)' }}>
              Directory of <strong>external visiting specialists</strong>. They are not staff — no login, attendance or
              clinic assignment. This roster is used when recording a specialist visit on a patient case.
            </p>
          </div>
          <Link to="/admin-dashboard" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold p-btn-ghost">← Admin Dashboard</Link>
        </div>
        {IS_SUPABASE ? <LiveSpecialistDirectory /> : <MockNote />}
      </div>
    </AdminShell>
  )
}

function MockNote() {
  return (
    <div className="p-card p-6 text-sm" style={{ color: 'var(--p-ink-600, #475569)' }}>
      The Specialist Doctors directory is live in the connected (Supabase) build, where admins add, edit and
      deactivate external specialists. This local mock preview has no backend roster.
    </div>
  )
}
