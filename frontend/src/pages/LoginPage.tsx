import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLogin } from '@/hooks/useAuth'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { getAuthMethods, ssoStartUrl, type AuthMethods } from '@/lib/api'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

/**
 * What went wrong on the way back from the identity provider.
 *
 * The backend redirects here with one of these rather than rendering its own
 * page, so there is one sign-in screen and every other way in is still on it.
 */
const SSO_ERRORS: Record<string, string> = {
  sso_unavailable: 'Single sign-on is unavailable right now. Sign in with your password below.',
  sso_expired: 'That sign-in took too long. Try again.',
  sso_unverified:
    'That address is not verified with the identity provider yet. Verify it there, or sign in with your password below.',
  sso_no_account:
    'We could not sign you in. If you are new to this church, ask an administrator to add you.',
  sso_failed: 'Single sign-on did not complete. Sign in with your password below.',
}

/**
 * Until the answer arrives, assume password sign-in and no SSO.
 *
 * The optimistic half is the one that matters: a slow or failed call to
 * /auth/methods must never leave somebody staring at a page with no way in.
 */
const ASSUMED_METHODS: AuthMethods = { password: true, sso: false, ssoLabel: '' }

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { resolvedTheme } = useTheme()
  const loginMutation = useLogin()
  const [searchParams] = useSearchParams()
  const [methods, setMethods] = useState<AuthMethods>(ASSUMED_METHODS)

  const ssoError = SSO_ERRORS[searchParams.get('error') ?? '']

  useEffect(() => {
    let cancelled = false
    getAuthMethods()
      .then((result) => {
        if (!cancelled) setMethods(result)
      })
      .catch(() => {
        // Leave the assumption in place. Password sign-in is the one that
        // works without this server answering anything.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync(data)
      navigate(from, { replace: true })
    } catch {
      // Error is handled by mutation state
    }
  }

  const logoSrc = resolvedTheme === 'dark' ? '/steward-mark.svg' : '/steward-mark-light.svg'

  return (
    <div className="min-h-screen bg-[var(--st-bg)]">
      {/* Theme Toggle - top right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[var(--st-primary)]/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-[var(--st-success)]/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4">
              <img 
                src={logoSrc}
                alt="Steward" 
                className="mx-auto h-16 w-16"
              />
            </div>
            <h1 className="text-2xl font-bold text-[var(--st-fg)]">
              Steward <span className="text-[var(--st-muted)]">·</span> Congregation
            </h1>
            <p className="mt-1 text-sm text-[var(--st-muted)]">Sign in to your account</p>
          </div>

          {/* What came back from the identity provider, if anything did */}
          {ssoError && (
            <div className="mb-6 rounded-lg border border-[var(--st-danger)]/50 bg-[var(--st-danger)]/10 p-4">
              <p className="text-sm text-[var(--st-danger)]">{ssoError}</p>
            </div>
          )}

          {/*
            Single sign-on above the form, because it is the recommendation —
            but on the same screen as the password, not behind a disclosure.
            The password is what still works when the identity provider does
            not, which is exactly when somebody will be hunting for it.
          */}
          {methods.sso && (
            <div className="mb-6 rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-6 backdrop-blur-sm">
              <a
                href={ssoStartUrl()}
                className="block w-full rounded-lg bg-[var(--st-primary)] py-2.5 text-center font-medium text-[var(--st-primaryFg)] hover:bg-[var(--st-primary-hover)]"
              >
                {methods.ssoLabel}
              </a>
              {methods.password && (
                <p className="mt-3 text-center text-xs text-[var(--st-muted)]">
                  Or sign in to this church with your password below.
                </p>
              )}
            </div>
          )}

          {/* Login Form */}
          {methods.password && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-8 backdrop-blur-sm"
          >
            {/* Error Alert */}
            {loginMutation.isError && (
              <div className="mb-6 rounded-lg border border-[var(--st-danger)]/50 bg-[var(--st-danger)]/10 p-4">
                <p className="text-sm text-[var(--st-danger)]">
                  {loginMutation.error?.data?.error || 'Login failed. Please try again.'}
                </p>
              </div>
            )}

            {/* Email Field */}
            <div className="mb-4">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[var(--st-mutedFg)]"
              >
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                autoComplete="email"
                className="w-full rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-2.5 text-[var(--st-fg)] placeholder-[var(--st-muted)] focus:border-[var(--st-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--st-primary)]"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-[var(--st-danger)]">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-[var(--st-mutedFg)]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[var(--st-primary)] hover:opacity-80"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                {...register('password')}
                type="password"
                id="password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-2.5 text-[var(--st-fg)] placeholder-[var(--st-muted)] focus:border-[var(--st-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--st-primary)]"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-[var(--st-danger)]">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || loginMutation.isPending}
              className="w-full bg-[var(--st-primary)] py-2.5 font-medium text-[var(--st-primaryFg)] hover:bg-[var(--st-primary-hover)] disabled:opacity-50"
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-[var(--st-muted)]">
            Part of the Steward Ecosystem
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
