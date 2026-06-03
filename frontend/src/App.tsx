import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MembersPage from './pages/members/MembersPage'
import MemberFormPage from './pages/members/MemberFormPage'
import MemberDetailPage from './pages/members/MemberDetailPage'
import MemberImportPage from './pages/members/MemberImportPage'
import HouseholdsPage from './pages/households/HouseholdsPage'
import HouseholdDetailPage from './pages/households/HouseholdDetailPage'
import EventsPage from './pages/events/EventsPage'
import EventFormPage from './pages/events/EventFormPage'
import EventDetailPage from './pages/events/EventDetailPage'
import OccurrenceDetailPage from './pages/occurrences/OccurrenceDetailPage'
import SongsPage from './pages/songs/SongsPage'
import SongFormPage from './pages/songs/SongFormPage'
import MessagesPage from './pages/communications/MessagesPage'
import ComposeMessagePage from './pages/communications/ComposeMessagePage'
import MessageDetailPage from './pages/communications/MessageDetailPage'
import TemplatesPage from './pages/communications/TemplatesPage'
import TemplateFormPage from './pages/communications/TemplateFormPage'
// Phase 5: Accounting + Giving
import DonationsPage from './pages/giving/DonationsPage'
import DonationFormPage from './pages/giving/DonationFormPage'
import PledgesPage from './pages/giving/PledgesPage'
import PledgeFormPage from './pages/giving/PledgeFormPage'
import FundsPage from './pages/accounting/FundsPage'
import VendorsPage from './pages/accounting/VendorsPage'
import ExpensesPage from './pages/accounting/ExpensesPage'
import ExpenseFormPage from './pages/accounting/ExpenseFormPage'
import InvoicesPage from './pages/accounting/InvoicesPage'
import InvoiceFormPage from './pages/accounting/InvoiceFormPage'
import InvoiceDetailPage from './pages/accounting/InvoiceDetailPage'
import PurchaseOrdersPage from './pages/accounting/PurchaseOrdersPage'
import PurchaseOrderFormPage from './pages/accounting/PurchaseOrderFormPage'
import PurchaseOrderDetailPage from './pages/accounting/PurchaseOrderDetailPage'
import FinanceReportsPage from './pages/reports/FinanceReportsPage'
import FinancialDashboardPage from './pages/reports/FinancialDashboardPage'
// Phase 6: Reporting + Sales
import ReportsHubPage from './pages/reports/ReportsHubPage'
import MembershipReportPage from './pages/reports/MembershipReportPage'
import AttendanceReportPage from './pages/reports/AttendanceReportPage'
import GivingReportPage from './pages/reports/GivingReportPage'
import SalesReportPage from './pages/reports/SalesReportPage'
import ProductsPage from './pages/products/ProductsPage'
import InventoryPage from './pages/inventory/InventoryPage'
import SalesPage from './pages/sales/SalesPage'
import SaleFormPage from './pages/sales/SaleFormPage'
import SaleDetailPage from './pages/sales/SaleDetailPage'
// Setup + Settings
import SetupWizardPage from './pages/setup/SetupWizardPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
// Groups & Ministries
import GroupsPage from './pages/groups/GroupsPage'
// Kids Check-in
import KidsCheckinPage from './pages/kids-checkin/KidsCheckinPage'
import KioskModePage from './pages/kids-checkin/KioskModePage'
// Online Giving
import GivingPortalPage from './pages/giving/GivingPortalPage'
import ThankYouPage from './pages/giving/ThankYouPage'
// Ministry Scheduling (Phase 7)
import SchedulesPage from './pages/schedules/SchedulesPage'
import ScheduleFormPage from './pages/schedules/ScheduleFormPage'
import ScheduleDetailPage from './pages/schedules/ScheduleDetailPage'
import SchedulePeriodPage from './pages/schedules/SchedulePeriodPage'
import ScheduleKioskPage from './pages/schedules/ScheduleKioskPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { DemoBanner } from './components/layout/DemoBanner'
import { IconTestPage } from './pages/IconTestPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

