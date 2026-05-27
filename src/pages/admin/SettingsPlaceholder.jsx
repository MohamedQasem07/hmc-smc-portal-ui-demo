import { PageHeader, PageBody } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Settings, ChevronRight, Users, Building2, FileBadge2, KeyRound, Bell } from 'lucide-react'

/**
 * SettingsPlaceholder — visual concept only. No real settings are configurable here.
 */
export default function SettingsPlaceholder() {
  const groups = [
    { title: 'Branches & Users',       icon: Building2,  desc: 'Add or deactivate branches and clinic users. Manage permissions and login policy.' },
    { title: 'Insurance & Hotels',     icon: FileBadge2, desc: 'Curate the insurance / assistance / hotel lookup lists used throughout the Portal.' },
    { title: 'Status Vocabulary',      icon: Settings,   desc: 'Customize case-status and invoice-readiness labels and their colors.' },
    { title: 'Audit Log',              icon: Users,      desc: 'Review who changed what and when. Filter by user, branch, field, or time range.' },
    { title: 'Notifications',          icon: Bell,       desc: 'Choose when and where to send alerts for new transfers and pending-classification cases.' },
    { title: 'Authentication & Security', icon: KeyRound,desc: 'Password policy, session length, and security recovery options.' },
  ]
  return (
    <>
      <PageHeader title="Settings" description="Configuration concepts — visual only in this prototype." />
      <PageBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {groups.map((g) => (
            <Card key={g.title} className="cursor-not-allowed opacity-95 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
                  <g.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink-900">{g.title}</div>
                  <div className="text-xs text-ink-500 mt-0.5 leading-relaxed">{g.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-300 shrink-0" />
              </div>
            </Card>
          ))}
        </div>
        <div className="text-[11px] text-ink-400 text-center">
          Settings are presented as visual concepts. No persistent configuration is written by this prototype.
        </div>
      </PageBody>
    </>
  )
}
