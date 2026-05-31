import { Link } from 'react-router-dom'
import { ArrowRight, LogIn, Smartphone, FilePlus2, LayoutDashboard, FlaskConical, Settings, Sparkles } from 'lucide-react'
import { BrandWordmark } from '../../premium/BrandMark'
import { PremiumButton, MeshCorner, StatusPill } from '../../premium/primitives'

const PREVIEWS = [
  { to: '/login',                 icon: LogIn,           title: 'Premium Login',              kind: 'Desktop · P2A',        description: 'Branded entrance with coastal mesh backdrop, elegant glass card, demo entry chips, and refined trust messaging.' },
  { to: '/clinic-dashboard',      icon: Smartphone,      title: 'Premium Clinic Dashboard',   kind: 'Mobile · P2A',         description: 'Phone-first command surface — hero greeting band, prominent primary action, refined KPIs with trends, activity feed.' },
  { to: '/new-case',              icon: FilePlus2,       title: 'Premium Add New Case',       kind: 'Mobile · P2A',         description: 'Multi-step intake with floating stepper, premium inputs, sticky bottom CTA, and gentle helper messaging.' },
  { to: '/admin-dashboard',       icon: LayoutDashboard, title: 'Premium Admin Dashboard',    kind: 'Desktop · P2A',        description: 'Executive operations cockpit — dark sidebar, mesh hero, trend KPIs with sparklines, branch leaderboard, refined panels.' },
  { to: '/admin-control-center',  icon: Settings,        title: 'Admin Control Center',       kind: 'Desktop · P2B.1 · NEW', description: 'Master data governance workspace — 8 configuration modules, premium edit drawer, change history, protected system values panel.', accent: true },
]

export default function PreviewIndex() {
  return (
    <div className="theme-premium min-h-screen" style={{ background: 'var(--p-canvas)' }}>
      <header className="p-mesh p-grid-overlay relative overflow-hidden">
        <MeshCorner position="tr" size={280} color="#2DD4C7" opacity={0.28} />
        <MeshCorner position="bl" size={240} color="#1E4180" opacity={0.20} />

        <div className="relative z-10 px-6 lg:px-10 py-8 lg:py-12 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <BrandWordmark variant="light" />
            <Link to="/login" className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>
              ← Back to P1 (functional)
            </Link>
          </div>

          <div className="mt-9">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(15, 181, 169, 0.18)', border: '1px solid rgba(15, 181, 169, 0.32)' }}>
              <FlaskConical className="w-3.5 h-3.5" style={{ color: '#7FE7DE' }} />
              <span className="text-[11px] font-semibold tracking-[0.10em] uppercase" style={{ color: '#7FE7DE' }}>Sprint P2A · Premium Visual Direction Gate</span>
            </div>

            <h1 className="p-display p-display-light text-[36px] lg:text-[52px] mt-5 max-w-4xl">
              Aegis · approved direction.<br />
              <span style={{ color: '#7FE7DE' }}>Expanding into Admin governance.</span>
            </h1>
            <p className="mt-5 text-base lg:text-lg max-w-2xl" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Four flagship screens established the visual identity (P2A).
              The new Admin Control Center expands it (P2B.1) — master data governance for facilities, users, workflow lists, and reference data.
              All previews live under <code className="text-white/90 bg-white/10 px-1.5 py-0.5 rounded">/*</code>; P1 functional routes remain untouched.
            </p>
          </div>
        </div>
      </header>

      <main className="px-6 lg:px-10 py-10 max-w-6xl mx-auto -mt-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PREVIEWS.map((p, i) => (
            <Link key={p.to} to={p.to} className={`p-hero-card p-7 group p-rise-${(i % 4) + 1} relative overflow-hidden ${p.accent ? 'md:col-span-2' : ''}`} style={p.accent ? { background: 'linear-gradient(135deg, #FBF5EC 0%, #FFFFFF 60%, #E0F8F6 100%)', border: '1px solid rgba(217, 165, 116, 0.32)' } : {}}>
              <MeshCorner position="tr" size={p.accent ? 240 : 160} color={p.accent ? '#D9A574' : '#0FB5A9'} opacity={p.accent ? 0.12 : 0.08} />
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: p.accent ? 'linear-gradient(135deg, #1E4180 0%, #0A1B3D 100%)' : 'linear-gradient(135deg, #0FB5A9 0%, #0A8F87 100%)', color: 'white', boxShadow: p.accent ? '0 8px 24px rgba(10, 27, 61, 0.25)' : 'var(--p-shadow-glow)' }}>
                  <p.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="p-eyebrow">{p.kind}</div>
                    {p.accent && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.10em]" style={{ background: 'rgba(217, 165, 116, 0.18)', color: '#9A6E36', border: '1px solid rgba(217, 165, 116, 0.32)' }}><Sparkles className="w-2.5 h-2.5" /> New</span>}
                  </div>
                  <h2 className="p-h2 text-lg mt-1">{p.title}</h2>
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--p-ink-500)' }}>{p.description}</p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition-transform group-hover:translate-x-1" style={{ color: 'var(--p-teal)' }}>
                    Open preview <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-10 p-card p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="p-eyebrow">Approval Gate</div>
              <h2 className="p-h2 text-lg mt-1">Stop Condition</h2>
              <p className="text-sm mt-2 max-w-xl" style={{ color: 'var(--p-ink-500)' }}>
                After delivering these four preview screens, all further work pauses. No more screens are restyled across the Portal,
                and the existing Invoice Manager is untouched, until you confirm this visual direction.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusPill tone="navy">Mock data only</StatusPill>
              <StatusPill tone="teal">No backend</StatusPill>
              <StatusPill tone="amber">Manager protected</StatusPill>
            </div>
          </div>
        </section>

        <p className="text-center text-[11px] mt-10" style={{ color: 'var(--p-ink-400)' }}>
          P1 functional routes are preserved at <code className="px-1 py-0.5 rounded bg-[var(--p-surface-tint)]">/clinic/...</code> and <code className="px-1 py-0.5 rounded bg-[var(--p-surface-tint)]">/admin/...</code> · P0 baseline at <code className="px-1 py-0.5 rounded bg-[var(--p-surface-tint)]">portal-ux-prototype_P0_BASELINE/</code> · P1 baseline at <code className="px-1 py-0.5 rounded bg-[var(--p-surface-tint)]">portal-ux-prototype_P1_FUNCTIONAL_BASELINE/</code>
        </p>
      </main>
    </div>
  )
}
