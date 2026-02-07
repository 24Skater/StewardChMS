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
    <div className="min-h-screen bg-[#0F172A]">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#2563EB]/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-[#16A34A]/10 blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 h-80 w-80 rounded-full bg-[#1B2A41]/30 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
        {/* Official Steward Logo */}
        <div className="mb-8">
          <img 
            src="/steward-mark-light.svg" 
            alt="Steward" 
            className="h-20 w-20"
          />
        </div>

        {/* Main heading - Using Steward naming convention */}
        <h1 className="mb-2 text-center text-5xl font-semibold tracking-tight text-white md:text-6xl">
          Steward <span className="text-[#64748B]">·</span> ChMS
        </h1>

        {/* Tagline */}
        <p className="mb-8 max-w-md text-center text-lg text-[#94A3B8]">
          Modern Church Management System
        </p>

        {/* Scripture quote */}
        <blockquote className="mb-12 max-w-lg rounded-xl border border-[#334155] bg-[#1E293B]/50 p-6 backdrop-blur-sm">
          <p className="text-center text-[#CBD5E1] italic">
            "Moreover it is required in stewards, that a man be found faithful."
          </p>
          <footer className="mt-3 text-center text-sm text-[#64748B]">
            — 1 Corinthians 4:2 (KJV)
          </footer>
        </blockquote>

        {/* Login / Dashboard Button */}
        <div className="mb-8">
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-8 py-3 font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-all hover:bg-[#3B82F6] hover:shadow-[#2563EB]/40"
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
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-8 py-3 font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-all hover:bg-[#3B82F6] hover:shadow-[#2563EB]/40"
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
        <div className="rounded-lg border border-[#334155] bg-[#1E293B]/30 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#94A3B8]">API Status:</span>
            {isLoading ? (
              <span className="flex items-center gap-2 text-sm text-[#64748B]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#64748B]" />
                Checking...
              </span>
            ) : error ? (
              <span className="flex items-center gap-2 text-sm text-[#DC2626]">
                <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
                Offline
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm text-[#16A34A]">
                <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                {health?.status === 'ok' ? 'Online' : 'Unknown'}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-8 text-center text-sm text-[#475569]">
          <p>Part of the Steward Ecosystem</p>
        </footer>
      </div>
    </div>
  )
}

export default HomePage
