import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MembersPage from './pages/members/MembersPage'
import MemberFormPage from './pages/members/MemberFormPage'
import MemberDetailPage from './pages/members/MemberDetailPage'
import MemberImportPage from './pages/members/MemberImportPage'
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
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredPermission="admin.access">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      {/* Member Routes */}
      <Route
        path="/members"
        element={
          <ProtectedRoute requiredPermission="members.read">
            <MembersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/new"
        element={
          <ProtectedRoute requiredPermission="members.write">
            <MemberFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/import"
        element={
          <ProtectedRoute requiredPermission="members.write">
            <MemberImportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/:id"
        element={
          <ProtectedRoute requiredPermission="members.read">
            <MemberDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/:id/edit"
        element={
          <ProtectedRoute requiredPermission="members.write">
            <MemberFormPage />
          </ProtectedRoute>
        }
      />
      {/* Household Routes */}
      <Route
        path="/households/:id"
        element={
          <ProtectedRoute requiredPermission="members.read">
            <HouseholdDetailPage />
          </ProtectedRoute>
        }
      />
      {/* Event Routes (Phase 3) */}
      <Route
        path="/events"
        element={
          <ProtectedRoute requiredPermission="events.read">
            <EventsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/new"
        element={
          <ProtectedRoute requiredPermission="events.write">
            <EventFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:id"
        element={
          <ProtectedRoute requiredPermission="events.read">
            <EventDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:id/edit"
        element={
          <ProtectedRoute requiredPermission="events.write">
            <EventFormPage />
          </ProtectedRoute>
        }
      />
      {/* Occurrence Routes */}
      <Route
        path="/occurrences/:id"
        element={
          <ProtectedRoute requiredPermission="events.read">
            <OccurrenceDetailPage />
          </ProtectedRoute>
        }
      />
      {/* Song Routes */}
      <Route
        path="/songs"
        element={
          <ProtectedRoute requiredPermission="worship.read">
            <SongsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/songs/new"
        element={
          <ProtectedRoute requiredPermission="worship.write">
            <SongFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/songs/:id/edit"
        element={
          <ProtectedRoute requiredPermission="worship.write">
            <SongFormPage />
          </ProtectedRoute>
        }
      />
      {/* Communication Routes (Phase 4) */}
      <Route
        path="/communications"
        element={
          <ProtectedRoute requiredPermission="communications.view">
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/communications/new"
        element={
          <ProtectedRoute requiredPermission="communications.send">
            <ComposeMessagePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/communications/:id"
        element={
          <ProtectedRoute requiredPermission="communications.view">
            <MessageDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/communications/templates"
        element={
          <ProtectedRoute requiredPermission="communications.view">
            <TemplatesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/communications/templates/new"
        element={
          <ProtectedRoute requiredPermission="communications.send">
            <TemplateFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/communications/templates/:id/edit"
        element={
          <ProtectedRoute requiredPermission="communications.send">
            <TemplateFormPage />
          </ProtectedRoute>
        }
      />
      {/* Giving Routes (Phase 5) */}
      <Route
        path="/giving"
        element={
          <ProtectedRoute requiredPermission="giving.view">
            <DonationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/giving/new"
        element={
          <ProtectedRoute requiredPermission="giving.edit">
            <DonationFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/giving/:id/edit"
        element={
          <ProtectedRoute requiredPermission="giving.edit">
            <DonationFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pledges"
        element={
          <ProtectedRoute requiredPermission="giving.view">
            <PledgesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pledges/new"
        element={
          <ProtectedRoute requiredPermission="giving.edit">
            <PledgeFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pledges/:id/edit"
        element={
          <ProtectedRoute requiredPermission="giving.edit">
            <PledgeFormPage />
          </ProtectedRoute>
        }
      />
      {/* Accounting Routes (Phase 5) */}
      <Route
        path="/funds"
        element={
          <ProtectedRoute requiredPermission="accounting.view">
            <FundsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendors"
        element={
          <ProtectedRoute requiredPermission="accounting.view">
            <VendorsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute requiredPermission="accounting.view">
            <ExpensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses/new"
        element={
          <ProtectedRoute requiredPermission="accounting.edit">
            <ExpenseFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses/:id/edit"
        element={
          <ProtectedRoute requiredPermission="accounting.edit">
            <ExpenseFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute requiredPermission="accounting.view">
            <InvoicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/new"
        element={
          <ProtectedRoute requiredPermission="accounting.edit">
            <InvoiceFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/:id"
        element={
          <ProtectedRoute requiredPermission="accounting.view">
            <InvoiceDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders"
        element={
          <ProtectedRoute requiredPermission="accounting.view">
            <PurchaseOrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders/new"
        element={
          <ProtectedRoute requiredPermission="accounting.edit">
            <PurchaseOrderFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders/:id"
        element={
          <ProtectedRoute requiredPermission="accounting.view">
            <PurchaseOrderDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/finance"
        element={
          <ProtectedRoute requiredPermission="accounting.view">
            <FinanceReportsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App

