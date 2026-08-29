import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import '@/mocks/persist'
import { ProtectedRoute, MerchantProtectedRoute } from '@/features/auth/protected-route'
import LoginPage from '@/features/auth/login-page'
import ForgotPasswordPage from '@/features/auth/forgot-password-page'
import MerchantLoginPage from '@/features/merchant/merchant-login-page'
import { AppShell } from '@/components/layout/app-shell'
import { MerchantShell } from '@/components/layout/merchant-shell'
import { ErrorBoundary } from '@/components/error-boundary'
import { PrefsApplier } from '@/components/prefs-applier'

// ── Merchant Portal ─────────────────────────────────────────────────────────
const MerchantDashboardPage        = lazy(() => import('@/features/merchant/merchant-dashboard-page'))
const MerchantProfilePage          = lazy(() => import('@/features/merchant/merchant-profile-page'))
const MerchantProductsPage         = lazy(() => import('@/features/merchant/merchant-products-page'))
const MerchantStockLevelsPage      = lazy(() => import('@/features/merchant/merchant-inventory-page').then(m => ({ default: m.MerchantStockLevelsPage })))
const MerchantStockRequestsPage    = lazy(() => import('@/features/merchant/merchant-inventory-page').then(m => ({ default: m.MerchantStockRequestsPage })))
const MerchantStorageUsagePage     = lazy(() => import('@/features/merchant/merchant-inventory-page').then(m => ({ default: m.MerchantStorageUsagePage })))
const MerchantOrdersPage           = lazy(() => import('@/features/merchant/merchant-orders-page'))
const MerchantReturnsPage          = lazy(() => import('@/features/merchant/merchant-returns-page'))
const MerchantWalletPage           = lazy(() => import('@/features/merchant/merchant-wallet-page'))
const MerchantWithdrawalsPage      = lazy(() => import('@/features/merchant/merchant-wallet-page').then(m => ({ default: m.MerchantWithdrawalsPage })))
const MerchantInvoicesPage         = lazy(() => import('@/features/merchant/merchant-wallet-page').then(m => ({ default: m.MerchantInvoicesPage })))
const MerchantSubscriptionsPage    = lazy(() => import('@/features/merchant/merchant-wallet-page').then(m => ({ default: m.MerchantSubscriptionsPage })))
const MerchantServicesPage         = lazy(() => import('@/features/merchant/merchant-services-page'))
const MerchantNotificationsPage     = lazy(() => import('@/features/merchant/merchant-notifications-page'))
const MerchantReportsPage          = lazy(() => import('@/features/merchant/merchant-reports-page'))
const MerchantSettingsPage         = lazy(() => import('@/features/merchant/merchant-settings-page'))
const MerchantRecordDetailPage     = lazy(() => import('@/features/merchant/merchant-record-detail-page'))


// ── Admin Portal ─────────────────────────────────────────────────────────────
const DashboardPage        = lazy(() => import('@/features/dashboard/dashboard-page'))
const AdminExtras          = lazy(() => import('@/features/dashboard/admin-extras').then(m => ({ default: m.AdminExtras })))
const MerchantsPage        = lazy(() => import('@/features/merchants/merchants-page'))
const OrdersPage           = lazy(() => import('@/features/orders/orders-page'))
const ReturnsPage          = lazy(() => import('@/features/returns/returns-page'))
const StockRequestsPage    = lazy(() => import('@/features/inventory/inventory-pages').then(m => ({ default: m.StockRequestsPage })))
const StockLevelsPage      = lazy(() => import('@/features/inventory/inventory-pages').then(m => ({ default: m.StockLevelsPage })))
const StorageUsagePage     = lazy(() => import('@/features/inventory/inventory-pages').then(m => ({ default: m.StorageUsagePage })))
const WithdrawalsPage      = lazy(() => import('@/features/finance/finance-pages').then(m => ({ default: m.WithdrawalsPage })))
const WalletsPage          = lazy(() => import('@/features/finance/finance-pages').then(m => ({ default: m.WalletsPage })))
const InvoicesPage         = lazy(() => import('@/features/finance/finance-pages').then(m => ({ default: m.InvoicesPage })))
const ServiceRequestsPage  = lazy(() => import('@/features/services/services-pages').then(m => ({ default: m.ServiceRequestsPage })))
const SubscriptionsPage    = lazy(() => import('@/features/services/services-pages').then(m => ({ default: m.SubscriptionsPage })))
const ServiceTypesPage     = lazy(() => import('@/features/services/services-pages').then(m => ({ default: m.ServiceTypesPage })))
const ApprovalsPage        = lazy(() => import('@/features/approvals/approvals-page'))
const PlatformProductsPage = lazy(() => import('@/features/products/platform-products-page'))
const ReportsPage          = lazy(() => import('@/features/reports/reports-page'))
const SettingsPage         = lazy(() => import('@/features/system/settings-page'))
const AuditLogsPage        = lazy(() => import('@/features/system/audit-logs-page'))
const NotificationsPage    = lazy(() => import('@/features/system/notifications-page'))
const ProfilePage          = lazy(() => import('@/features/profile/profile-page'))
const RecordDetailPage     = lazy(() => import('@/features/shared/record-detail-page'))

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-foreground" aria-label="جار التحميل" />
    </div>
  )
}

