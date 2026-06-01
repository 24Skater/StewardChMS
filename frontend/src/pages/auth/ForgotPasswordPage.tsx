import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { forgotPassword } from '@/lib/api'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type FormData = z.infer<typeof schema>

function ForgotPasswordPage() {
  const { resolvedTheme } = useTheme()
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const logoSrc = resolvedTheme === 'dark' ? '/steward-mark.svg' : '/steward-mark-light.svg'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      setServerError(null)
      await forgotPassword(data.email)
      setSent(true)
    } catch {
      setServerError('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--st-bg)]">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[var(--st-primary)]/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-[var(--st-success)]/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4">
              <img src={logoSrc} alt="Steward" className="mx-auto h-16 w-auto" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--st-fg)]">
              Steward <span className="text-[var(--st-muted)]">·</span> ChMS
            </h1>
            <p className="mt-1 text-sm text-[var(--st-muted)]">Reset your password</p>
          </div>

          <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-8 backdrop-blur-sm">
            {sent ? (
              <div className="text-center">
                <div className="mb-4 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--st-success)]/10">
                    <svg className="h-6 w-6 text-[var(--st-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="mb-2 text-lg font-semibold text-[var(--st-fg)]">Check your inbox</h2>
                <p className="mb-6 text-sm text-[var(--st-muted)]">
                  If that email is registered, a password reset link has been sent. The link expires in 1 hour.
                </p>
                <p className="text-xs text-[var(--st-muted)]">
                  No email? Check your spam folder, or{' '}
                  <button
                    onClick={() => setSent(false)}
                    className="text-[var(--st-primary)] underline underline-offset-2 hover:opacity-80"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                {serverError && (
                  <div className="mb-6 rounded-lg border border-[var(--st-danger)]/50 bg-[var(--st-danger)]/10 p-4">
                    <p className="text-sm text-[var(--st-danger)]">{serverError}</p>
                  </div>
                )}

                <p className="mb-6 text-sm text-[var(--st-muted)]">
                  Enter your account email and we'll send you a link to reset your password.
                </p>

                <div className="mb-6">
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-[var(--st-mutedFg)]">
                    Email address
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    autoComplete="email"
                    autoFocus
                    className="w-full rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-2.5 text-[var(--st-fg)] placeholder-[var(--st-muted)] focus:border-[var(--st-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--st-primary)]"
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-[var(--st-danger)]">{errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[var(--st-primary)] py-2.5 font-medium text-[var(--st-primaryFg)] hover:bg-[var(--st-primary-hover)] disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-[var(--st-muted)]">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-[var(--st-primary)] hover:opacity-80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
