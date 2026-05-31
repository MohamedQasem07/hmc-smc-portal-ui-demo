import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, ShieldCheck, ArrowRight, Stethoscope, Globe2, Lock,
  AlertCircle, Building2,
} from 'lucide-react'
import { BrandMark, BrandWordmark } from '../../premium/BrandMark'
import { PremiumButton, PremiumField, PremiumInput, StatPill } from '../../premium/primitives'
import { useUserMode } from '../../context/UserModeContext'
import { useDemoState } from '../../context/DemoStateContext'
import { findUserByUsername } from '../../data/staffUsers'
import { IS_SUPABASE } from '../../lib/api/config'

/**
 * Premium Login (P2C.R4)
 * -----------------------------------------------------------------------
 * Production-shaped login screen. Validates the entered username/password
 * against the runtime Portal Users collection (DemoStateContext.users) and
 * routes by role:
 *
 *   admin               → /admin-dashboard
 *   clinic_nurse        → /clinic/dashboard
 *   reception_kawther   → /reception/al-kawther/dashboard
 *   reception_sheraton  → /reception/sheraton/dashboard
 *
 * Inactive users are blocked with a clean error. No fake "securely
 * authenticated" claim is shown — real authentication is wired in the
 * backend phase. The Local Review Tools entry sits in the footer for
 * Mohamed to switch quickly into the legacy demo-roles workspace if
 * needed during UAT.
 */
