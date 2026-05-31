import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, ShieldCheck, AlertCircle, CheckCircle2, ArrowRight, KeyRound, Eye, EyeOff } from 'lucide-react'
import { BrandMark } from '../../premium/BrandMark'
import { PremiumButton, PremiumField, PremiumInput } from '../../premium/primitives'
import { IS_SUPABASE } from '../../lib/api/config'
import { cn } from '../../lib/cn'
import {
  sbVerifyRecoveryOtp, sbUpdatePassword, sbHasSession,
  sbRequestPasswordReset, sbSignOut,
} from '../../lib/api/auth'

/**
 * SetPassword (Sprint 1) — first-login / forgot-password. Supabase mode only.
 * Reaches the password form via either:
 *   1. ?email=&code=  — a one-time OTP (admin-generated link OR recovery email)
 *   2. an active recovery session (email-link click, established by the SDK)
 * Then the user chooses their OWN password (updateUser). No plaintext is stored;
 * the recovery code is one-time and time-limited.
 */
export default function SetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [phase, setPhase] = useState('loading') // loading | set | request | done
  const [email, setEmail] = useState(params.get('email') || '')
  const [code, setCode] = useState(params.get('code') || '')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!IS_SUPABASE) { setPhase('request'); return }
    let active = true
    ;(async () => {
      const qEmail = params.get('email'); const qCode = params.get('code')
      if (qEmail && qCode) {
        const r = await sbVerifyRecoveryOtp(qEmail, qCode)
        if (!active) return
        if (r.ok) { setPhase('set'); setInfo('Identity verified — choose your new password.') }
        else { setError(r.error || 'This link is invalid or has expired. Request a new one below.'); setPhase('request') }
        return
      }
      const has = await sbHasSession()
      if (!active) return
      if (has) { setPhase('set'); setInfo('Choose your new password.') }
      else setPhase('request')
    })()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verifyCode(e) {
    e?.preventDefault(); setError(null); setBusy(true)
    const r = await sbVerifyRecoveryOtp(email, code); setBusy(false)
    if (r.ok) { setPhase('set'); setInfo('Identity verified — choose your new password.') }
    else setError(r.error || 'Invalid or expired code.')
  }

  async function sendEmail(e) {
    e?.preventDefault(); setError(null); setInfo(null); setBusy(true)
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}#/set-password`
    const r = await sbRequestPasswordReset(email, redirectTo); setBusy(false)
    if (r.ok) setInfo(`If ${email} has an account, a set-password email with a one-time code is on its way. Enter the code below, or click the link in the email.`)
    else setError(r.error || 'Could not send the email.')
  }

  async function savePassword(e) {
    e?.preventDefault(); setError(null)
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (pw !== pw2) { setError('The two passwords do not match.'); return }
    setBusy(true)
    const r = await sbUpdatePassword(pw)
    if (!r.ok) { setBusy(false); setError(r.error || 'Could not set the password.'); return }
    try { await sbSignOut() } catch { /* ignore */ }
    setBusy(false); setPhase('done')
    setTimeout(() => navigate('/login', { replace: true }), 1800)
  }

  return (
    <div className="theme-premium min-h-screen flex items-center justify-center px-5 py-10"
      style={{ background: 'linear-gradient(180deg, #FAF9F6 0%, #F4F6FB 100%)' }}>
      <div className="w-full max-w-md p-rise-2">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={56} />
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.10em]" style={{ color: 'var(--p-ink-500)' }}>
            HMC / SMC Clinic Portal
          </div>
        </div>

        <div className="p-hero-card p-8 sm:p-9">
          <div className="p-eyebrow mb-2">Account security</div>
          <h2 className="p-h1 text-2xl">{phase === 'done' ? 'Password set' : 'Set your password'}</h2>

          {phase === 'loading' && <p className="text-sm mt-3" style={{ color: 'var(--p-ink-500)' }}>Verifying…</p>}

          {info && phase !== 'done' && (
            <div className="mt-4 rounded-xl px-3.5 py-3 flex items-start gap-2.5"
              style={{ background: 'rgba(45,212,199,0.10)', border: '1px solid rgba(45,212,199,0.30)' }}>
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#0E8C7F' }} />
              <span className="text-[12px] leading-relaxed font-semibold" style={{ color: '#0B6B61' }}>{info}</span>
            </div>
          )}
          {error && (
            <div role="alert" className="mt-4 rounded-xl px-3.5 py-3 flex items-start gap-2.5"
              style={{ background: 'rgba(177,66,66,0.08)', border: '1px solid rgba(177,66,66,0.30)' }}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#B14242' }} />
              <span className="text-[12px] leading-relaxed font-semibold" style={{ color: '#7A2A2A' }}>{error}</span>
            </div>
          )}

          {phase === 'set' && (
            <form className="mt-6 space-y-4" onSubmit={savePassword} noValidate>
              <PremiumField label="New password" required>
                <div className="relative">
                  <PremiumInput type={showPw ? 'text' : 'password'} value={pw}
                    onChange={(e) => { setPw(e.target.value); setError(null) }}
                    placeholder="At least 8 characters" autoComplete="new-password" style={{ paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-black/5"
                    style={{ color: 'var(--p-ink-400)' }} aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </PremiumField>
              <PremiumField label="Confirm password" required>
                <PremiumInput type={showPw ? 'text' : 'password'} value={pw2}
                  onChange={(e) => { setPw2(e.target.value); setError(null) }}
                  placeholder="Re-enter password" autoComplete="new-password" />
              </PremiumField>
              <PremiumButton type="submit" fullWidth size="lg" rightIcon={<ArrowRight className="w-4 h-4" />} disabled={busy}>
                {busy ? 'Saving…' : 'Set password & continue'}
              </PremiumButton>
            </form>
          )}

          {phase === 'request' && (
            <div className="mt-6 space-y-5">
              <p className="text-sm" style={{ color: 'var(--p-ink-500)' }}>
                Enter your email to receive a one-time set-password code, or paste a code you were given.
              </p>
              <form className="space-y-3" onSubmit={sendEmail} noValidate>
                <PremiumField label="Email" required>
                  <PremiumInput type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null) }}
                    placeholder="you@example.com" autoComplete="username" autoFocus />
                </PremiumField>
                <button type="submit" disabled={busy || !email}
                  className={cn('w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full text-sm font-bold p-btn-ghost',
                    (busy || !email) && 'opacity-40 cursor-not-allowed')}>
                  {busy ? 'Sending…' : 'Email me a set-password code'}
                </button>
              </form>
              <div className="flex items-center gap-3">
                <span className="flex-1 h-px" style={{ background: 'var(--p-border)' }} />
                <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-400)' }}>or use a code</span>
                <span className="flex-1 h-px" style={{ background: 'var(--p-border)' }} />
              </div>
              <form className="space-y-3" onSubmit={verifyCode} noValidate>
                <PremiumField label="One-time code">
                  <PremiumInput value={code} onChange={(e) => { setCode(e.target.value); setError(null) }}
                    placeholder="Code from your email or admin link" />
                </PremiumField>
                <PremiumButton type="submit" fullWidth rightIcon={<KeyRound className="w-4 h-4" />} disabled={busy || !email || !code}>
                  Verify code
                </PremiumButton>
              </form>
            </div>
          )}

          {phase === 'done' && (
            <div className="mt-6 flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="w-12 h-12" style={{ color: '#0E8C7F' }} />
              <p className="text-sm" style={{ color: 'var(--p-ink-600)' }}>Your password is set. Redirecting you to sign in…</p>
              <button onClick={() => navigate('/login', { replace: true })}
                className="text-sm font-semibold hover:underline" style={{ color: 'var(--p-brand-mid)' }}>
                Go to sign in now
              </button>
            </div>
          )}

          <div className="mt-7 pt-4 flex items-center justify-center gap-1.5 text-[11px]"
            style={{ color: 'var(--p-ink-400)', borderTop: '1px solid var(--p-border)' }}>
            <Lock className="w-3 h-3" /> Secure first-login setup
          </div>
        </div>

        <p className="text-center text-[11px] mt-6" style={{ color: 'var(--p-ink-400)' }}>
          <button onClick={() => navigate('/login')} className="font-semibold hover:underline" style={{ color: 'var(--p-ink-500)' }}>
            Back to sign in
          </button>
        </p>
      </div>
    </div>
  )
}
