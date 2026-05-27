import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'

// GitHub Pages doesn't support client-side routing of nested paths via BrowserRouter
// out of the box. Use HashRouter when DEPLOY_BASE is configured for Pages.
const Router = import.meta.env.BASE_URL !== '/' ? HashRouter : BrowserRouter
import { ToastProvider } from './components/ui/Toast'
import { UserModeProvider } from './context/UserModeContext'
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

export default function App() {
  return (
    <UserModeProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public demo lands directly on the Premium Admin Dashboard. */}
            <Route path="/" element={<Navigate to="/design-preview/admin-dashboard" replace />} />
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

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </ToastProvider>
    </UserModeProvider>
  )
}