export default function PremiumLogin() {
  const navigate = useNavigate()
  const { signIn, isSignedIn, currentUser } = useUserMode()
  const { state, actions } = useDemoState()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // If a session already exists, jump straight to its workspace.
  useEffect(() => {
    if (isSignedIn && currentUser) {
      navigate(routeForUser(currentUser), { replace: true })
    }
  }, [isSignedIn, currentUser, navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)

    // ---- Supabase mode: real Auth login by email ----
    if (IS_SUPABASE) {
      setSubmitting(true)
      const res = await signIn(username, password)   // `username` field holds the email
      setSubmitting(false)
      if (!res || res.error) {
        setError(res?.error || 'Incorrect email or password.')
        return
      }
      navigate(routeForUser(res.user), { replace: true })
      return
    }

    // ---- Mock mode: validate against runtime Portal Users ----
    const u = findUserByUsername(state.users, username)
    if (!u) {
      setError('Incorrect username or password.')
      return
    }
    if (u.status !== 'Active') {
      setError('This account is inactive. Contact Admin to re-activate it.')
      return
    }
    if ((password || '').trim() !== u.demoPassword) {
      setError('Incorrect username or password.')
      return
    }
    setSubmitting(true)
    actions.touchUserLogin(u.userId)
    signIn(u)
    navigate(routeForUser(u), { replace: true })
  }

  return (
    <div className="theme-premium min-h-screen relative overflow-hidden" style={{ background: 'var(--p-canvas-warm)' }}>
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ============ LEFT — branded story ============ */}
        <aside className="relative p-mesh p-grid-overlay overflow-hidden hidden lg:flex flex-col justify-between p-12 xl:p-16">
          <span className="absolute -top-40 -right-40 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(45,212,199,0.30) 0%, transparent 65%)' }} />
          <span className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(94,131,181,0.22) 0%, transparent 70%)' }} />

          <div className="relative z-10 p-rise">
            <BrandWordmark variant="light" />
          </div>

          <div className="relative z-10 p-rise-1">
            <div className="p-eyebrow mb-4" style={{ color: '#7FE7DE' }}>Secure Clinic Operations Workspace</div>
            <h1 className="p-display p-display-light text-[44px] xl:text-[56px] max-w-xl">
              Coastal medicine,<br />
              <span style={{ color: '#7FE7DE' }}>operational clarity.</span>
            </h1>
            <p className="mt-5 text-base xl:text-lg leading-relaxed max-w-md" style={{ color: 'rgba(255,255,255,0.72)' }}>
              The unified Portal for every HMC and SMC branch — register cash and insurance cases,
              route patients between clinics, and prepare invoices for review without leaving the screen.
            </p>

            <div className="mt-9 flex flex-wrap gap-2.5">
              <StatPill label="Facilities" value="HMC · SMC" />
              <StatPill label="Branches" value="8 active" />
              <StatPill label="Currencies" value="EUR · GBP · USD · EGP" />
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
              <Feature icon={Stethoscope} title="Clinical-grade" body="Built for medical operations, not generic admin." />
              <Feature icon={Globe2}      title="International" body="Insurance and assistance flow for every patient." />
              <Feature icon={ShieldCheck} title="Protected"    body="Invoice Manager and PDF engines untouched." />
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[11px]" style={{ color: 'rgba(255,255,255,0.48)' }}>
            <span>Hurghada Medical Center · Sahl Hasheesh Medical Centre</span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Internal use only
            </span>
          </div>
        </aside>

        {/* ============ RIGHT — login card ============ */}
        <main className="flex items-center justify-center px-5 sm:px-10 py-10 lg:py-0" style={{ background: 'linear-gradient(180deg, #FAF9F6 0%, #F4F6FB 100%)' }}>
          <div className="w-full max-w-md p-rise-2">
            {/* Mobile brand header */}
            <div className="lg:hidden mb-8 flex flex-col items-center text-center">
              <BrandMark size={56} />
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.10em]" style={{ color: 'var(--p-ink-500)' }}>
                HMC / SMC Clinic Portal
              </div>
            </div>

            <div className="p-hero-card p-8 sm:p-9 relative">
              <div className="p-eyebrow mb-2">Sign in</div>
              <h2 className="p-h1 text-2xl">Welcome back</h2>
              <p className="text-sm mt-1.5" style={{ color: 'var(--p-ink-500)' }}>
                Use your clinic or branch credentials.
              </p>

              <form className="mt-7 space-y-4" onSubmit={onSubmit} noValidate>
                <PremiumField label={IS_SUPABASE ? 'Email' : 'Username'} required>
                  <PremiumInput
                    type={IS_SUPABASE ? 'email' : 'text'}
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(null) }}
                    placeholder={IS_SUPABASE ? 'e.g. admin@portal.test' : 'e.g. admin · tropitel · kawther'}
                    autoComplete="username"
                    autoFocus
                  />
                </PremiumField>
                <PremiumField label="Password" required>
                  <div className="relative">
                    <PremiumInput
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null) }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      style={{ paddingRight: '44px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-black/5"
                      style={{ color: 'var(--p-ink-400)' }}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </PremiumField>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--p-ink-600)' }}>
                    <input type="checkbox" defaultChecked className="rounded text-teal-600" style={{ borderColor: 'var(--p-border-strong)' }} />
                    Remember this device
                  </label>
                  <span className="font-semibold" style={{ color: 'var(--p-ink-400)' }}>Contact Admin for access</span>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl px-3.5 py-3 flex items-start gap-2.5"
                    style={{ background: 'rgba(177, 66, 66, 0.08)', border: '1px solid rgba(177, 66, 66, 0.30)' }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#B14242' }} />
                    <span className="text-[12px] leading-relaxed font-semibold" style={{ color: '#7A2A2A' }}>{error}</span>
                  </div>
                )}

                <PremiumButton type="submit" fullWidth size="lg" rightIcon={<ArrowRight className="w-4 h-4" />} disabled={submitting}>
                  {submitting ? 'Signing in…' : 'Sign In'}
                </PremiumButton>
              </form>
            </div>

            <p className="text-center text-[11px] mt-6" style={{ color: 'var(--p-ink-400)' }}>
              {!IS_SUPABASE && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/review-tools')}
                    className="font-semibold hover:underline"
                    style={{ color: 'var(--p-ink-500)' }}
                  >
                    Local Review Tools
                  </button>
                  <span className="mx-2">·</span>
                </>
              )}
              Need an account? Contact your HMC / SMC administrator.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function routeForUser(u) {
  if (!u) return '/login'
  switch (u.role) {
    case 'admin':              return '/admin-dashboard'
    case 'clinic_nurse':       return '/clinic/dashboard'
    case 'reception_kawther':  return '/reception/al-kawther/dashboard'
    case 'reception_sheraton': return '/reception/sheraton/dashboard'
    default:                   return '/login'
  }
}

function Feature({ icon: Icon, title, body }) {
  return (
    <div className="rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Icon className="w-4 h-4 mb-1.5" style={{ color: '#7FE7DE' }} />
      <div className="text-[11px] font-bold text-white">{title}</div>
      <div className="text-[10px] leading-relaxed mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{body}</div>
    </div>
  )
}
