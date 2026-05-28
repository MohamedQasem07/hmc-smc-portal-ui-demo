import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FlaskConical, Stethoscope, ShieldCheck, Building2, ArrowRight,
  Sparkles, KeyRound, LogIn,
} from 'lucide-react'
import { BrandWordmark } from '../../premium/BrandMark'
import { MeshCorner, PremiumButton, StatusPill, StatPill } from '../../premium/primitives'
import { UatToolbar } from '../../premium/UatToolbar'
import { useUserMode } from '../../context/UserModeContext'
import { useUsers } from '../../context/DemoStateContext'
import { findUserByUsername } from '../../data/staffUsers'

/* =========================================================================
 * P2C.R4 — Local Review Tools
 * -----------------------------------------------------------------------
 * The single place where demo-mode controls live:
 *
 *   - Load Review Test Data / Reset Review Data (UatToolbar).
 *   - Quick-sign-in chips for each demo persona (Admin, every clinic, both
 *     branch receptions). Each chip programmatically signs the user in and
 *     navigates to the matching workspace, exactly as if Mohamed had typed
 *     the credentials on the Login screen.
 *
 * Normal operational screens no longer show any UAT controls. This page is
 * the only visible surface that talks about review data.
 * ========================================================================= */

export default function PremiumReviewTools() {
  const navigate = useNavigate()
  const { signIn } = useUserMode()
  const users = useUsers()

  function enterAs(usernameLike) {
    const u = findUserByUsername(users, usernameLike)
    if (!u) return
    if (u.status !== 'Active') {
      alert(`The portal user "${u.username}" is currently Inactive. Activate it in Users & Staff first.`)
      return
    }
    signIn(u)
    navigate(routeForUser(u), { replace: true })
  }

  return (
    <div className="theme-premium min-h-screen relative" style={{ background: 'var(--p-canvas)' }}>
      <div className="absolute inset-x-0 top-0 h-[360px] pointer-events-none" style={{
        background: 'linear-gradient(180deg, #0A1B3D 0%, #122B53 60%, transparent 100%)',
      }} />
      <span className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(15,181,169,0.30) 0%, transparent 65%)' }} />
      <span className="absolute -top-24 -left-32 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(217,165,116,0.18) 0%, transparent 65%)' }} />

      <div className="relative z-10 max-w-[1200px] w-full mx-auto px-5 md:px-8 lg:px-12 pt-7 pb-14">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-10">
          <BrandWordmark variant="light" />
          <Link to="/design-preview/login" className="text-xs font-semibold inline-flex items-center gap-1.5"
                style={{ color: 'rgba(255,255,255,0.78)' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </header>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="p-eyebrow" style={{ color: '#7FE7DE' }}>
            <FlaskConical className="w-3 h-3 inline mr-1" /> Local Review Tools · UAT mode
          </div>
          <h1 className="p-display p-display-light text-3xl md:text-4xl mt-3">
            Test data and <span style={{ color: '#7FE7DE' }}>quick personas</span>.
          </h1>
          <p className="text-sm md:text-base mt-3 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.72)' }}>
            Load the full review dataset, reset it back to empty, and quickly enter the workspace
            as any demo persona without typing credentials. These controls are not part of normal
            day-to-day operations and never appear on the Login screen or operational pages.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <StatPill label="Visible to" value="Admin / Reviewer" />
            <StatPill label="Persists" value="Session only" />
            <StatPill label="Auth" value="Local — not backend" />
          </div>
        </div>

        {/* UAT toolbar */}
        <div className="mb-10">
          <UatToolbar />
        </div>

        {/* Quick persona entry */}
        <section className="rounded-2xl bg-white relative overflow-hidden" style={{ border: '1px solid var(--p-border)', boxShadow: 'var(--p-shadow-card)' }}>
          <MeshCorner position="tr" size={180} color="#0FB5A9" opacity={0.06} />
          <div className="px-5 sm:px-7 py-5 border-b" style={{ borderColor: 'var(--p-border)' }}>
            <div className="p-eyebrow">Quick sign-in</div>
            <h2 className="p-h2 text-lg mt-0.5">Enter the workspace as any demo persona</h2>
            <p className="text-sm mt-1.5 max-w-xl" style={{ color: 'var(--p-ink-500)' }}>
              Each chip signs the matching portal user in with their saved demo password and routes you to that
              workspace. Use the standard Login screen to test username/password validation, lockouts, etc.
            </p>
          </div>
          <div className="p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <PersonaCard tone="navy"  icon={ShieldCheck}   title="Admin Workspace"           username="admin"          subtitle="Mohamed Ramadan · Financial Director"        onEnter={() => enterAs('admin')} />
            <PersonaCard tone="teal"  icon={Stethoscope}   title="Tropitel Clinic"           username="tropitel"       subtitle="External clinic reception"                  onEnter={() => enterAs('tropitel')} />
            <PersonaCard tone="teal"  icon={Stethoscope}   title="Romance Clinic"            username="romance"        subtitle="External clinic reception"                  onEnter={() => enterAs('romance')} />
            <PersonaCard tone="teal"  icon={Stethoscope}   title="Sahl Hasheesh Clinics"     username="sahl_hasheesh"  subtitle="External clinic reception"                  onEnter={() => enterAs('sahl_hasheesh')} />
            <PersonaCard tone="teal"  icon={Stethoscope}   title="Mamsha Clinic"             username="mamsha"         subtitle="External clinic reception"                  onEnter={() => enterAs('mamsha')} />
            <PersonaCard tone="teal"  icon={Stethoscope}   title="Pharaoh Clinic"            username="pharaoh"        subtitle="External clinic reception"                  onEnter={() => enterAs('pharaoh')} />
            <PersonaCard tone="teal"  icon={Stethoscope}   title="Menamark Clinic"           username="menamark"       subtitle="External clinic reception"                  onEnter={() => enterAs('menamark')} />
            <PersonaCard tone="gold"  icon={Building2}     title="Al-Kawther Reception"      username="kawther"        subtitle="Main branch reception"                      onEnter={() => enterAs('kawther')} />
            <PersonaCard tone="gold"  icon={Building2}     title="Sheraton Reception"        username="sheraton"       subtitle="Main branch reception"                      onEnter={() => enterAs('sheraton')} />
          </div>
        </section>

        {/* Credentials reference */}
        <section className="mt-8 rounded-2xl bg-white" style={{ border: '1px solid var(--p-border)', boxShadow: 'var(--p-shadow-soft)' }}>
          <div className="px-5 sm:px-7 py-5 border-b" style={{ borderColor: 'var(--p-border)' }}>
            <div className="p-eyebrow">Credentials reference</div>
            <h2 className="p-h2 text-lg mt-0.5">Demo passwords for the Login screen</h2>
            <p className="text-sm mt-1.5" style={{ color: 'var(--p-ink-500)' }}>
              Manage the full user list and reset passwords from <Link to="/design-preview/admin/users-staff" className="font-semibold underline" style={{ color: 'var(--p-teal)' }}>Users &amp; Staff</Link>.
            </p>
          </div>
          <div className="p-5 sm:p-7 grid grid-cols-1 md:grid-cols-2 gap-3">
            <CredentialRow username="admin"          password="admin1234" label="Admin · all clinics & branches" />
            <CredentialRow username="tropitel"       password="demo1234"  label="Tropitel Clinic"                />
            <CredentialRow username="romance"        password="demo1234"  label="Romance Clinic"                 />
            <CredentialRow username="sahl_hasheesh"  password="demo1234"  label="Sahl Hasheesh Clinics"          />
            <CredentialRow username="mamsha"         password="demo1234"  label="Mamsha Clinic"                  />
            <CredentialRow username="pharaoh"        password="demo1234"  label="Pharaoh Clinic"                 />
            <CredentialRow username="menamark"       password="demo1234"  label="Menamark Clinic"                />
            <CredentialRow username="kawther"        password="demo1234"  label="Al-Kawther Reception"           />
            <CredentialRow username="sheraton"       password="demo1234"  label="Sheraton Reception"             />
          </div>
        </section>

        {/* Legacy role preview (kept for back-compat) */}
        <div className="mt-8 text-center">
          <Link to="/design-preview/demo-roles" className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Open legacy Role Preview cards <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function PersonaCard({ tone, icon: Icon, title, subtitle, username, onEnter }) {
  const tones = {
    navy: { grad: 'linear-gradient(135deg, #1E4180 0%, #0A1B3D 100%)', soft: 'rgba(30,65,128,0.16)' },
    teal: { grad: 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)', soft: 'rgba(15,181,169,0.14)' },
    gold: { grad: 'linear-gradient(135deg, #D9A574 0%, #B8854D 100%)', soft: 'rgba(217,165,116,0.16)' },
  }
  const t = tones[tone] || tones.navy
  return (
    <article className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-white shrink-0"
              style={{ background: t.grad, boxShadow: '0 4px 12px rgba(10,27,61,0.15)' }}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight" style={{ color: 'var(--p-ink-900)' }}>{title}</div>
          <div className="text-[11px] truncate" style={{ color: 'var(--p-ink-500)' }}>{subtitle}</div>
        </div>
      </div>
      <div className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2"
           style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-700)' }}>
        <span>@{username}</span>
        <StatusPill tone={tone === 'gold' ? 'gold' : 'navy'}>Active</StatusPill>
      </div>
      <PremiumButton size="sm" fullWidth onClick={onEnter} leftIcon={<LogIn className="w-3.5 h-3.5" />}>
        Enter as {username}
      </PremiumButton>
    </article>
  )
}

function CredentialRow({ username, password, label }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold" style={{ color: 'var(--p-ink-900)' }}>{label}</div>
        <div className="text-[11px] font-mono" style={{ color: 'var(--p-ink-700)' }}>@{username}</div>
      </div>
      <div className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg shrink-0" style={{ background: 'white', color: 'var(--p-ink-700)', border: '1px solid var(--p-border)' }}>
        <KeyRound className="w-3 h-3" style={{ color: 'var(--p-ink-400)' }} /> {password}
      </div>
    </div>
  )
}

function routeForUser(u) {
  if (!u) return '/design-preview/login'
  switch (u.role) {
    case 'admin':              return '/design-preview/admin-dashboard'
    case 'clinic_nurse':       return '/design-preview/clinic/dashboard'
    case 'reception_kawther':  return '/design-preview/reception/al-kawther/dashboard'
    case 'reception_sheraton': return '/design-preview/reception/sheraton/dashboard'
    default:                   return '/design-preview/login'
  }
}
