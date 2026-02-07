import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLogin } from '@/hooks/useAuth'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { resolvedTheme } = useTheme()
  const loginMutation = useLogin()

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

  // Choose logo based on theme
  const logoSrc = resolvedTheme === 'dark' ? '/steward-mark-light.svg' : '/steward-mark.svg'

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
              Steward <span className="text-[var(--st-muted)]">·</span> ChMS
            </h1>
            <p className="mt-1 text-sm text-[var(--st-muted)]">Sign in to your account</p>
          </div>

          {/* Login Form */}
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
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[var(--st-mutedFg)]"
              >
                Password
              </label>
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
              className="w-full bg-[var(--st-primary)] py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

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
