import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: string
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check for required permission
  if (requiredPermission && user && !user.permissions.includes(requiredPermission)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-8 text-center">
          <h1 className="text-xl font-semibold text-red-400">Access Denied</h1>
          <p className="mt-2 text-slate-400">
            You don't have permission to access this page.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Required: {requiredPermission}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

