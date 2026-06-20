import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useState } from 'react'
import { Icon } from '@/lib/icons'
import type { IconName } from '@/lib/icons'

interface NavItem {
  label: string
  href: string
  icon: IconName
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    ],
  },
  {
    title: 'People & Groups',
    items: [
      { label: 'Members', href: '/members', icon: 'members' },
      { label: 'Households', href: '/households', icon: 'households' },
      { label: 'Groups', href: '/groups', icon: 'groups' },
    ],
  },
  {
    title: 'Events & Worship',
    items: [
      { label: 'Events', href: '/events', icon: 'events' },
      { label: 'Schedules', href: '/schedules', icon: 'schedules' },
      { label: 'Kids Check-In', href: '/kids-checkin', icon: 'kids-checkin' },
      { label: 'Songs', href: '/songs', icon: 'songs' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Messages', href: '/communications', icon: 'messages' },
    ],
  },
  {
    title: 'Giving & Finance',
    items: [
      { label: 'Donations', href: '/giving', icon: 'giving' },
      { label: 'Pledges', href: '/pledges', icon: 'pledges' },
      { label: 'Funds', href: '/funds', icon: 'funds' },
      { label: 'Expenses', href: '/expenses', icon: 'expenses' },
      { label: 'Invoices', href: '/invoices', icon: 'invoices' },
      { label: 'Purchase Orders', href: '/purchase-orders', icon: 'purchase-orders' },
      { label: 'Vendors', href: '/vendors', icon: 'vendors' },
    ],
  },
  {
    title: 'Sales & Inventory',
    items: [
      { label: 'Products', href: '/products', icon: 'products' },
      { label: 'Inventory', href: '/inventory', icon: 'inventory' },
      { label: 'Sales', href: '/sales', icon: 'sales' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Reports', href: '/reports', icon: 'reports' },
      { label: 'Settings', href: '/admin/settings', icon: 'settings' },
    ],
  },
]

export function AppLayout() {
  const { user } = useAuth()
  const logoutMutation = useLogout()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-[var(--st-bg)] flex">
      {/* Sidebar — always dark navy regardless of app theme */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 border-r border-[var(--st-sidebar-border)] bg-[var(--st-sidebar-bg)] flex flex-col fixed h-full z-40`}
      >
        {/* Logo — gold mark on dark navy */}
        <div className="p-4 border-b border-[var(--st-sidebar-border)]">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img
              src="/steward-mark.svg"
              alt="Steward"
              className="h-10 flex-shrink-0"
              style={{ width: 'auto' }}
            />
            {sidebarOpen && (
              <span className="text-lg font-semibold text-[var(--st-sidebar-fg)] whitespace-nowrap tracking-wide">
                Steward <span className="text-[var(--st-sidebar-muted)]">·</span> Congregation
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title}>
              {sidebarOpen && (
                <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--st-sidebar-muted)]">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href ||
                    (item.href !== '/dashboard' && location.pathname.startsWith(item.href))

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[var(--st-sidebar-active)] text-[var(--st-sidebar-active-fg)] font-semibold'
                          : 'text-[var(--st-sidebar-muted)] hover:bg-[var(--st-sidebar-hover)] hover:text-[var(--st-sidebar-fg)]'
                      }`}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <Icon name={item.icon} size={18} active={isActive} className="flex-shrink-0" />
                      {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-[var(--st-sidebar-border)] text-[var(--st-sidebar-muted)] hover:text-[var(--st-sidebar-fg)] transition-colors flex items-center justify-center"
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
                className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)] hover:text-[var(--st-fg)]"
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