function Lz({ C }: { C: React.ComponentType }) {
  return <Suspense fallback={<PageLoader />}><C /></Suspense>
}

export function AppRouter() {
  return (
    <ErrorBoundary>
      <PrefsApplier />
      <Routes>
        {/* ── Public routes ───────────────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/merchant/login" element={<MerchantLoginPage />} />

        {/* ── Merchant Portal ─────────────────────────────────────────────── */}
        <Route element={<MerchantProtectedRoute><MerchantShell /></MerchantProtectedRoute>}>
          <Route path="/merchant"                           element={<Lz C={MerchantDashboardPage} />} />
          <Route path="/merchant/profile"                   element={<Lz C={MerchantProfilePage} />} />
          <Route path="/merchant/products"                  element={<Lz C={MerchantProductsPage} />} />
          <Route path="/merchant/inventory"                 element={<Lz C={MerchantStockLevelsPage} />} />
          <Route path="/merchant/inventory/levels"          element={<Lz C={MerchantStockLevelsPage} />} />
          <Route path="/merchant/inventory/requests"        element={<Lz C={MerchantStockRequestsPage} />} />
          <Route path="/merchant/inventory/storage"         element={<Lz C={MerchantStorageUsagePage} />} />
          <Route path="/merchant/orders"                    element={<Lz C={MerchantOrdersPage} />} />
          <Route path="/merchant/returns"                   element={<Lz C={MerchantReturnsPage} />} />
          <Route path="/merchant/wallet"                    element={<Lz C={MerchantWalletPage} />} />
          <Route path="/merchant/finance/wallet"            element={<Lz C={MerchantWalletPage} />} />
          <Route path="/merchant/finance/withdrawals"       element={<Lz C={MerchantWithdrawalsPage} />} />
          <Route path="/merchant/finance/invoices"          element={<Lz C={MerchantInvoicesPage} />} />
          <Route path="/merchant/services"                  element={<Lz C={MerchantServicesPage} />} />
          <Route path="/merchant/services/requests"         element={<Lz C={MerchantServicesPage} />} />
          <Route path="/merchant/services/subscriptions"    element={<Lz C={MerchantSubscriptionsPage} />} />
          <Route path="/merchant/notifications"             element={<Lz C={MerchantNotificationsPage} />} />
          <Route path="/merchant/reports"                   element={<Lz C={MerchantReportsPage} />} />
          <Route path="/merchant/settings"                  element={<Lz C={MerchantSettingsPage} />} />
          <Route path="/merchant/records/:kind/:id"          element={<Lz C={MerchantRecordDetailPage} />} />
        </Route>

        {/* ── Admin Portal ────────────────────────────────────────────────── */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index                             element={<><Lz C={DashboardPage} /><Lz C={AdminExtras} /></>} />
          <Route path="approvals"                  element={<Lz C={ApprovalsPage} />} />
          <Route path="merchants"                  element={<Lz C={MerchantsPage} />} />
          <Route path="platform-products"          element={<Lz C={PlatformProductsPage} />} />
          <Route path="inventory/requests"         element={<Lz C={StockRequestsPage} />} />
          <Route path="inventory/levels"           element={<Lz C={StockLevelsPage} />} />
          <Route path="inventory/storage"          element={<Lz C={StorageUsagePage} />} />
          <Route path="orders"                     element={<Lz C={OrdersPage} />} />
          <Route path="records/:kind/:id"          element={<Lz C={RecordDetailPage} />} />
          <Route path="returns"                    element={<Lz C={ReturnsPage} />} />
          <Route path="finance/withdrawals"        element={<Lz C={WithdrawalsPage} />} />
          <Route path="finance/wallets"            element={<Lz C={WalletsPage} />} />
          <Route path="finance/invoices"           element={<Lz C={InvoicesPage} />} />
          <Route path="services/requests"          element={<Lz C={ServiceRequestsPage} />} />
          <Route path="services/subscriptions"     element={<Lz C={SubscriptionsPage} />} />
          <Route path="services/types"             element={<Lz C={ServiceTypesPage} />} />
          <Route path="reports"                    element={<Lz C={ReportsPage} />} />
          <Route path="settings"                   element={<Lz C={SettingsPage} />} />
          <Route path="logs"                       element={<Lz C={AuditLogsPage} />} />
          <Route path="notifications"              element={<Lz C={NotificationsPage} />} />
          <Route path="profile"                    element={<Lz C={ProfilePage} />} />
        </Route>

        {/* ── Fallback ────────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
