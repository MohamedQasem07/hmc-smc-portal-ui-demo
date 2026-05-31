import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'

// GitHub Pages doesn't support client-side routing of nested paths via BrowserRouter
// out of the box. Use HashRouter when DEPLOY_BASE is configured for Pages.
const Router = import.meta.env.BASE_URL !== '/' ? HashRouter : BrowserRouter
import { ToastProvider } from './components/ui/Toast'
import { UserModeProvider } from './context/UserModeContext'
import { DemoStateProvider } from './context/DemoStateContext'

import NotFound from './pages/NotFound'

// Premium operational UI (the approved Aegis Portal) — mounted under
// /design-preview/* for historical reasons; this IS the live UI.
import './premium/theme.css'
import { RequireRole, RequireReceptionBranch } from './premium/guards'
import PreviewIndex from './pages/preview/PreviewIndex'
import PremiumLogin from './pages/preview/PremiumLogin'
import PremiumClinicDashboard from './pages/preview/PremiumClinicDashboard'
import PremiumAddNewCase from './pages/preview/PremiumAddNewCase'
import PremiumAdminDashboard from './pages/preview/PremiumAdminDashboard'
import PremiumAdminControlCenter from './pages/preview/PremiumAdminControlCenter'
import PremiumAdminNewCase from './pages/preview/PremiumAdminNewCase'
import PremiumAdminRepatriation from './pages/preview/PremiumAdminRepatriation'
import PremiumAdminCasesMaster from './pages/preview/PremiumAdminCasesMaster'
import PremiumAdminCaseDetail from './pages/preview/PremiumAdminCaseDetail'
import PremiumAdminCollections from './pages/preview/PremiumAdminCollections'
import PremiumAdminDailyReport from './pages/preview/PremiumAdminDailyReport'
import PremiumAdminMonthlyReport from './pages/preview/PremiumAdminMonthlyReport'
import PremiumAdminLegacyReview from './pages/preview/PremiumAdminLegacyReview'
import PremiumAdminP2CCases from './pages/preview/PremiumAdminP2CCases'
import PremiumAdminReferenceLists from './pages/preview/PremiumAdminReferenceLists'
import PremiumAdminInsuranceCompletion from './pages/preview/PremiumAdminInsuranceCompletion'
import PremiumAdminUsersStaff from './pages/preview/PremiumAdminUsersStaff'
import PremiumReviewTools from './pages/preview/PremiumReviewTools'

// PORTAL-UX-P2C — Clinic & Reception workflows
import DemoRolePreview from './pages/preview/p2c/DemoRolePreview'
import ClinicDashboardP2C from './pages/preview/p2c/clinic/ClinicDashboardP2C'
import ClinicNewCaseP2C from './pages/preview/p2c/clinic/ClinicNewCaseP2C'
import ClinicMyCasesP2C from './pages/preview/p2c/clinic/ClinicMyCasesP2C'
import ClinicTransfersP2C from './pages/preview/p2c/clinic/ClinicTransfersP2C'
import ClinicDailyReportP2C from './pages/preview/p2c/clinic/ClinicDailyReportP2C'
import ClinicCaseDetailP2C from './pages/preview/p2c/clinic/ClinicCaseDetailP2C'
import ClinicTreasuryP2C from './pages/preview/p2c/clinic/ClinicTreasuryP2C'
import ClinicAttendanceP2C from './pages/preview/p2c/clinic/ClinicAttendanceP2C'
import ReceptionDashboardP2C from './pages/preview/p2c/reception/ReceptionDashboardP2C'
import ReceptionNewCaseP2C from './pages/preview/p2c/reception/ReceptionNewCaseP2C'
import ReceptionIncomingTransfersP2C from './pages/preview/p2c/reception/ReceptionIncomingTransfersP2C'
import ReceptionBranchCasesP2C from './pages/preview/p2c/reception/ReceptionBranchCasesP2C'
import ReceptionCollectionsP2C from './pages/preview/p2c/reception/ReceptionCollectionsP2C'
import ReceptionTreasuryP2C from './pages/preview/p2c/reception/ReceptionTreasuryP2C'
import ReceptionDailyReportP2C from './pages/preview/p2c/reception/ReceptionDailyReportP2C'
import ReceptionIncomingDetailP2C from './pages/preview/p2c/reception/ReceptionIncomingDetailP2C'
import ReceptionCaseDetailP2C from './pages/preview/p2c/reception/ReceptionCaseDetailP2C'

