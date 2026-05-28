import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api'
import { Icon } from '@/lib/icons'
import type { IconName } from '@/lib/icons'

interface DashboardStats {
  members: { total: number; active: number; newThisMonth: number }
  events: { upcoming: number; thisWeek: number }
  giving: { monthTotal: number; yearTotal: number }
  groups: { total: number; ministries: number }
}

function DashboardPage() {
  const { user } = useAuth()

  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      try {
        // Fetch various stats in parallel
        const [members, events, donations, groups, ministries] = await Promise.all([
          apiRequest<{ id: string }[]>('/members?limit=1000').catch(() => []),
          apiRequest<{ id: string }[]>('/events?limit=100').catch(() => []),
          apiRequest<{ id: string; amountCents: number; receivedAt: string }[]>('/donations?limit=1000').catch(() => []),
          apiRequest<{ id: string }[]>('/groups').catch(() => []),
          apiRequest<{ id: string }[]>('/ministries').catch(() => []),
        ])

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfYear = new Date(now.getFullYear(), 0, 1)

        const monthDonations = Array.isArray(donations) 
          ? donations.filter(d => new Date(d.receivedAt) >= startOfMonth)
          : []
        const yearDonations = Array.isArray(donations)
          ? donations.filter(d => new Date(d.receivedAt) >= startOfYear)
          : []

        return {
          members: {
            total: Array.isArray(members) ? members.length : 0,
            active: Array.isArray(members) ? members.length : 0,
            newThisMonth: 0,
          },
          events: {
            upcoming: Array.isArray(events) ? events.length : 0,
            thisWeek: 0,
          },
          giving: {
            monthTotal: monthDonations.reduce((sum, d) => sum + (d.amountCents || 0), 0),
            yearTotal: yearDonations.reduce((sum, d) => sum + (d.amountCents || 0), 0),
          },
          groups: {
            total: Array.isArray(groups) ? groups.length : 0,
            ministries: Array.isArray(ministries) ? ministries.length : 0,
          },
        } as DashboardStats
      } catch {
        return null
      }
    },
  })

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const quickActions: { label: string; href: string; icon: IconName; color: string }[] = [
    { label: 'Add Member', href: '/members/new', icon: 'members', color: 'bg-blue-500/20 text-blue-400' },
    { label: 'Create Event', href: '/events/new', icon: 'events', color: 'bg-emerald-500/20 text-emerald-400' },
    { label: 'Record Donation', href: '/giving/new', icon: 'giving', color: 'bg-amber-500/20 text-amber-400' },
    { label: 'Send Message', href: '/communications/new', icon: 'messages', color: 'bg-purple-500/20 text-purple-400' },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">Welcome back, {user?.name?.split(' ')[0] || 'Admin'}!</h1>
        <p className="mt-1 text-[var(--st-muted)]">Here's what's happening at your church.</p>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-medium text-[var(--st-muted)] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className="flex items-center gap-3 rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-4 backdrop-blur-sm hover:bg-[var(--st-surfaceMuted)] transition-colors"
            >
              <span className={`p-2 rounded-lg ${action.color}`}><Icon name={action.icon} size={20} /></span>
              <span className="font-medium text-[var(--st-fg)]">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--st-muted)]">Total Members</p>
            <Icon name="members" size={24} className="text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--st-fg)]">{stats?.members.total ?? '—'}</p>
          <Link to="/members" className="mt-2 text-xs text-[var(--st-link)] hover:underline inline-block">View all →</Link>
        </div>

        <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--st-muted)]">Events</p>
            <Icon name="events" size={24} className="text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--st-fg)]">{stats?.events.upcoming ?? '—'}</p>
          <Link to="/events" className="mt-2 text-xs text-[var(--st-link)] hover:underline inline-block">View calendar →</Link>
        </div>

        <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--st-muted)]">Giving (This Month)</p>
            <Icon name="giving" size={24} className="text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--st-success)]">
            {stats ? formatCurrency(stats.giving.monthTotal) : '—'}
          </p>
          <Link to="/giving" className="mt-2 text-xs text-[var(--st-link)] hover:underline inline-block">View donations →</Link>
        </div>

        <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--st-muted)]">Groups & Ministries</p>
            <Icon name="groups" size={24} className="text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--st-fg)]">
            {stats ? `${stats.groups.ministries} / ${stats.groups.total}` : '—'}
          </p>
          <Link to="/groups" className="mt-2 text-xs text-[var(--st-link)] hover:underline inline-block">Manage groups →</Link>
        </div>
      </div>

      {/* Online Giving Card */}
      <div className="rounded-xl border border-[var(--st-border)] bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--st-fg)]">Online Giving Portal</h3>
            <p className="mt-1 text-sm text-[var(--st-muted)]">
              Share this link with your congregation to accept online donations.
            </p>
            <code className="mt-2 inline-block rounded bg-[var(--st-surfaceMuted)] px-3 py-1 text-sm text-[var(--st-success)]">
              {window.location.origin}/give
            </code>
          </div>
          <Link
            to="/give"
            target="_blank"
            className="rounded-lg bg-[var(--st-success)] px-4 py-2 font-medium text-white hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Preview Portal
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
