import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, ShieldCheck, ArrowRight, Lock, Mail, AlertCircle,
} from 'lucide-react'
import { useUserMode } from '../../context/UserModeContext'
import { useDemoState } from '../../context/DemoStateContext'
import { findUserByUsername } from '../../data/staffUsers'
import { IS_SUPABASE } from '../../lib/api/config'

const BASE = import.meta.env.BASE_URL

/**
 * Premium Login (P3D — first-impression rebuild)
 * -----------------------------------------------------------------------
 * Immersive deep-navy medical command-center login. Real HMC + SMC logos,
 * glass card, crystal-clear fields. Auth logic is UNCHANGED from P2C.R4:
 * validates against the runtime Portal Users in mock mode, real Supabase
 * Auth in supabase mode, and routes by role.
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
    <div
      className="theme-premium min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 py-8"
      style={{
        background:
          'radial-gradient(1200px 720px at 50% -12%, rgba(15,181,169,0.16) 0%, transparent 56%),' +
          'radial-gradient(900px 620px at 100% 112%, rgba(217,165,116,0.13) 0%, transparent 56%),' +
          'linear-gradient(165deg, #0A1428 0%, #0E2247 48%, #091A39 100%)',
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* decorative layers */}
      <div className="absolute inset-0 p-grid-overlay pointer-events-none" style={{ opacity: 0.5 }} />
      <EkgLine />
      <span className="absolute -top-32 -left-24 w-[380px] h-[380px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(15,181,169,0.20) 0%, transparent 65%)' }} />
      <span className="absolute -bottom-40 -right-24 w-[440px] h-[440px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(94,131,181,0.20) 0%, transparent 70%)' }} />

      {/* centered content */}
      <div className="relative z-10 w-full max-w-[440px] mx-auto p-rise-2">
        {/* ---- Logos ---- */}
        <div className="text-center mb-5">
          <div className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3" style={{ color: '#7FE7DE' }}>Unified Clinic Portal</div>
          <div className="flex items-stretch justify-center gap-3">
            <LogoPlate src={`${BASE}brand/hmc-logo.png`} alt="Hurghada Medical Center" />
            <span className="w-px self-center h-9" style={{ background: 'rgba(255,255,255,0.18)' }} />
            <LogoPlate src={`${BASE}brand/smc-logo.png`} alt="Sahl Hasheesh Medical Centre" />
          </div>
        </div>

        {/* ---- Title ---- */}
        <div className="text-center mb-4">
          <h1 className="text-[25px] sm:text-[29px] font-extrabold text-white leading-tight" style={{ letterSpacing: '-0.02em' }}>
            HMC <span style={{ color: '#7FE7DE' }}>/</span> SMC Clinic Portal
          </h1>
          <p className="text-[13px] sm:text-sm mt-1.5 max-w-sm mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.66)' }}>
            Secure clinic operations, insurance tracking, and branch reporting.
          </p>
        </div>

        {/* ---- Facility badges ---- */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-5">
          {['HMC', 'SMC', 'External Clinics', 'Main Branches'].map((b) => (
            <span key={b} className="text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.84)' }}>{b}</span>
          ))}
        </div>

        {/* ---- Glass login card ---- */}
        <div className="rounded-2xl p-6 sm:p-7 relative overflow-hidden" style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(22px) saturate(140%)',
          WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 30px 70px rgba(4,10,24,0.55)',
        }}>
          <span className="absolute top-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(217,165,116,0.7), transparent)' }} />
          <div className="text-[10px] uppercase tracking-[0.16em] font-bold mb-1" style={{ color: '#7FE7DE' }}>Sign in</div>
          <h2 className="text-xl font-bold text-white">Welcome back</h2>
          <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.62)' }}>Use your clinic or branch credentials.</p>

          <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
            {/* Email / username */}
            <div>
              <label htmlFor="login-id" className="block text-[11px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'rgba(255,255,255,0.80)' }}>
                {IS_SUPABASE ? 'Email' : 'Username'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
                <input
                  id="login-id"
                  type={IS_SUPABASE ? 'email' : 'text'}
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(null) }}
                  placeholder={IS_SUPABASE ? 'e.g. you@hmcportal.com' : 'e.g. admin · tropitel · kawther'}
                  autoComplete="username"
                  autoFocus
                  className="p-login-input"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-pw" className="block text-[11px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'rgba(255,255,255,0.80)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
                <input
                  id="login-pw"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="p-login-input"
                  style={{ paddingLeft: '40px', paddingRight: '46px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg inline-flex items-center justify-center transition-colors hover:bg-black/5"
                  style={{ color: '#64748B' }}
                >
                  {showPw ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* remember + forgot */}
            <div className="flex items-center justify-between text-[12px]">
              <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color: 'rgba(255,255,255,0.72)' }}>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-teal-500" />
                Remember this device
              </label>
              {IS_SUPABASE && (
                <button type="button" onClick={() => navigate('/set-password')} className="font-semibold hover:underline" style={{ color: '#7FE7DE' }}>
                  Forgot password?
                </button>
              )}
            </div>

            {error && (
              <div role="alert" className="rounded-xl px-3.5 py-3 flex items-start gap-2.5"
                style={{ background: 'rgba(226,106,106,0.14)', border: '1px solid rgba(226,106,106,0.42)' }}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#FF9C95' }} />
                <span className="text-[12px] leading-relaxed font-semibold" style={{ color: '#FFC9C4' }}>{error}</span>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="p-btn-primary w-full h-12 rounded-xl text-[15px] font-bold inline-flex items-center justify-center gap-2">
              {submitting ? 'Signing in…' : 'Sign In'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* ---- Trust footer ---- */}
        <div className="mt-5 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.52)' }}>
            <ShieldCheck className="w-3.5 h-3.5" /> Internal medical operations system · Authorized users only
          </div>
          <div className="mt-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {!IS_SUPABASE && (
              <>
                <button type="button" onClick={() => navigate('/review-tools')} className="font-semibold hover:underline" style={{ color: 'rgba(255,255,255,0.62)' }}>
                  Local Review Tools
                </button>
                <span className="mx-2">·</span>
              </>
            )}
            Need an account? Contact your HMC / SMC administrator.
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function LogoPlate({ src, alt }) {
  return (
    <div className="rounded-xl bg-white flex items-center justify-center px-3.5"
      style={{ height: '54px', boxShadow: '0 10px 26px rgba(4,10,24,0.40)' }}>
      <img src={src} alt={alt} className="h-8 sm:h-9 w-auto object-contain" style={{ maxWidth: '124px' }} />
    </div>
  )
}

function EkgLine() {
  return (
    <svg className="absolute left-0 right-0 top-1/2 w-full pointer-events-none" height="120" preserveAspectRatio="none" viewBox="0 0 1200 120" style={{ opacity: 0.07 }} aria-hidden="true">
      <path d="M0 60 H380 l18 -42 l22 84 l20 -70 l16 28 H700 l24 -52 l20 92 l18 -40 H1200" stroke="#7FE7DE" strokeWidth="2" fill="none" />
    </svg>
  )
}

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
