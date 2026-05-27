import { useState } from 'react'
import { Printer, FileDown, X, AlertTriangle, FlaskConical } from 'lucide-react'
import { PremiumButton, StatusPill } from './primitives'

/**
 * PrintExportActions — pair of action buttons shown on every Admin report / cases / detail page.
 * Pressing Print Preview opens the modal; Export PDF triggers window.print() (browser PDF).
 */
export function PrintExportActions({ onOpenPreview, label = 'this view' }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onOpenPreview} className="p-btn-ghost h-10 px-4 text-sm inline-flex items-center gap-1.5">
        <Printer className="w-4 h-4" /> Print Preview
      </button>
      <PremiumButton size="md" leftIcon={<FileDown className="w-4 h-4" />} onClick={() => window.print()}>
        Export PDF
      </PremiumButton>
    </div>
  )
}

/**
 * PrintPreviewModal — full-screen preview shell that demonstrates how the printed page would render.
 * Uses a clean white card with branded header and footer.
 */
export function PrintPreviewModal({ open, onClose, title, subtitle, children }) {
  if (!open) return null
  return (
    <div className="theme-premium fixed inset-0 z-50 p-fade-in flex items-stretch sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0" style={{ background: 'rgba(10, 27, 61, 0.55)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-white rounded-none sm:rounded-2xl shadow-2xl flex flex-col max-h-screen sm:max-h-[92vh]" style={{ animation: 'p-rise 320ms cubic-bezier(0.16,1,0.3,1) both' }}>
        {/* Toolbar */}
        <div className="px-5 py-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--p-border)', background: 'var(--p-surface-tint)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'var(--p-brand-pale)', color: 'var(--p-brand-mid)' }}>
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--p-ink-500)' }}>Print Preview</div>
              <div className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{title}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone="amber" dot>Demo Print — frontend only</StatusPill>
            <PremiumButton size="sm" leftIcon={<FileDown className="w-3.5 h-3.5" />} onClick={() => window.print()}>
              Print / Save as PDF
            </PremiumButton>
            <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--p-surface-tint)]" style={{ color: 'var(--p-ink-500)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document page */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8" style={{ background: 'var(--p-surface-deep)' }}>
          <article className="mx-auto bg-white shadow-lg max-w-3xl px-6 sm:px-10 py-8 sm:py-12 rounded-md" style={{ minHeight: '600px' }}>
            <header className="pb-4 mb-6 border-b" style={{ borderColor: 'var(--p-border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: 'var(--p-teal)' }}>HMC / SMC Clinic Portal · Aegis</div>
                  <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--p-ink-900)' }}>{title}</h1>
                  {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--p-ink-500)' }}>{subtitle}</p>}
                </div>
                <div className="text-end text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
                  Generated 27 May 2026<br />
                  By Demo Administrator<br />
                  <span style={{ color: 'var(--p-mixed)', fontWeight: 600 }}>DEMO PREVIEW</span>
                </div>
              </div>
            </header>
            <div>{children}</div>
            <footer className="pt-4 mt-8 border-t text-[10px] flex items-center justify-between" style={{ borderColor: 'var(--p-border)', color: 'var(--p-ink-400)' }}>
              <span>HMC / SMC Clinic Portal · Aegis · Internal use only</span>
              <span>Demo print · No real patient data</span>
            </footer>
          </article>
        </div>

        <div className="px-5 py-3 border-t flex items-center gap-2 text-[11px] shrink-0" style={{ borderColor: 'var(--p-border)', background: 'var(--p-pending-soft)', color: '#7A4F1F' }}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Frontend-only Print Preview. Export PDF uses the browser's native Print-to-PDF dialog. Real billing PDFs are produced by the protected Claude / Manager workflow — never inside the Portal.</span>
        </div>
      </div>
    </div>
  )
}

/** Convenience hook — returns [open, onOpenPreview, onClose] for any page. */
export function usePrintPreview() {
  const [open, setOpen] = useState(false)
  return { open, onOpenPreview: () => setOpen(true), onClose: () => setOpen(false) }
}
