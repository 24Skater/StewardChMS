import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

async function fetchHealth() {
  const response = await fetch('/api/health')
  if (!response.ok) {
    throw new Error('API health check failed')
  }
  return response.json()
}

function HomePage() {
  const { user } = useAuth()
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: false,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
        {/* Logo/Icon */}
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/25">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10 text-slate-900"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>

        {/* Main heading */}
        <h1 className="mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-center font-serif text-5xl font-bold tracking-tight text-transparent md:text-6xl">
          StewardChMS
        </h1>

        {/* Tagline */}
        <p className="mb-8 max-w-md text-center text-lg text-slate-400">
          Modern Church Management System
        </p>

        {/* Scripture quote */}
        <blockquote className="mb-12 max-w-lg rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <p className="text-center font-serif text-slate-300 italic">
            "Moreover it is required in stewards, that a man be found faithful."
          </p>
          <footer className="mt-3 text-center text-sm text-slate-500">
            — 1 Corinthians 4:2 (KJV)
          </footer>
        </blockquote>

        {/* Login / Dashboard Button */}
        <div className="mb-8">
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3 font-semibold text-slate-900 shadow-lg shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/40"
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
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3 font-semibold text-slate-900 shadow-lg shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/40"
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
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-400">API Status:</span>
            {isLoading ? (
              <span className="flex items-center gap-2 text-sm text-slate-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-slate-500" />
                Checking...
              </span>
            ) : error ? (
              <span className="flex items-center gap-2 text-sm text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Offline
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {health?.status === 'ok' ? 'Online' : 'Unknown'}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-8 text-center text-sm text-slate-600">
          <p>Part of the Steward Ecosystem</p>
        </footer>
      </div>
    </div>
  )
}

export default HomePage

