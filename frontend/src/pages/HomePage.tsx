import { useQuery } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { ThemeToggle } from '../components/ui/theme-toggle'

async function fetchHealth() {
  const response = await fetch('/api/health')
  if (!response.ok) {
    throw new Error('API health check failed')
  }
  return response.json()
}

async function fetchSetupStatus() {
  const response = await fetch('/api/setup/status')
  if (!response.ok) {
    throw new Error('Failed to check setup status')
  }
  return response.json()
}

function HomePage() {
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: false,
  })

  const { data: setupStatus, isLoading: setupLoading } = useQuery({
    queryKey: ['setup', 'status'],
    queryFn: fetchSetupStatus,
    retry: false,
  })

  // Choose logo based on theme
  const logoSrc = resolvedTheme === 'dark' ? '/steward-mark-light.svg' : '/steward-mark.svg'

  // Redirect to setup wizard if setup is needed
  if (!setupLoading && setupStatus?.needsSetup) {
    return <Navigate to="/setup" replace />
  }

  // Show loading while checking setup status
  if (setupLoading) {
    return (
      <div className="min-h-screen bg-[var(--st-bg)] flex items-center justify-center">
        <div className="text-center">
          <img 
            src={logoSrc}
            alt="Steward" 
            className="h-16 w-16 mx-auto mb-4 animate-pulse"
          />
          <p className="text-[var(--st-muted)]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--st-bg)]">
      {/* Theme Toggle - top right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[var(--st-primary)]/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-[var(--st-success)]/10 blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 h-80 w-80 rounded-full bg-[var(--st-accent)]/20 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
        {/* Official Steward Logo */}
        <div className="mb-8">
          <img 
            src={logoSrc}
            alt="Steward" 
            className="h-20 w-20"
          />
        </div>

        {/* Main heading - Using Steward naming convention */}
        <h1 className="mb-2 text-center text-5xl font-semibold tracking-tight text-[var(--st-fg)] md:text-6xl">
          Steward <span className="text-[var(--st-muted)]">·</span> ChMS
        </h1>

        {/* Tagline */}
        <p className="mb-8 max-w-md text-center text-lg text-[var(--st-muted)]">
          Modern Church Management System
        </p>

        {/* Scripture quote */}
        <blockquote className="mb-12 max-w-lg rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-6 backdrop-blur-sm">
          <p className="text-center text-[var(--st-mutedFg)] italic">
            "Moreover it is required in stewards, that a man be found faithful."
          </p>
          <footer className="mt-3 text-center text-sm text-[var(--st-muted)]">
            — 1 Corinthians 4:2 (KJV)
          </footer>
        </blockquote>

        {/* Login / Dashboard Button */}
        <div className="mb-8">
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--st-primary)] px-8 py-3 font-semibold text-[var(--st-primaryFg)] shadow-lg shadow-[var(--st-primary)]/25 transition-all hover:bg-[var(--st-primary-hover)] hover:shadow-[var(--st-primary)]/40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
              Go to Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--st-primary)] px-8 py-3 font-semibold text-[var(--st-primaryFg)] shadow-lg shadow-[var(--st-primary)]/25 transition-all hover:bg-[var(--st-primary-hover)] hover:shadow-[var(--st-primary)]/40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" x2="3" y1="12" y2="12" />
              </svg>
              Sign In
            </Link>
          )}
        </div>

        {/* API Status */}
        <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)]/30 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--st-muted)]">API Status:</span>
            {isLoading ? (
              <span className="flex items-center gap-2 text-sm text-[var(--st-muted)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--st-muted)]" />
                Checking...
              </span>
            ) : error ? (
              <span className="flex items-center gap-2 text-sm text-[var(--st-danger)]">
                <span className="h-2 w-2 rounded-full bg-[var(--st-danger)]" />
                Offline
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm text-[var(--st-success)]">
                <span className="h-2 w-2 rounded-full bg-[var(--st-success)]" />
                {health?.status === 'ok' ? 'Online' : 'Unknown'}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-8 text-center text-sm text-[var(--st-muted)]">
          <p>Part of the Steward Ecosystem</p>
        </footer>
      </div>
    </div>
  )
}

export default HomePage
