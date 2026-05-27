import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, User, Phone, Mail, IdCard, Plane, CalendarDays, FlaskConical,
  ArrowRight, Building2, Save, Sparkles, AlertTriangle, Info,
} from 'lucide-react'
import { BrandMark } from '../../premium/BrandMark'
import {
  PremiumStepper, PremiumButton, PremiumField, PremiumInput, PremiumSelect,
  StatusPill, MeshCorner, SectionLabel,
} from '../../premium/primitives'
import {
  FACILITIES, NATIONALITIES, HOTELS, getBranch, getBranchName,
} from '../../data/mock'
import { useUserMode } from '../../context/UserModeContext'
import { cn } from '../../lib/cn'

const STEPS = [
  { id: 'context',   label: 'Visit'      },
  { id: 'patient',   label: 'Patient'    },
  { id: 'route',     label: 'Route'      },
  { id: 'financial', label: 'Financial'  },
  { id: 'docs',      label: 'Documents'  },
]

export default function PremiumAddNewCase() {
  const navigate = useNavigate()
  const { user } = useUserMode()
  const branch = getBranch(user.branchId)
  const facility = FACILITIES.find((f) => f.id === user.facilityId) || FACILITIES[0]

  const [current] = useState('patient') // demo lands on patient section to show richest UI
  const [patient, setPatient] = useState({
    name: 'Anna Müller',
    gender: 'Female',
    dob: '1978-11-02',
    nationality: 'German',
    hotel: 'Jaz Oriental',
    room: '512',
    phone: '+49 69 555 0102',
    email: 'a.mueller.demo@example.test',
    passport: 'DE-DEMO-CN445221',
    arrivalDate: '2026-05-22',
    departureDate: '2026-06-02',
    note: '',
  })
  const setP = (k, v) => setPatient((p) => ({ ...p, [k]: v }))

  return (
    <div className="theme-premium min-h-screen pb-32" style={{ background: 'var(--p-canvas)' }}>
      {/* ============ COMPACT HERO ============ */}
      <header className="p-mesh p-grid-overlay relative overflow-hidden" style={{ paddingBottom: '28px' }}>
        <MeshCorner position="tr" size={160} color="#2DD4C7" opacity={0.30} />

        <div className="relative z-10 px-5 pt-4">
          <div className="flex items-center justify-between">
            <Link to="/design-preview/clinic-dashboard" aria-label="Back" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <ChevronLeft className="w-4 h-4 text-white" />
            </Link>
            <BrandMark size={32} variant="dark" />
            <span className="w-9 h-9" /> {/* spacer */}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="p-eyebrow" style={{ color: '#7FE7DE' }}>New Case · {facility.name} · {branch?.name}</span>
          </div>
          <h1 className="p-display p-display-light text-[24px] mt-1 leading-tight">
            Register a patient visit
          </h1>
          <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Five short steps. The same Our Ref continues through any transfer.
          </p>
        </div>
      </header>

      {/* ============ STEPPER (floating card) ============ */}
      <div className="px-4 -mt-5 relative z-10 p-rise">
        <div className="p-card px-3 py-3.5">
          <PremiumStepper steps={STEPS} current={current} />
        </div>
      </div>

      {/* ============ SECTION CARD ============ */}
      <main className="px-4 mt-5 space-y-5">
        <section className="p-hero-card p-5 sm:p-6 p-rise-1 relative">
          <MeshCorner position="tr" size={140} color="#0FB5A9" opacity={0.08} />

          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <div className="p-eyebrow mb-1">Section B · Patient</div>
              <h2 className="p-h2 text-base sm:text-lg">Patient Information</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--p-ink-500)' }}>
                Demographic and contact details for this encounter.
              </p>
            </div>
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--p-insurance-soft)', color: '#0A8F87' }}>
              <User className="w-4 h-4" />
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <PremiumField label="Patient Full Name" required>
              <PremiumInput value={patient.name} onChange={(e) => setP('name', e.target.value)} />
            </PremiumField>

            <PremiumField label="Gender" required>
              <div className="grid grid-cols-2 gap-2">
                {['Male', 'Female'].map((g) => (
                  <button key={g} type="button" onClick={() => setP('gender', g)}
                    className={cn('h-12 rounded-xl text-sm font-semibold transition-all', patient.gender === g ? 'shadow-md' : '')}
                    style={patient.gender === g
                      ? { background: 'var(--p-brand-deep)', color: 'white', border: '1px solid rgba(255,255,255,0.04)', boxShadow: 'var(--p-shadow-medium)' }
                      : { background: 'var(--p-surface)', color: 'var(--p-ink-600)', border: '1px solid var(--p-border-strong)' }}>
                    {g}
                  </button>
                ))}
              </div>
            </PremiumField>

            <div className="grid grid-cols-2 gap-3">
              <PremiumField label="DOB">
                <PremiumInput type="date" value={patient.dob} onChange={(e) => setP('dob', e.target.value)} />
              </PremiumField>
              <PremiumField label="Nationality">
                <PremiumSelect value={patient.nationality} onChange={(e) => setP('nationality', e.target.value)}>
                  <option value="">—</option>
                  {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                </PremiumSelect>
              </PremiumField>
            </div>

            <PremiumField label="Hotel / Accommodation">
              <PremiumSelect value={patient.hotel} onChange={(e) => setP('hotel', e.target.value)}>
                <option value="">Select hotel…</option>
                {HOTELS.map((h) => <option key={h} value={h}>{h}</option>)}
              </PremiumSelect>
            </PremiumField>

            <div className="grid grid-cols-2 gap-3">
              <PremiumField label="Room">
                <PremiumInput value={patient.room} onChange={(e) => setP('room', e.target.value)} placeholder="e.g. 214" />
              </PremiumField>
              <PremiumField label="Postal Code">
                <PremiumInput placeholder="optional" />
              </PremiumField>
            </div>

            <PremiumField label="Phone Number">
              <PremiumInput prefix={<Phone className="w-3.5 h-3.5" />} value={patient.phone} onChange={(e) => setP('phone', e.target.value)} />
            </PremiumField>

            <PremiumField label="Email Address">
              <PremiumInput prefix={<Mail className="w-3.5 h-3.5" />} type="email" value={patient.email} onChange={(e) => setP('email', e.target.value)} />
            </PremiumField>

            <PremiumField label="Passport">
              <PremiumInput prefix={<IdCard className="w-3.5 h-3.5" />} value={patient.passport} onChange={(e) => setP('passport', e.target.value)} />
            </PremiumField>

            <div className="grid grid-cols-2 gap-3">
              <PremiumField label="Arrival to Egypt">
                <PremiumInput type="date" value={patient.arrivalDate} onChange={(e) => setP('arrivalDate', e.target.value)} />
              </PremiumField>
              <PremiumField label="Departure">
                <PremiumInput type="date" value={patient.departureDate} onChange={(e) => setP('departureDate', e.target.value)} />
              </PremiumField>
            </div>

            <div className="rounded-xl p-3.5 flex items-start gap-2.5" style={{ background: 'var(--p-insurance-soft)', border: '1px solid rgba(15,181,169,0.20)' }}>
              <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#0A8F87' }} />
              <div className="text-[12px] leading-relaxed" style={{ color: '#0A6E64' }}>
                Visual validation only — the system checks that <b>arrival date</b> isn't later than visit date and warns you if so. No backend validation runs in this preview.
              </div>
            </div>
          </div>
        </section>

        {/* Glimpse of next section */}
        <section className="p-card p-4 sm:p-5 p-rise-2">
          <SectionLabel
            eyebrow="Coming up next"
            title="Section C · Route"
            description="Direct visit, transfer to another branch, or received transfer."
          />
          <div className="flex items-center justify-between rounded-xl px-3.5 py-3" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--p-brand-pale)', color: 'var(--p-brand-mid)' }}>
                <Building2 className="w-4 h-4" />
              </span>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-900)' }}>Direct Visit</div>
                <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>Default — patient assessed at this branch.</div>
              </div>
            </div>
            <StatusPill tone="navy">Default</StatusPill>
          </div>
        </section>
      </main>

      {/* ============ STICKY BOTTOM CTA ============ */}
      <div className="fixed bottom-0 inset-x-0 z-30 px-4 pb-4 pt-3 safe-bottom" style={{
        background: 'linear-gradient(180deg, rgba(246, 248, 251, 0) 0%, rgba(246, 248, 251, 0.95) 50%)',
      }}>
        <div className="rounded-2xl p-2.5 flex items-center gap-2" style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          border: '1px solid rgba(15, 27, 56, 0.08)',
          boxShadow: '0 -8px 30px rgba(10, 27, 61, 0.10), 0 4px 12px rgba(10, 27, 61, 0.04)',
        }}>
          <button className="p-btn-ghost h-12 px-4 text-sm flex items-center gap-2 shrink-0">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <PremiumButton fullWidth size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Continue to Route
          </PremiumButton>
        </div>
      </div>
    </div>
  )
}
