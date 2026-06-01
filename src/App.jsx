import { useEffect } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'

// GitHub Pages doesn't support client-side routing of nested paths via BrowserRouter
// out of the box. Use HashRouter when DEPLOY_BASE is configured for Pages.
const Router = import.meta.env.BASE_URL !== '/' ? HashRouter : BrowserRouter
import { ToastProvider } from './components/ui/Toast'
import { UserModeProvider, useUserMode } from './context/UserModeContext'
import { DemoStateProvider } from './context/DemoStateContext'
import { IS_SUPABASE } from './lib/api/config'

import NotFound from './pages/NotFound'

// Operational UI (the live Aegis Portal). Served at clean top-level routes
// (/login, /admin-*, /clinic/*, /reception/*). The previous /design-preview/*
// prefix is kept ONLY as a backward-compatible redirect for old bookmarks.
import './premium/theme.css'
import { RequireRole, RequireReceptionBranch } from './premium/guards'
import PreviewIndex from './pages/preview/PreviewIndex'
import PremiumLogin from './pages/preview/PremiumLogin'
import SetPassword from './pages/preview/SetPassword'
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
import PremiumAdminAttendance from './pages/preview/PremiumAdminAttendance'
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

/**
 * Dev / mock-only tools (review tools, demo-role previews, P2A design-reference
 * pages). These are NOT part of the live pilot product. In Supabase (pilot)
 * mode the guard redirects them to login so real users never land on a mock
 * surface. In mock mode (npm run dev) they remain available for owner UAT.
 */
function RequireDevTools() {
  if (IS_SUPABASE) return <Navigate to="/login" replace />
  return <Outlet />
}

/**
 * Backward-compatible redirect: any legacy /design-preview/* URL (old bookmark
 * or a still-open pilot tab) is rewritten to the clean path by stripping the
 * prefix — e.g. /design-preview/admin-dashboard → /admin-dashboard.
 */
function LegacyDesignPreviewRedirect() {
  const { pathname, search, hash } = useLocation()
  const stripped = pathname.replace(/^\/design-preview/, '') || '/'
  return <Navigate to={`${stripped}${search}${hash}`} replace />
}

/** When a Supabase password-recovery session starts (email-link click), force
 *  the user onto the set-password screen instead of letting the temporary
 *  recovery session resolve to a normal dashboard. */
function RecoveryWatcher() {
  const { recoveryMode } = useUserMode()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useEffect(() => {
    if (recoveryMode && pathname !== '/set-password') navigate('/set-password', { replace: true })
  }, [recoveryMode, pathname, navigate])
  return null
}

