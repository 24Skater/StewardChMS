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
    <div className="min-h-screen bg-[#0F172A]">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#2563EB]/10 blur-3xl" />
        <div className="absolute bottom-0 -left-40 h-96 w-96 rounded-full bg-[#16A34A]/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-[#334155] bg-[#1E293B]/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img 
              src="/steward-mark-light.svg" 
              alt="Steward" 
              className="h-10 w-10"
            />
            <span className="text-lg font-semibold text-white">
              Steward <span className="text-[#64748B]">·</span> ChMS
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-[#94A3B8]">
              {user?.name || user?.email}
            </span>
            <Button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              variant="outline"
              className="border-[#334155] bg-transparent text-[#CBD5E1] hover:bg-[#334155] hover:text-white"
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
          <p className="mt-1 text-[#94A3B8]">Welcome back, {user?.name || 'Admin'}!</p>
        </div>

        {/* User Info Card */}
        <div className="rounded-xl border border-[#334155] bg-[#1E293B]/50 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">User Information</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#94A3B8]">Email</p>
                <p className="font-medium text-white">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-[#94A3B8]">Name</p>
                <p className="font-medium text-white">{user?.name || 'Not set'}</p>
              </div>
            </div>

            {/* Roles */}
            <div>
              <p className="mb-2 text-sm text-[#94A3B8]">Roles</p>
              <div className="flex flex-wrap gap-2">
                {user?.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-[#2563EB]/20 px-3 py-1 text-sm font-medium text-[#60A5FA]"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <p className="mb-2 text-sm text-[#94A3B8]">Permissions</p>
              <div className="flex flex-wrap gap-2">
                {user?.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="rounded-full bg-[#334155]/50 px-3 py-1 text-sm text-[#CBD5E1]"
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
          <div className="rounded-xl border border-[#334155] bg-[#1E293B]/50 p-6 backdrop-blur-sm">
            <p className="text-sm text-[#94A3B8]">Members</p>
            <p className="mt-2 text-3xl font-bold text-white">—</p>
            <p className="mt-1 text-xs text-[#64748B]">Coming in Phase 2</p>
          </div>
          <div className="rounded-xl border border-[#334155] bg-[#1E293B]/50 p-6 backdrop-blur-sm">
            <p className="text-sm text-[#94A3B8]">Events</p>
            <p className="mt-2 text-3xl font-bold text-white">—</p>
            <p className="mt-1 text-xs text-[#64748B]">Coming in Phase 3</p>
          </div>
          <div className="rounded-xl border border-[#334155] bg-[#1E293B]/50 p-6 backdrop-blur-sm">
            <p className="text-sm text-[#94A3B8]">Donations</p>
            <p className="mt-2 text-3xl font-bold text-white">—</p>
            <p className="mt-1 text-xs text-[#64748B]">Coming in Phase 5</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardPage
