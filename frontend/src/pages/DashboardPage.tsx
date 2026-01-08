import { useAuth } from '@/context/AuthContext'
import { useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

function DashboardPage() {
  const { user } = useAuth()
  const logoutMutation = useLogout()

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-slate-900"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">StewardChMS</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {user?.name || user?.email}
            </span>
            <Button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              variant="outline"
              className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-slate-400">Welcome back, {user?.name || 'Admin'}!</p>
        </div>

        {/* User Info Card */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">User Information</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="font-medium text-white">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Name</p>
                <p className="font-medium text-white">{user?.name || 'Not set'}</p>
              </div>
            </div>

            {/* Roles */}
            <div>
              <p className="mb-2 text-sm text-slate-400">Roles</p>
              <div className="flex flex-wrap gap-2">
                {user?.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-400"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <p className="mb-2 text-sm text-slate-400">Permissions</p>
              <div className="flex flex-wrap gap-2">
                {user?.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="rounded-full bg-slate-700/50 px-3 py-1 text-sm text-slate-300"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Placeholder */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
            <p className="text-sm text-slate-400">Members</p>
            <p className="mt-2 text-3xl font-bold text-white">—</p>
            <p className="mt-1 text-xs text-slate-500">Coming in Phase 2</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
            <p className="text-sm text-slate-400">Events</p>
            <p className="mt-2 text-3xl font-bold text-white">—</p>
            <p className="mt-1 text-xs text-slate-500">Coming in Phase 3</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
            <p className="text-sm text-slate-400">Donations</p>
            <p className="mt-2 text-3xl font-bold text-white">—</p>
            <p className="mt-1 text-xs text-slate-500">Coming in Phase 5</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardPage

