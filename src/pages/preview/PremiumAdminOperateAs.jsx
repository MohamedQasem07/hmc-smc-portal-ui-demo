import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Building2, ShieldCheck, ArrowRight, Stethoscope, Landmark } from 'lucide-react'
import { AdminShell } from '../../premium/AdminShell'
import { useUserMode } from '../../context/UserModeContext'
import { EXTERNAL_CLINICS, RECEIVING_BRANCHES } from '../../data/p2c'

/* =========================================================================
 * Admin Operate-As — clinic / branch workspace selector.
 * -----------------------------------------------------------------------
 * Admin-only (route-guarded). Picking a location sets the operate-as scope
 * in UserModeContext (admin stays the real admin; operatingMode = admin_override)
 * and opens that location's real workspace:
 *   - external clinic → /clinic/dashboard (clinic workspace, scoped by clinicId)
 *   - main branch     → /reception/:slug/dashboard (branch workspace, URL-scoped)
 * A persistent banner + "Return to Admin Workspace" lives in OperationalShell.
 * /admin/operate-as/:locationCode is a deep-link that sets + redirects.
 * ========================================================================= */

const slugOf = (code) => String(code || '').replace(/_/g, '-')
const homeFor = (loc) => (loc.kind === 'branch' ? `/reception/${slugOf(loc.code)}/dashboard` : '/clinic/dashboard')

const LOCATIONS = [
  ...EXTERNAL_CLINICS.map((c) => ({ code: c.id, name: c.name, kind: 'external', hint: c.city || '' })),
  ...RECEIVING_BRANCHES.map((b) => ({ code: b.id, name: b.name, kind: 'branch', hint: b.city || '' })),
]

export default function PremiumAdminOperateAs() {
  const navigate = useNavigate()
  const { locationCode } = useParams()
  const { setOperateAs } = useUserMode()

  function enter(loc) {
    setOperateAs({ code: loc.code, name: loc.name, kind: loc.kind })
    navigate(homeFor(loc), { replace: true })
  }

  // Deep-link form: /admin/operate-as/:locationCode → set scope + redirect.
  useEffect(() => {
    if (!locationCode) return
    const loc = LOCATIONS.find((l) => l.code === locationCode)
    if (loc) enter(loc)
    else navigate('/admin/operate-as', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationCode])

  if (locationCode) return null   // redirecting via the effect above

  const externals = LOCATIONS.filter((l) => l.kind === 'external')
  const branches = LOCATIONS.filter((l) => l.kind === 'branch')

  return (
    <AdminShell active="operate-as">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-6 pb-12 max-w-[1100px] mx-auto space-y-7">

        {/* Hero / explanation */}
        <section className="p-card p-card-top p-5 lg:p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)', boxShadow: 'var(--p-shadow-glow)' }}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="p-eyebrow">Admin · Operate as Clinic / Branch</div>
            <h1 className="p-h1 text-xl sm:text-2xl mt-1">Open a clinic or branch workspace</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--p-ink-600)' }}>
              Enter any location exactly as its nurse / reception user sees it — review their cases, correct data through the
              Full Case Editor, then return here. You stay signed in as <strong>Admin</strong>; every action is recorded under
              your admin account on behalf of the selected location (<strong>Admin Override</strong>). A banner stays visible the
              whole time so you always know which location you are operating.
            </p>
          </div>
        </section>

        {/* External clinics */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4" style={{ color: 'var(--p-brand-mid)' }} />
            <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>External Clinics — Nurse Workspace</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {externals.map((loc) => <LocationCard key={loc.code} loc={loc} onEnter={() => enter(loc)} />)}
          </div>
        </section>

        {/* Main branches */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4" style={{ color: 'var(--p-brand-mid)' }} />
            <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>Main Branches — Reception Workspace</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {branches.map((loc) => <LocationCard key={loc.code} loc={loc} onEnter={() => enter(loc)} branch />)}
          </div>
        </section>
      </div>
    </AdminShell>
  )
}

function LocationCard({ loc, onEnter, branch }) {
  return (
    <button type="button" onClick={onEnter}
      className="p-card p-4 text-left transition-all hover:shadow-[var(--p-shadow-card)] hover:-translate-y-0.5 flex items-center gap-3 group"
      style={{ border: '1px solid var(--p-border)' }}>
      <span className="w-11 h-11 rounded-xl inline-flex items-center justify-center shrink-0"
        style={{ background: branch ? 'var(--p-brand-pale)' : 'var(--p-teal-soft)', color: branch ? '#1E4180' : '#0A8F87', border: `1px solid ${branch ? '#BCCDE8' : '#A6E2DC'}` }}>
        {branch ? <Landmark className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold truncate" style={{ color: 'var(--p-ink-900)' }}>{loc.name}</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>
          {branch ? 'Reception / branch workspace' : 'Clinic / nurse workspace'}{loc.hint ? ` · ${loc.hint}` : ''}
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-[11px] font-bold shrink-0 transition-colors"
        style={{ color: 'var(--p-teal)' }}>
        Operate as <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </span>
    </button>
  )
}
