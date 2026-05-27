import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, ShieldCheck, FlaskConical, ArrowRight, Building2,
  UserCog, Stethoscope, Globe2, Lock,
} from 'lucide-react'
import { BrandMark, BrandWordmark } from '../../premium/BrandMark'
import { PremiumButton, PremiumField, PremiumInput, StatPill } from '../../premium/primitives'
import { useUserMode } from '../../context/UserModeContext'

export default function PremiumLogin() {
  const navigate = useNavigate()
  const { setRole } = useUserMode()
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('reception@tropitel.clinic')
  const [password, setPassword] = useState('demo')

  const enter = (role) => {
    setRole(role)
    navigate(role === 'admin' ? '/design-preview/admin-dashboard' : '/design-preview/clinic-dashboard')
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-7" style={{ background: 'rgba(15, 181, 169, 0.16)', border: '1px solid rgba(15, 181, 169, 0.32)' }}>
              <FlaskConical className="w-3.5 h-3.5" style={{ color: '#7FE7DE' }} />
              <span className="text-[11px] font-semibold tracking-[0.10em] uppercase" style={{ color: '#7FE7DE' }}>P2A · Design Direction Preview</span>
            </div>

            <h1 className="p-display p-display-light text-[44px] xl:text-[56px] max-w-xl">
              Coastal medicine,<br />
              <span style={{ color: '#7FE7DE' }}>operational clarity.</span>
            </h1>
            <p className="mt-5 text-base xl:text-lg leading-relaxed max-w-md" style={{ color: 'rgba(255,255,255,0.72)' }}>
              The unified Portal for every HMC and SMC branch — register cash and insurance cases, route patients between clinics, and prepare invoices for review without leaving the screen.
            </p>

            <div className="mt-9 flex flex-wrap gap-2.5">
              <StatPill label="Facilities" value="HMC · SMC" />
              <StatPill label="Branches" value="8 active" />
              <StatPill label="Currencies" value="EUR · GBP · USD · EGP" />
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
              <Feature icon={Stethoscope} title="Clinical-grade" body="Built for medical operations, not generic admin." />
              <Feature icon={Globe2}      title="International" body="Insurance & assistance flow for every patient." />
              <Feature icon={ShieldCheck} title="Protected"    body="Existing Invoice Manager and PDF engines untouched." />
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[11px]" style={{ color: 'rgba(255,255,255,0.48)' }}>
            <span>© {new Date().getFullYear()} HMC / SMC operational application</span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Internal use only
            </span>
          </div>
        </aside>

        {/* ============ RIGHT — login card ============ */}
        <main className="flex items-center justify-center px-5 sm:px-10 py-10 lg:py-0" style={{ background: 'linear-gradient(180deg, #FAF9F6 0%, #F4F6FB 100%)' }}>
          <div className="w-full max-w-md p-rise-2">
            {/* Mobile-only brand header */}
            <div className="lg:hidden mb-8 flex flex-col items-center text-center">
              <BrandMark size={56} />
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--p-pending-soft)', border: '1px solid #F0D38C' }}>
                <FlaskConical className="w-3 h-3" style={{ color: '#A1672A' }} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#A1672A' }}>Design Preview · Demo Data</span>
              </div>
            </div>

            <div className="p-hero-card p-8 sm:p-9 relative">
              <div className="p-eyebrow mb-2">Secure Branch Access</div>
              <h2 className="p-h1 text-2xl">Welcome back</h2>
              <p className="text-sm mt-1.5" style={{ color: 'var(--p-ink-500)' }}>
                Sign in with your clinic credentials, or enter the demo workspace below.
              </p>

              <form
                className="mt-7 space-y-4"
                onSubmit={(e) => { e.preventDefault(); enter('clinic') }}
              >
                <PremiumField label="Work Email" required>
                  <PremiumInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@clinic.example" autoComplete="email" />
                </PremiumField>
                <PremiumField label="Password" required>
                  <div className="relative">
                    <PremiumInput
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      style={{ paddingRight: '44px' }}
                    />
                    <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-black/5"
                      style={{ color: 'var(--p-ink-400)' }}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </PremiumField>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--p-ink-600)' }}>
                    <input type="checkbox" defaultChecked className="rounded text-teal-600" style={{ borderColor: 'var(--p-border-strong)' }} />
                    Remember this device
                  </label>
                  <a className="font-semibold hover:underline" style={{ color: 'var(--p-teal)' }} href="#">Forgot password?</a>
                </div>

                <PremiumButton type="submit" fullWidth size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Sign In
                </PremiumButton>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'var(--p-border-strong)' }} />
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold" style={{ color: 'var(--p-ink-400)' }}>Demo Entry</span>
                <div className="flex-1 h-px" style={{ background: 'var(--p-border-strong)' }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DemoEntry icon={Building2} title="Clinic User" subtitle="Reception · Branch nurse" tone="teal" onClick={() => enter('clinic')} />
                <DemoEntry icon={UserCog}   title="Demo Administrator" subtitle="Financial Director" tone="navy" onClick={() => enter('admin')} />
              </div>

              <div className="mt-6 flex items-start gap-2.5 rounded-xl px-3.5 py-3" style={{ background: 'var(--p-insurance-soft)', border: '1px solid rgba(15,181,169,0.25)' }}>
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#0A8F87' }} />
                <span className="text-[11px] leading-relaxed" style={{ color: '#0A6E64' }}>
                  Secure Branch Access — credentials are not connected to any backend in this preview. Any value enters the demo workspace.
                </span>
              </div>
            </div>

            <p className="text-center text-[11px] mt-6" style={{ color: 'var(--p-ink-400)' }}>
              Need access? Contact your HMC / SMC administrator.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
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

function DemoEntry({ icon: Icon, title, subtitle, tone, onClick }) {
  const styles = {
    teal: { iconBg: '#E0F8F6', iconFg: '#0A8F87', border: 'rgba(15,181,169,0.25)' },
    navy: { iconBg: '#E9EFF8', iconFg: '#1E4180', border: 'rgba(30,65,128,0.25)' },
  }[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-start rounded-xl p-3.5 transition-all hover:-translate-y-0.5"
      style={{
        background: 'var(--p-surface)',
        border: `1px solid ${styles.border}`,
        boxShadow: 'var(--p-shadow-soft)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: styles.iconBg, color: styles.iconFg }}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight" style={{ color: 'var(--p-ink-900)' }}>{title}</div>
          <div className="text-[11px] truncate" style={{ color: 'var(--p-ink-500)' }}>{subtitle}</div>
        </div>
      </div>
    </button>
  )
}
