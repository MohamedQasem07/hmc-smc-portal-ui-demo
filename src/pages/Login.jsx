import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, FlaskConical, ArrowRight, Building2, UserCog } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, Field } from '../components/ui/Input'
import { Brand } from '../components/layout/Brand'
import { useUserMode } from '../context/UserModeContext'

/**
 * Login — visual only. Two demo-entry buttons enter either Clinic or Admin view.
 * The email/password fields are visually present so the user can preview the production design,
 * but pressing Sign In simply enters the prototype.
 */
export default function Login() {
  const navigate = useNavigate()
  const { setRole } = useUserMode()
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('reception@tropitel.clinic')
  const [password, setPassword] = useState('demo')

  const enter = (role) => {
    setRole(role)
    navigate(role === 'admin' ? '/admin/dashboard' : '/clinic/dashboard')
  }

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Left visual column — only shows on desktop */}
      <aside className="hidden lg:flex flex-col w-1/2 xl:w-[55%] bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 demo-stripe" />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10 px-12 py-10 flex flex-col h-full">
          <Brand />

          <div className="my-auto max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-sky-200 mb-5">
              <FlaskConical className="w-3.5 h-3.5" /> UI / UX Prototype · Demo Data Only
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
              One unified workspace<br />for every clinic & every case.
            </h1>
            <p className="mt-4 text-sky-100/80 text-base leading-relaxed">
              Register cash and insurance cases in under a minute from any branch.
              Track transfers between locations, classify financials, and keep
              every visit fully documented — built for HMC and SMC daily operations.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
              <Stat label="Branches" value="6" />
              <Stat label="Currencies" value="EUR · GBP · USD · EGP" />
              <Stat label="Workflows" value="Cash · Insurance · Transfer" />
            </div>
          </div>

          <div className="relative z-10 text-[11px] text-sky-200/60">
            © {new Date().getFullYear()} HMC / SMC operational application — Internal use only.
          </div>
        </div>
      </aside>

      {/* Right form column */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex flex-col items-center text-center">
            <Brand />
            <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
              <FlaskConical className="w-3 h-3" /> UI / UX Prototype · Demo Data Only
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-card border border-border p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ink-900">Sign in</h2>
            <p className="text-sm text-ink-500 mt-1">Secure branch access</p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => { e.preventDefault(); enter('clinic') }}
            >
              <Field label="Email" htmlFor="login-email" required>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.example"
                  autoComplete="email"
                />
              </Field>
              <Field
                label="Password"
                htmlFor="login-pw"
                required
              >
                <div className="relative">
                  <Input
                    id="login-pw"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pe-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-ink-400 hover:text-ink-700 rounded-md"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-ink-600 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-border-strong text-sky-600 focus:ring-sky-500" />
                  Remember this device
                </label>
                <a className="text-sky-700 hover:underline" href="#">Forgot password?</a>
              </div>

              <Button type="submit" fullWidth size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Sign In
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">Demo Entry</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => enter('clinic')}
                className="rounded-lg border border-border-strong bg-white hover:bg-subtle p-3 text-start transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-md bg-sky-50 text-sky-700 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold">Branch</div>
                </div>
                <div className="mt-2 text-sm font-semibold text-ink-900">Clinic User</div>
                <div className="text-[11px] text-ink-500">Reception · Branch nurse</div>
              </button>
              <button
                onClick={() => enter('admin')}
                className="rounded-lg border border-border-strong bg-white hover:bg-subtle p-3 text-start transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-md bg-navy-50 text-navy-800 flex items-center justify-center">
                    <UserCog className="w-4 h-4" />
                  </span>
                  <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold">Admin</div>
                </div>
                <div className="mt-2 text-sm font-semibold text-ink-900">Demo Administrator</div>
                <div className="text-[11px] text-ink-500">Financial Director</div>
              </button>
            </div>

            <div className="mt-5 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-[11px] text-emerald-900">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Secure Branch Access — credentials are not connected to any backend in this prototype.
                Any value enters the demo workspace.
              </span>
            </div>
          </div>

          <p className="text-center text-[11px] text-ink-400 mt-6">
            Need access? Contact your HMC / SMC administrator.
          </p>

          {/* P2A — entry point to the premium visual direction preview (isolated, optional) */}
          <p className="text-center text-[11px] mt-3">
            <a href="/" className="inline-flex items-center gap-1.5 text-sky-700 hover:underline font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> View P2A premium visual direction preview
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-white/8 border border-white/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-sky-200/80 font-semibold">{label}</div>
      <div className="text-sm font-semibold text-white mt-0.5">{value}</div>
    </div>
  )
}
