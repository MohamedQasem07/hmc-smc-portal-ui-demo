import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'

// GitHub Pages doesn't support client-side routing of nested paths via BrowserRouter
// out of the box. Use HashRouter when DEPLOY_BASE is configured for Pages.
const Router = import.meta.env.BASE_URL !== '/' ? HashRouter : BrowserRouter
import { ToastProvider } from './components/ui/Toast'
import { UserModeProvider } from './context/UserModeContext'
import { DemoStateProvider } from './context/DemoStateContext'
import { AppShell } from './components/layout/AppShell'

import Login from './pages/Login'
import NotFound from './pages/NotFound'

import ClinicDashboard from './pages/clinic/ClinicDashboard'
import AddNewCase from './pages/clinic/AddNewCase'
import IncomingTransfers from './pages/clinic/IncomingTransfers'
import MyRecentCases from './pages/clinic/MyRecentCases'
import ClinicCaseDetail from './pages/clinic/ClinicCaseDetail'
import ClinicDailyReport from './pages/clinic/ClinicDailyReport'

import AdminDashboard from './pages/admin/AdminDashboard'
import CasesMasterView from './pages/admin/CasesMasterView'
import AdminCaseDetail from './pages/admin/AdminCaseDetail'
import DailyReport from './pages/admin/DailyReport'
import BranchReport from './pages/admin/BranchReport'
import InvoiceManagerPlaceholder from './pages/admin/InvoiceManagerPlaceholder'
import SettingsPlaceholder from './pages/admin/SettingsPlaceholder'

// P2A — Premium visual direction preview (isolated under /design-preview/*)
import './premium/theme.css'
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
// P2C.R4 — Admin Users & Staff + Local Review Tools
import PremiumAdminUsersStaff from './pages/preview/PremiumAdminUsersStaff'
import PremiumReviewTools from './pages/preview/PremiumReviewTools'