export default function App() {
  return (
    <UserModeProvider>
      <DemoStateProvider>
      <ToastProvider>
        <Router>
          <RecoveryWatcher />
          <Routes>
            {/* Application entry → Login. */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<PremiumLogin />} />

            {/* Public: first-login / forgot password (set your own password). */}
            <Route path="/set-password" element={<SetPassword />} />

            {/* Back-compat: rewrite any legacy /design-preview/* link to the clean path. */}
            <Route path="/design-preview/*" element={<LegacyDesignPreviewRedirect />} />
            <Route path="/design-preview"   element={<LegacyDesignPreviewRedirect />} />

            {/* Legacy P1 tree (/clinic, /admin) is ARCHIVED — there is one operational UI. */}
            <Route path="/clinic"  element={<Navigate to="/login" replace />} />
            <Route path="/admin"   element={<Navigate to="/login" replace />} />

            {/* ---- Dev / mock-only tools (disabled in Supabase pilot mode) ---- */}
            <Route element={<RequireDevTools />}>
              <Route path="/dev"             element={<PreviewIndex />} />
              <Route path="/review-tools"    element={<PremiumReviewTools />} />
              <Route path="/demo-roles"      element={<DemoRolePreview />} />
              {/* P2A standalone visual previews (design reference only) */}
              <Route path="/clinic-dashboard" element={<PremiumClinicDashboard />} />
              <Route path="/new-case"         element={<PremiumAddNewCase />} />
            </Route>

            {/* ---- Admin-only workspaces ---- */}
            <Route element={<RequireRole allow={['admin']} />}>
              <Route path="/admin-dashboard"            element={<PremiumAdminDashboard />} />
              <Route path="/admin-control-center"       element={IS_SUPABASE ? <Navigate to="/admin-dashboard" replace /> : <PremiumAdminControlCenter />} />
              <Route path="/admin/new-case"             element={IS_SUPABASE ? <Navigate to="/admin-dashboard" replace /> : <PremiumAdminNewCase />} />
              <Route path="/admin/repatriation"         element={IS_SUPABASE ? <Navigate to="/admin-dashboard" replace /> : <PremiumAdminRepatriation />} />
              <Route path="/admin/cases-master"         element={IS_SUPABASE ? <Navigate to="/admin/p2c-cases" replace /> : <PremiumAdminCasesMaster />} />
              <Route path="/admin/case-detail/:id"      element={<PremiumAdminCaseDetail />} />
              <Route path="/admin/collections"          element={<PremiumAdminCollections />} />
              <Route path="/admin/reports/daily"        element={<PremiumAdminDailyReport />} />
              <Route path="/admin/reports/monthly"      element={IS_SUPABASE ? <Navigate to="/admin-dashboard" replace /> : <PremiumAdminMonthlyReport />} />
              <Route path="/admin/legacy-review"        element={<PremiumAdminLegacyReview />} />
              <Route path="/admin/p2c-cases"            element={<PremiumAdminP2CCases />} />
              <Route path="/admin/reference-lists"      element={<PremiumAdminReferenceLists />} />
              <Route path="/admin/insurance-completion" element={<PremiumAdminInsuranceCompletion />} />
              <Route path="/admin/users-staff"          element={<PremiumAdminUsersStaff />} />
              <Route path="/admin/attendance"           element={<PremiumAdminAttendance />} />
            </Route>

            {/* ---- Clinic workspaces (external clinic nurse; admin may view) ---- */}
            <Route element={<RequireRole allow={['clinic_nurse', 'admin']} />}>
              <Route path="/clinic/dashboard"     element={<ClinicDashboardP2C />} />
              <Route path="/clinic/new-case"      element={<ClinicNewCaseP2C />} />
              <Route path="/clinic/cases"         element={<ClinicMyCasesP2C />} />
              <Route path="/clinic/cases/:caseId" element={<ClinicCaseDetailP2C />} />
              <Route path="/clinic/transfers"     element={<ClinicTransfersP2C />} />
              <Route path="/clinic/daily-report"  element={<ClinicDailyReportP2C />} />
              <Route path="/clinic/treasury"      element={<ClinicTreasuryP2C />} />
              {/* P2C.R3: standalone Expenses removed from nav; legacy URL → Treasury. */}
              <Route path="/clinic/expenses"      element={<Navigate to="/clinic/treasury" replace />} />
              <Route path="/clinic/attendance"    element={<ClinicAttendanceP2C />} />
            </Route>

            {/* ---- Reception workspaces (branch-scoped; admin may view any) ---- */}
            <Route element={<RequireReceptionBranch />}>
              <Route path="/reception/:branchSlug/dashboard"                  element={<ReceptionDashboardP2C />} />
              <Route path="/reception/:branchSlug/rooms"                      element={<ReceptionDashboardP2C />} />
              <Route path="/reception/:branchSlug/new-case"                   element={<ReceptionNewCaseP2C />} />
              <Route path="/reception/:branchSlug/incoming-transfers"         element={<ReceptionIncomingTransfersP2C />} />
              <Route path="/reception/:branchSlug/incoming-transfers/:caseId" element={<ReceptionIncomingDetailP2C />} />
              <Route path="/reception/:branchSlug/cases"                      element={<ReceptionBranchCasesP2C />} />
              <Route path="/reception/:branchSlug/cases/:caseId"              element={<ReceptionCaseDetailP2C />} />
              <Route path="/reception/:branchSlug/collections"                element={<ReceptionCollectionsP2C />} />
              <Route path="/reception/:branchSlug/treasury"                   element={<ReceptionTreasuryP2C />} />
              <Route path="/reception/:branchSlug/daily-report"               element={<ReceptionDailyReportP2C />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </ToastProvider>
      </DemoStateProvider>
    </UserModeProvider>
  )
}