export default function App() {
  return (
    <UserModeProvider>
      <DemoStateProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Application entry → premium Login. */}
            <Route path="/" element={<Navigate to="/design-preview/login" replace />} />

            {/* Legacy P1 tree (AppShell + /clinic + /admin) is ARCHIVED — the
                page files still exist for reference, but every legacy URL now
                redirects into the premium portal so there is one operational UI. */}
            <Route path="/login"     element={<Navigate to="/design-preview/login" replace />} />
            <Route path="/clinic/*"  element={<Navigate to="/design-preview/login" replace />} />
            <Route path="/admin/*"   element={<Navigate to="/design-preview/login" replace />} />

            {/* ---- Public premium (entry + dev/UAT tools) ---- */}
            <Route path="/design-preview"               element={<PreviewIndex />} />
            <Route path="/design-preview/login"         element={<PremiumLogin />} />
            <Route path="/design-preview/review-tools"  element={<PremiumReviewTools />} />
            <Route path="/design-preview/demo-roles"    element={<DemoRolePreview />} />
            {/* P2A standalone visual previews (design reference only) */}
            <Route path="/design-preview/clinic-dashboard" element={<PremiumClinicDashboard />} />
            <Route path="/design-preview/new-case"         element={<PremiumAddNewCase />} />

            {/* ---- Admin-only workspaces ---- */}
            <Route element={<RequireRole allow={['admin']} />}>
              <Route path="/design-preview/admin-dashboard"            element={<PremiumAdminDashboard />} />
              <Route path="/design-preview/admin-control-center"       element={<PremiumAdminControlCenter />} />
              <Route path="/design-preview/admin/new-case"             element={<PremiumAdminNewCase />} />
              <Route path="/design-preview/admin/repatriation"         element={<PremiumAdminRepatriation />} />
              <Route path="/design-preview/admin/cases-master"         element={<PremiumAdminCasesMaster />} />
              <Route path="/design-preview/admin/case-detail/:id"      element={<PremiumAdminCaseDetail />} />
              <Route path="/design-preview/admin/collections"          element={<PremiumAdminCollections />} />
              <Route path="/design-preview/admin/reports/daily"        element={<PremiumAdminDailyReport />} />
              <Route path="/design-preview/admin/reports/monthly"      element={<PremiumAdminMonthlyReport />} />
              <Route path="/design-preview/admin/legacy-review"        element={<PremiumAdminLegacyReview />} />
              <Route path="/design-preview/admin/p2c-cases"            element={<PremiumAdminP2CCases />} />
              <Route path="/design-preview/admin/reference-lists"      element={<PremiumAdminReferenceLists />} />
              <Route path="/design-preview/admin/insurance-completion" element={<PremiumAdminInsuranceCompletion />} />
              <Route path="/design-preview/admin/users-staff"          element={<PremiumAdminUsersStaff />} />
            </Route>

            {/* ---- Clinic workspaces (external clinic nurse; admin may view) ---- */}
            <Route element={<RequireRole allow={['clinic_nurse', 'admin']} />}>
              <Route path="/design-preview/clinic/dashboard"     element={<ClinicDashboardP2C />} />
              <Route path="/design-preview/clinic/new-case"      element={<ClinicNewCaseP2C />} />
              <Route path="/design-preview/clinic/cases"         element={<ClinicMyCasesP2C />} />
              <Route path="/design-preview/clinic/cases/:caseId" element={<ClinicCaseDetailP2C />} />
              <Route path="/design-preview/clinic/transfers"     element={<ClinicTransfersP2C />} />
              <Route path="/design-preview/clinic/daily-report"  element={<ClinicDailyReportP2C />} />
              <Route path="/design-preview/clinic/treasury"      element={<ClinicTreasuryP2C />} />
              {/* P2C.R3: standalone Expenses removed from nav; legacy URL → Treasury. */}
              <Route path="/design-preview/clinic/expenses"      element={<Navigate to="/design-preview/clinic/treasury" replace />} />
              <Route path="/design-preview/clinic/attendance"    element={<ClinicAttendanceP2C />} />
            </Route>

            {/* ---- Reception workspaces (branch-scoped; admin may view any) ---- */}
            <Route element={<RequireReceptionBranch />}>
              <Route path="/design-preview/reception/:branchSlug/dashboard"                  element={<ReceptionDashboardP2C />} />
              <Route path="/design-preview/reception/:branchSlug/rooms"                      element={<ReceptionDashboardP2C />} />
              <Route path="/design-preview/reception/:branchSlug/new-case"                   element={<ReceptionNewCaseP2C />} />
              <Route path="/design-preview/reception/:branchSlug/incoming-transfers"         element={<ReceptionIncomingTransfersP2C />} />
              <Route path="/design-preview/reception/:branchSlug/incoming-transfers/:caseId" element={<ReceptionIncomingDetailP2C />} />
              <Route path="/design-preview/reception/:branchSlug/cases"                      element={<ReceptionBranchCasesP2C />} />
              <Route path="/design-preview/reception/:branchSlug/cases/:caseId"              element={<ReceptionCaseDetailP2C />} />
              <Route path="/design-preview/reception/:branchSlug/collections"                element={<ReceptionCollectionsP2C />} />
              <Route path="/design-preview/reception/:branchSlug/treasury"                   element={<ReceptionTreasuryP2C />} />
              <Route path="/design-preview/reception/:branchSlug/daily-report"               element={<ReceptionDailyReportP2C />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </ToastProvider>
      </DemoStateProvider>
    </UserModeProvider>
  )
}
