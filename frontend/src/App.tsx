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
    </Routes>
  )
}

export default App