function App() {
  return (
    <>
      <DemoBanner />
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {import.meta.env.DEV && (
        <Route path="/icon-test" element={<IconTestPage />} />
      )}
      <Route path="/setup" element={<SetupWizardPage />} />
      <Route path="/kids-checkin/kiosk" element={<KioskModePage />} />
      <Route path="/give" element={<GivingPortalPage />} />
      <Route path="/kiosk/:token" element={<ScheduleKioskPage />} />
      <Route path="/give/thank-you" element={<ThankYouPage />} />

      {/* Protected Routes with App Layout */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        
        {/* Groups */}
        <Route path="/groups" element={<GroupsPage />} />
        
        {/* Members */}
        <Route path="/members" element={<MembersPage />} />
        <Route path="/members/new" element={<MemberFormPage />} />
        <Route path="/members/import" element={<MemberImportPage />} />
        <Route path="/members/:id" element={<MemberDetailPage />} />
        <Route path="/members/:id/edit" element={<MemberFormPage />} />
        
        {/* Households */}
        <Route path="/households" element={<HouseholdsPage />} />
        <Route path="/households/:id" element={<HouseholdDetailPage />} />
        
        {/* Events */}
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/new" element={<EventFormPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/events/:id/edit" element={<EventFormPage />} />
        <Route path="/occurrences/:id" element={<OccurrenceDetailPage />} />
        
        {/* Songs */}
        <Route path="/songs" element={<SongsPage />} />
        <Route path="/songs/new" element={<SongFormPage />} />
        <Route path="/songs/:id/edit" element={<SongFormPage />} />
        
        {/* Communications */}
        <Route path="/communications" element={<MessagesPage />} />
        <Route path="/communications/new" element={<ComposeMessagePage />} />
        <Route path="/communications/:id" element={<MessageDetailPage />} />
        <Route path="/communications/templates" element={<TemplatesPage />} />
        <Route path="/communications/templates/new" element={<TemplateFormPage />} />
        <Route path="/communications/templates/:id/edit" element={<TemplateFormPage />} />
        
        {/* Giving */}
        <Route path="/giving" element={<DonationsPage />} />
        <Route path="/giving/new" element={<DonationFormPage />} />
        <Route path="/giving/:id/edit" element={<DonationFormPage />} />
        <Route path="/pledges" element={<PledgesPage />} />
        <Route path="/pledges/new" element={<PledgeFormPage />} />
        <Route path="/pledges/:id/edit" element={<PledgeFormPage />} />
        
        {/* Accounting */}
        <Route path="/funds" element={<FundsPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/new" element={<ExpenseFormPage />} />
        <Route path="/expenses/:id/edit" element={<ExpenseFormPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/new" element={<InvoiceFormPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
        
        {/* Reports */}
        <Route path="/reports" element={<ReportsHubPage />} />
        <Route path="/reports/financial-dashboard" element={<FinancialDashboardPage />} />
        <Route path="/reports/finance" element={<FinanceReportsPage />} />
        <Route path="/reports/membership" element={<MembershipReportPage />} />
        <Route path="/reports/attendance" element={<AttendanceReportPage />} />
        <Route path="/reports/giving" element={<GivingReportPage />} />
        <Route path="/reports/sales" element={<SalesReportPage />} />
        
        {/* Products & Sales */}
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/sales/new" element={<SaleFormPage />} />
        <Route path="/sales/:id" element={<SaleDetailPage />} />
        
        {/* Kids Check-in */}
        <Route path="/kids-checkin" element={<KidsCheckinPage />} />

        {/* Ministry Scheduling */}
        <Route path="/schedules" element={<SchedulesPage />} />
        <Route path="/schedules/new" element={<ScheduleFormPage />} />
        <Route path="/schedules/:id" element={<ScheduleDetailPage />} />
        <Route path="/schedules/:id/edit" element={<ScheduleFormPage />} />
        <Route path="/schedules/:id/periods/:periodId" element={<SchedulePeriodPage />} />
      </Route>
    </Routes>
    </>
  )
}

export default App
