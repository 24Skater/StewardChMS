import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLogin } from '@/hooks/useAuth'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
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

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#2563EB]/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-[#16A34A]/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4">
              <img 
                src="/steward-mark-light.svg" 
                alt="Steward" 
                className="mx-auto h-16 w-16"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Steward <span className="text-[#64748B]">·</span> ChMS
            </h1>
            <p className="mt-1 text-sm text-[#94A3B8]">Sign in to your account</p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-xl border border-[#334155] bg-[#1E293B]/50 p-8 backdrop-blur-sm"
          >
            {/* Error Alert */}
            {loginMutation.isError && (
              <div className="mb-6 rounded-lg border border-[#DC2626]/50 bg-[#DC2626]/10 p-4">
                <p className="text-sm text-[#DC2626]">
                  {loginMutation.error?.data?.error || 'Login failed. Please try again.'}
                </p>
              </div>
            )}

            {/* Email Field */}
            <div className="mb-4">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[#CBD5E1]"
              >
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                autoComplete="email"
                className="w-full rounded-lg border border-[#334155] bg-[#1E293B] px-4 py-2.5 text-white placeholder-[#64748B] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-[#DC2626]">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[#CBD5E1]"
              >
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                id="password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-[#334155] bg-[#1E293B] px-4 py-2.5 text-white placeholder-[#64748B] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-[#DC2626]">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || loginMutation.isPending}
              className="w-full bg-[#2563EB] py-2.5 font-medium text-white hover:bg-[#3B82F6] disabled:opacity-50"
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-[#475569]">
            Part of the Steward Ecosystem
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
