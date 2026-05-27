import { FlaskConical } from 'lucide-react'

/**
 * DemoBanner — small, persistent visual reminder this is a UI/UX prototype with mock data.
 * Mounted once at the app root.
 */
export function DemoBanner() {
  return (
    <div className="bg-amber-50 text-amber-900 border-b border-amber-200 px-3 py-1.5 text-[11px] sm:text-xs flex items-center justify-center gap-2 z-30">
      <FlaskConical className="w-3.5 h-3.5 shrink-0" />
      <span className="font-medium">UI / UX Prototype — Demo Data Only</span>
      <span className="hidden sm:inline text-amber-700/80">·  No backend, no real patient data, no production connection</span>
    </div>
  )
}
