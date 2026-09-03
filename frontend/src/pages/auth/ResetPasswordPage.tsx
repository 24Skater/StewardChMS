import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { resetPassword } from '@/lib/api'

const schema = z
  .object({
    newPassword: z.string().min(12, 'Password must be at least 12 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

function ResetPasswordPage() {
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const logoSrc = resolvedTheme === 'dark' ? '/steward-mark.svg' : '/steward-mark-light.svg'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async (data: FormData) => {
    if (!token) return
    try {
      setServerError(null)
      await resetPassword(token, data.newPassword)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { error?: string } }).data?.error
          : null
      setServerError(msg || 'Something went wrong. The link may have expired.')
    }
  }

  const logoEl = <img src={logoSrc} alt="Steward" className="mx-auto h-16 w-auto" />

  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--st-bg)]">
        <div className="relative flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            {logoEl}
            <h1 className="mt-4 text-2xl font-bold text-[var(--st-fg)]">Invalid reset link</h1>
            <p className="mt-2 text-sm text-[var(--st-muted)]">
              This link is missing a reset token.{' '}
              <Link to="/forgot-password" className="font-medium text-[var(--st-primary)] hover:opacity-80">
                Request a new one
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    )
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
            <div className="mx-auto mb-4">{logoEl}</div>
            <h1 className="text-2xl font-bold text-[var(--st-fg)]">
              Steward <span className="text-[var(--st-muted)]">·</span> Congregation
            </h1>
            <p className="mt-1 text-sm text-[var(--st-muted)]">Set a new password</p>
          </div>

          <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-8 backdrop-blur-sm">
            {done ? (
              <div className="text-center">
                <div className="mb-4 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--st-success)]/10">
                    <svg className="h-6 w-6 text-[var(--st-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="mb-2 text-lg font-semibold text-[var(--st-fg)]">Password updated</h2>
                <p className="text-sm text-[var(--st-muted)]">Redirecting you to sign in…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                {serverError && (
                  <div className="mb-6 rounded-lg border border-[var(--st-danger)]/50 bg-[var(--st-danger)]/10 p-4">
                    <p className="text-sm text-[var(--st-danger)]">{serverError}</p>
                    {serverError.includes('expired') && (
                      <Link
                        to="/forgot-password"
                        className="mt-2 block text-sm font-medium text-[var(--st-danger)] underline underline-offset-2 hover:opacity-80"
                      >
                        Request a new reset link
                      </Link>
                    )}
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor="newPassword" className="mb-2 block text-sm font-medium text-[var(--st-mutedFg)]">
                    New password
                  </label>
                  <input
                    {...register('newPassword')}
                    type="password"
                    id="newPassword"
                    autoComplete="new-password"
                    autoFocus
                    className="w-full rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-2.5 text-[var(--st-fg)] placeholder-[var(--st-muted)] focus:border-[var(--st-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--st-primary)]"
                    placeholder="At least 12 characters"
                  />
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-[var(--st-danger)]">{errors.newPassword.message}</p>
                  )}
                </div>

                <div className="mb-6">
                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-[var(--st-mutedFg)]">
                    Confirm new password
                  </label>
                  <input
                    {...register('confirmPassword')}
                    type="password"
                    id="confirmPassword"
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-2.5 text-[var(--st-fg)] placeholder-[var(--st-muted)] focus:border-[var(--st-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--st-primary)]"
                    placeholder="Re-enter your password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-[var(--st-danger)]">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[var(--st-primary)] py-2.5 font-medium text-[var(--st-primaryFg)] hover:bg-[var(--st-primary-hover)] disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating password...' : 'Set new password'}
                </Button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-[var(--st-muted)]">
            <Link to="/login" className="font-medium text-[var(--st-primary)] hover:opacity-80">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage
