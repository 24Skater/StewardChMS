import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MembersPage from './pages/members/MembersPage'
import MemberFormPage from './pages/members/MemberFormPage'
import MemberDetailPage from './pages/members/MemberDetailPage'
import MemberImportPage from './pages/members/MemberImportPage'
import HouseholdDetailPage from './pages/households/HouseholdDetailPage'
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
    </Routes>
  )
}

export default App