// PORTAL-UX-P2C — Clinic & Reception workflows (mock-only, no backend)
import DemoRolePreview from './pages/preview/p2c/DemoRolePreview'
import ClinicDashboardP2C from './pages/preview/p2c/clinic/ClinicDashboardP2C'
import ClinicNewCaseP2C from './pages/preview/p2c/clinic/ClinicNewCaseP2C'
import ClinicMyCasesP2C from './pages/preview/p2c/clinic/ClinicMyCasesP2C'
import ClinicTransfersP2C from './pages/preview/p2c/clinic/ClinicTransfersP2C'
import ClinicDailyReportP2C from './pages/preview/p2c/clinic/ClinicDailyReportP2C'
import ClinicCaseDetailP2C from './pages/preview/p2c/clinic/ClinicCaseDetailP2C'
// PORTAL-UX-P2C.R1 — Real Operations Workspace screens
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
            {/* P2C.R4 — Application entry now lands on the Login screen. */}
            <Route path="/" element={<Navigate to="/design-preview/login" replace />} />
            <Route path="/login" element={<Login />} />

            <Route element={<AppShell />}>
              {/* Clinic */}
              <Route path="/clinic/dashboard"    element={<ClinicDashboard />} />
              <Route path="/clinic/new-case"     element={<AddNewCase />} />
              <Route path="/clinic/transfers"    element={<IncomingTransfers />} />
              <Route path="/clinic/cases"        element={<MyRecentCases />} />
              <Route path="/clinic/cases/:id"    element={<ClinicCaseDetail />} />
              <Route path="/clinic/daily-report" element={<ClinicDailyReport />} />

              {/* Admin */}
              <Route path="/admin/dashboard"        element={<AdminDashboard />} />
              <Route path="/admin/cases"            element={<CasesMasterView />} />
              <Route path="/admin/cases/:id"        element={<AdminCaseDetail />} />
              <Route path="/admin/daily-report"     element={<DailyReport />} />
              <Route path="/admin/branches/:id"     element={<BranchReport />} />
              <Route path="/admin/invoice-manager"  element={<InvoiceManagerPlaceholder />} />
              <Route path="/admin/settings"         element={<SettingsPlaceholder />} />
            </Route>

            {/* P2A — premium visual preview (isolated, no shell) */}
            <Route path="/design-preview"                   element={<PreviewIndex />} />
            <Route path="/design-preview/login"             element={<PremiumLogin />} />
            <Route path="/design-preview/clinic-dashboard"  element={<PremiumClinicDashboard />} />
            <Route path="/design-preview/new-case"          element={<PremiumAddNewCase />} />
            <Route path="/design-preview/admin-dashboard"        element={<PremiumAdminDashboard />} />
            <Route path="/design-preview/admin-control-center"   element={<PremiumAdminControlCenter />} />
            <Route path="/design-preview/admin/new-case"            element={<PremiumAdminNewCase />} />
            <Route path="/design-preview/admin/repatriation"        element={<PremiumAdminRepatriation />} />
            <Route path="/design-preview/admin/cases-master"        element={<PremiumAdminCasesMaster />} />
            <Route path="/design-preview/admin/case-detail/:id"     element={<PremiumAdminCaseDetail />} />
            <Route path="/design-preview/admin/collections"         element={<PremiumAdminCollections />} />
            <Route path="/design-preview/admin/reports/daily"       element={<PremiumAdminDailyReport />} />
            <Route path="/design-preview/admin/reports/monthly"     element={<PremiumAdminMonthlyReport />} />
            <Route path="/design-preview/admin/legacy-review"       element={<PremiumAdminLegacyReview />} />
            <Route path="/design-preview/admin/p2c-cases"           element={<PremiumAdminP2CCases />} />
            <Route path="/design-preview/admin/reference-lists"     element={<PremiumAdminReferenceLists />} />
            <Route path="/design-preview/admin/insurance-completion" element={<PremiumAdminInsuranceCompletion />} />
            {/* P2C.R4 — Admin Users & Staff Management */}
            <Route path="/design-preview/admin/users-staff"         element={<PremiumAdminUsersStaff />} />
            {/* P2C.R4 — Local Review Tools (UAT loader + persona quick-entry) */}
            <Route path="/design-preview/review-tools"              element={<PremiumReviewTools />} />

            {/* PORTAL-UX-P2C — Clinic / Reception workflows */}
            <Route path="/design-preview/demo-roles"                          element={<DemoRolePreview />} />
            <Route path="/design-preview/clinic/dashboard"                    element={<ClinicDashboardP2C />} />
            <Route path="/design-preview/clinic/new-case"                     element={<ClinicNewCaseP2C />} />
            <Route path="/design-preview/clinic/cases"                        element={<ClinicMyCasesP2C />} />
            <Route path="/design-preview/clinic/cases/:caseId"                element={<ClinicCaseDetailP2C />} />
            <Route path="/design-preview/clinic/transfers"                    element={<ClinicTransfersP2C />} />
            <Route path="/design-preview/clinic/daily-report"                 element={<ClinicDailyReportP2C />} />
            {/* PORTAL-UX-P2C.R1 — Real Operations Workspace */}
            <Route path="/design-preview/clinic/treasury"                     element={<ClinicTreasuryP2C />} />
            {/* P2C.R3: standalone Expenses removed from nav; legacy URL redirects to Treasury. */}
            <Route path="/design-preview/clinic/expenses"                     element={<Navigate to="/design-preview/clinic/treasury" replace />} />
            <Route path="/design-preview/clinic/attendance"                   element={<ClinicAttendanceP2C />} />
            <Route path="/design-preview/reception/:branchSlug/dashboard"             element={<ReceptionDashboardP2C />} />
            <Route path="/design-preview/reception/:branchSlug/rooms"                element={<ReceptionDashboardP2C />} />
            <Route path="/design-preview/reception/:branchSlug/new-case"             element={<ReceptionNewCaseP2C />} />
            <Route path="/design-preview/reception/:branchSlug/incoming-transfers"   element={<ReceptionIncomingTransfersP2C />} />
            <Route path="/design-preview/reception/:branchSlug/incoming-transfers/:caseId" element={<ReceptionIncomingDetailP2C />} />
            <Route path="/design-preview/reception/:branchSlug/cases"                element={<ReceptionBranchCasesP2C />} />
            <Route path="/design-preview/reception/:branchSlug/cases/:caseId"         element={<ReceptionCaseDetailP2C />} />
            <Route path="/design-preview/reception/:branchSlug/collections"          element={<ReceptionCollectionsP2C />} />
            <Route path="/design-preview/reception/:branchSlug/treasury"             element={<ReceptionTreasuryP2C />} />
            <Route path="/design-preview/reception/:branchSlug/daily-report"         element={<ReceptionDailyReportP2C />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </ToastProvider>
      </DemoStateProvider>
    </UserModeProvider>
  )
}
