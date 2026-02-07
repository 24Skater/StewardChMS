import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useState } from 'react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { label: 'Members', href: '/members', icon: '👥' },
  { label: 'Events', href: '/events', icon: '📅' },
  { label: 'Giving', href: '/giving', icon: '💝' },
  { label: 'Groups', href: '/groups', icon: '🏛️' },
  { label: 'Communications', href: '/communications', icon: '✉️' },
  { label: 'Kids Check-In', href: '/kids-checkin', icon: '🧒' },
  { label: 'Reports', href: '/reports', icon: '📊' },
  { label: 'Products', href: '/products', icon: '🛒' },
  { label: 'Sales', href: '/sales', icon: '💳' },
  { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
]

export function AppLayout() {
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()
  const logoutMutation = useLogout()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  // Choose logo based on theme
  const logoSrc = resolvedTheme === 'dark' ? '/steward-mark-light.svg' : '/steward-mark.svg'

  return (
    <div className="min-h-screen bg-[var(--st-bg)] flex">
      {/* Sidebar */}
      <aside 
        className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 border-r border-[var(--st-border)] bg-[var(--st-surface)]/50 backdrop-blur-sm flex flex-col fixed h-full z-40`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-[var(--st-border)]">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img 
              src={logoSrc}
              alt="Steward" 
              className="h-10 w-10 flex-shrink-0"
            />
            {sidebarOpen && (
              <span className="text-lg font-semibold text-[var(--st-fg)] whitespace-nowrap">
                Steward <span className="text-[var(--st-muted)]">·</span> ChMS
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-[var(--st-primary)] text-white' 
                    : 'text-[var(--st-muted)] hover:bg-[var(--st-surfaceMuted)] hover:text-[var(--st-fg)]'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-[var(--st-border)] text-[var(--st-muted)] hover:text-[var(--st-fg)] transition-colors flex items-center justify-center"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-[var(--st-border)] bg-[var(--st-bg)]/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              {/* Breadcrumb or page title could go here */}
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <span className="text-sm text-[var(--st-muted)]">
                {user?.name || user?.email}
              </span>
              <Button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                variant="outline"
                size="sm"
                className="border-[var(--st-border)] bg-transparent text-[var(--st-mutedFg)] hover:bg-[var(--st-surfaceMuted)] hover:text-[var(--st-fg)]"
              >
                {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
