import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { GuestRoute } from '@/routes/GuestRoute'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { AboutPage } from '@/pages/public/AboutPage'
import { ContactPage } from '@/pages/public/ContactPage'
import { HomePage } from '@/pages/public/HomePage'
import { PrivacyPage } from '@/pages/public/PrivacyPage'
import { ReportSuccessPage } from '@/pages/public/ReportSuccessPage'
import { SubmitReportPage } from '@/pages/public/SubmitReportPage'
import { TermsPage } from '@/pages/public/TermsPage'
import { TrackReportPage } from '@/pages/public/TrackReportPage'
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminDepartmentsPage } from '@/pages/admin/AdminDepartmentsPage'
import { AdminFacebookPage } from '@/pages/admin/AdminFacebookPage'
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage'
import { AdminMapPage } from '@/pages/admin/AdminMapPage'
import { AdminReportDetailPage } from '@/pages/admin/AdminReportDetailPage'
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/submit" element={<SubmitReportPage />} />
          <Route path="/submit/success" element={<ReportSuccessPage />} />
          <Route path="/track" element={<TrackReportPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/admin/login" element={<AdminLoginPage />} />
          </Route>
        </Route>
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/reports/:ticketNumber" element={<AdminReportDetailPage />} />
          <Route path="/admin/map" element={<AdminMapPage />} />
          <Route path="/admin/facebook" element={<AdminFacebookPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/categories" element={<AdminCategoriesPage />} />
          <Route path="/admin/departments" element={<AdminDepartmentsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
