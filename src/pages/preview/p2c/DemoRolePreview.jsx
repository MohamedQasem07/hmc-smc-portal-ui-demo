import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  ShieldCheck, Stethoscope, Building2, ArrowRight, Sparkles,
  CheckCircle2, Eye, AlertTriangle, FileLock2, Users, ChevronRight,
} from 'lucide-react'
import { BrandWordmark } from '../../../premium/BrandMark'
import { Avatar, StatusPill, MeshCorner } from '../../../premium/primitives'
import { useUserMode } from '../../../context/UserModeContext'
import { EXTERNAL_CLINICS, getClinicName } from '../../../data/p2c'
import { cn } from '../../../lib/cn'

/**
 * DemoRolePreview — the polished landing page for switching between the
 * four demonstration workspaces. Replaces the previous ad-hoc role chip.
 *
 * Visible at /demo-roles
 *
 * Each card lists what the role can and cannot see, so Mohamed can preview
 * the permission boundaries without backend.
 */
export default function DemoRolePreview() {
  const navigate = useNavigate()
  const { setDemoRole, clinicId } = useUserMode()
  const [selectedClinicId, setSelectedClinicId] = useState(clinicId || 'tropitel')

  function enter(role, payload = null) {
    setDemoRole(role, payload?.clinicId)
    navigate(payload?.path || defaultPathFor(role, payload?.clinicId || selectedClinicId))
  }

  return (
    <div className="theme-premium min-h-screen relative" style={{ background: 'var(--p-canvas)' }}>
      {/* Backdrop mesh */}
      <div className="absolute inset-x-0 top-0 h-[360px] pointer-events-none" style={{
        background: 'linear-gradient(180deg, #0A1B3D 0%, #122B53 60%, transparent 100%)',
      }} />
      <span className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(15,181,169,0.30) 0%, transparent 65%)' }} />
      <span className="absolute -top-24 -left-32 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(217,165,116,0.18) 0%, transparent 65%)' }} />

      <div className="relative z-10 max-w-[1300px] w-full mx-auto px-5 md:px-8 lg:px-12 pt-7 pb-16">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-12 md:mb-16">
          <BrandWordmark variant="light" />
          <div className="flex items-center gap-2">
            <Link to="/review-tools" className="text-xs font-semibold hidden md:inline-flex items-center gap-1"
                  style={{ color: 'rgba(255,255,255,0.78)' }}>
              ← Local Review Tools
            </Link>
          </div>
        </header>

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
          <div className="p-eyebrow" style={{ color: '#7FE7DE' }}>PORTAL-UX-P2C · UI Demo</div>
          <h1 className="p-display p-display-light text-3xl md:text-5xl mt-3">
            Choose a role to <span style={{ color: '#7FE7DE' }}>preview</span>.
          </h1>
          <p className="text-sm md:text-base mt-3 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.72)' }}>
            This is a frontend prototype. No real data is connected. Each role below shows what that user will see
            in the live system. You can switch any time from inside the workspace.
          </p>
        </div>

        {/* Role cards — 2x2 on tablet, 4 across on wide screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* Admin */}
          <RoleCard
            tone="navy"
            eyebrow="Central oversight"
            title="Admin Workspace"
            subtitle="Demo Administrator"
            description="Full cross-clinic visibility. Cases Master, Collections & Treasury, Daily and Monthly Reports, Control Center."
            allow={[
              'Every case across every clinic and branch',
              'Mark, correct, or review Billing Facility (HMC/SMC)',
              'Collections & Treasury (multi-currency, no FX)',
            ]}
            deny={[
              'No Invoice Manager edits — protected placeholder only',
            ]}
            cta="Enter Admin Workspace"
            icon={ShieldCheck}
            onEnter={() => enter('admin', { path: '/admin-dashboard' })}
          />

          {/* External clinic nurse */}
          <RoleCard
            tone="teal"
            eyebrow="External clinic nurse"
            title="External Clinic"
            subtitle={`Demo Nurse — ${getClinicName(selectedClinicId)}`}
            description="Mobile-first daily workspace. Register cases, classify Pending / Cash / Insurance, select HMC or SMC for Insurance per Mohamed's instruction, send transfers, view today's report."
            allow={[
              'Own clinic activity only',
              'Select HMC / SMC for Insurance cases',
              'Cash entry in original currency (no FX)',
            ]}
            deny={[
              'No other clinics, no central treasury',
              'No invoice amounts, no Invoice Manager, no Control Center',
            ]}
            cta="Enter Clinic Workspace"
            icon={Stethoscope}
            onEnter={() => enter('clinic_nurse', { clinicId: selectedClinicId })}
            footer={
              <ClinicPicker value={selectedClinicId} onChange={setSelectedClinicId} />
            }
          />

          {/* Reception — Al-Kawther */}
          <RoleCard
            tone="gold"
            eyebrow="Branch reception"
            title="Al-Kawther Reception"
            subtitle="Demo Reception — Al-Kawther Branch"
            description="Day-to-day reception workflow at Al-Kawther. Register direct cases, receive incoming transfers, classify financial type, select HMC/SMC for Insurance, view branch report."
            allow={[
              'Al-Kawther direct cases + incoming transfers',
              'Confirm Cash / Insurance after receipt',
              'Branch collections (Al-Kawther only)',
            ]}
            deny={[
              'No Sheraton activity, no other clinics',
              'No Invoice Manager, no Control Center',
            ]}
            cta="Enter Al-Kawther Reception"
            icon={Building2}
            onEnter={() => enter('reception_kawther', { path: '/reception/al-kawther/dashboard' })}
          />

          {/* Reception — Sheraton */}
          <RoleCard
            tone="teal-light"
            eyebrow="Branch reception"
            title="Sheraton Reception"
            subtitle="Demo Reception — Sheraton Branch"
            description="Identical workflow to Al-Kawther but scoped to Sheraton Branch. Separate demo records make it easy to compare the two queues."
            allow={[
              'Sheraton direct cases + incoming transfers',
              'Confirm Cash / Insurance after receipt',
              'Branch collections (Sheraton only)',
            ]}
            deny={[
              'No Al-Kawther activity, no other clinics',
              'No Invoice Manager, no Control Center',
            ]}
            cta="Enter Sheraton Reception"
            icon={Building2}
            onEnter={() => enter('reception_sheraton', { path: '/reception/sheraton/dashboard' })}
          />
        </div>

      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function RoleCard({ tone, eyebrow, title, subtitle, description, allow, deny, cta, icon: Icon, onEnter, footer }) {
  const tones = {
    navy:      { gradient: 'linear-gradient(135deg, #1E4180 0%, #0A1B3D 100%)', accent: '#7FE7DE', cta: 'p-btn-primary' },
    teal:      { gradient: 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)', accent: '#7FE7DE', cta: 'p-btn-primary' },
    'teal-light': { gradient: 'linear-gradient(135deg, #2DD4C7 0%, #0FB5A9 100%)', accent: '#7FE7DE', cta: 'p-btn-primary' },
    gold:      { gradient: 'linear-gradient(135deg, #D9A574 0%, #B8854D 100%)', accent: '#FBF5EC', cta: 'p-btn-primary' },
  }
  const t = tones[tone] || tones.navy
  return (
    <article className="relative overflow-hidden flex flex-col rounded-2xl bg-white border p-rise" style={{ borderColor: 'var(--p-border)', boxShadow: 'var(--p-shadow-card)' }}>
      <MeshCorner position="tr" size={160} color={tone === 'gold' ? '#D9A574' : '#0FB5A9'} opacity={0.10} />
      <div className="p-5 lg:p-6 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: t.gradient, boxShadow: '0 8px 20px rgba(10,27,61,0.18)' }}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-semibold" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-500)', border: '1px solid var(--p-border)' }}>
            <Eye className="w-3 h-3" /> Preview
          </span>
        </div>

        <div>
          <div className="p-eyebrow">{eyebrow}</div>
          <h2 className="p-h2 text-lg mt-1">{title}</h2>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{subtitle}</div>
        </div>

        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--p-ink-600)' }}>{description}</p>

        <ul className="space-y-1.5 mt-1">
          {allow.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: 'var(--p-ink-700)' }}>
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--p-cash)' }} />
              <span>{a}</span>
            </li>
          ))}
          {deny.map((d, i) => (
            <li key={`d-${i}`} className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: 'var(--p-ink-500)' }}>
              <FileLock2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--p-gold)' }} />
              <span>{d}</span>
            </li>
          ))}
        </ul>

        {footer && <div className="mt-2">{footer}</div>}
      </div>

      <button onClick={onEnter} className="m-4 mt-2 lg:mx-6 lg:mb-6 inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold p-btn-primary">
        {cta} <ArrowRight className="w-4 h-4" />
      </button>
    </article>
  )
}

function ClinicPicker({ value, onChange }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
      <div className="text-[10px] uppercase tracking-[0.14em] font-bold mb-1.5" style={{ color: 'var(--p-ink-500)' }}>Demo clinic identity</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm font-semibold appearance-none bg-transparent focus:outline-none"
        style={{ color: 'var(--p-ink-900)' }}
      >
        {EXTERNAL_CLINICS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  )
}

function defaultPathFor(role, clinicId) {
  switch (role) {
    case 'admin':              return '/admin-dashboard'
    case 'clinic_nurse':       return '/clinic/dashboard'
    case 'reception_kawther':  return '/reception/al-kawther/dashboard'
    case 'reception_sheraton': return '/reception/sheraton/dashboard'
    default:                   return '/admin-dashboard'
  }
}
