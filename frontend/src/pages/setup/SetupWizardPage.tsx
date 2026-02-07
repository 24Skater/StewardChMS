import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  useSetupStatus,
  useSetupStep1,
  useSetupStep2,
  useSetupStep3,
  useSetupStep4,
  useCompleteSetup,
  useSetupSummary,
} from '@/hooks/useSetup'

// Schemas
const step1Schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  confirmPassword: z.string(),
  name: z.string().min(1, 'Name is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

const step2Schema = z.object({
  churchName: z.string().min(1, 'Church name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  timezone: z.string().default('America/New_York'),
  currency: z.string().default('USD'),
})

const step3Schema = z.object({
  primaryColor: z.string().default('#2563EB'),
  tagline: z.string().optional(),
})

const step4Schema = z.object({
  emailProvider: z.enum(['none', 'smtp', 'sendgrid']).default('none'),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  sendgridApiKey: z.string().optional(),
  fromEmail: z.string().optional(),
  fromName: z.string().optional(),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>
type Step4Data = z.infer<typeof step4Schema>

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
]

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
]

function SetupWizardPage() {
  const navigate = useNavigate()
  const { setUser, setToken } = useAuth()
  const { resolvedTheme } = useTheme()
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const { data: status, isLoading: statusLoading } = useSetupStatus()
  const { data: summary } = useSetupSummary()
  const step1Mutation = useSetupStep1()
  const step2Mutation = useSetupStep2()
  const step3Mutation = useSetupStep3()
  const step4Mutation = useSetupStep4()
  const completeMutation = useCompleteSetup()

  // Choose logo based on theme
  const logoSrc = resolvedTheme === 'dark' ? '/steward-mark-light.svg' : '/steward-mark.svg'

  // Redirect if setup is already complete
  useEffect(() => {
    if (status && !status.needsSetup) {
      navigate('/login')
    }
  }, [status, navigate])

  // Step 1 Form
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
    },
  })

  // Step 2 Form
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      churchName: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      website: '',
      timezone: 'America/New_York',
      currency: 'USD',
    },
  })

  // Step 3 Form
  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      primaryColor: '#2563EB',
      tagline: '',
    },
  })

  // Step 4 Form
  const step4Form = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      emailProvider: 'none',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      sendgridApiKey: '',
      fromEmail: '',
      fromName: '',
    },
  })

  const emailProvider = step4Form.watch('emailProvider')

  const handleStep1Submit = async (data: Step1Data) => {
    setError(null)
    try {
      const result = await step1Mutation.mutateAsync({
        email: data.email,
        password: data.password,
        name: data.name,
      })
      // Store token and user
      setToken(result.token)
      setUser(result.user)
      setCurrentStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin account')
    }
  }

  const handleStep2Submit = async (data: Step2Data) => {
    setError(null)
    try {
      await step2Mutation.mutateAsync(data)
      setCurrentStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save church profile')
    }
  }

  const handleStep3Submit = async (data: Step3Data) => {
    setError(null)
    try {
      await step3Mutation.mutateAsync(data)
      setCurrentStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branding')
    }
  }

  const handleStep4Submit = async (data: Step4Data) => {
    setError(null)
    try {
      await step4Mutation.mutateAsync(data)
      setCurrentStep(5)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save email settings')
    }
  }

  const handleComplete = async () => {
    setError(null)
    try {
      await completeMutation.mutateAsync()
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup')
    }
  }

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--st-bg)]">
        <div className="text-[var(--st-muted)]">Loading...</div>
      </div>
    )
  }

  const steps = [
    { number: 1, title: 'Admin Account' },
    { number: 2, title: 'Church Profile' },
    { number: 3, title: 'Branding' },
    { number: 4, title: 'Email Setup' },
    { number: 5, title: 'Review' },
  ]

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

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <div className="mb-8 text-center">
            <img src={logoSrc} alt="Steward" className="mx-auto h-16 w-16 mb-4" />
            <h1 className="text-2xl font-bold text-[var(--st-fg)]">
              Steward <span className="text-[var(--st-muted)]">·</span> ChMS Setup
            </h1>
            <p className="mt-1 text-sm text-[var(--st-muted)]">
              Let's get your church management system ready
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className={`flex flex-col items-center ${
                    step.number <= currentStep ? 'text-[var(--st-primary)]' : 'text-[var(--st-muted)]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      step.number < currentStep
                        ? 'bg-[var(--st-success)] text-white'
                        : step.number === currentStep
                        ? 'bg-[var(--st-primary)] text-white'
                        : 'bg-[var(--st-surfaceMuted)] text-[var(--st-muted)]'
                    }`}
                  >
                    {step.number < currentStep ? '✓' : step.number}
                  </div>
                  <span className="mt-2 text-xs hidden sm:block">{step.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 rounded-lg border border-[var(--st-danger)]/50 bg-[var(--st-danger)]/10 p-4">
              <p className="text-sm text-[var(--st-danger)]">{error}</p>
            </div>
          )}

          {/* Form Container */}
          <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-8 backdrop-blur-sm">
            {/* Step 1: Admin Account */}
            {currentStep === 1 && (
              <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-4">
                <h2 className="text-xl font-semibold text-[var(--st-fg)] mb-6">Create Admin Account</h2>
                
                <div>
                  <Label htmlFor="name" className="text-[var(--st-mutedFg)]">Full Name</Label>
                  <Input
                    {...step1Form.register('name')}
                    id="name"
                    className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                    placeholder="John Smith"
                  />
                  {step1Form.formState.errors.name && (
                    <p className="mt-1 text-sm text-[var(--st-danger)]">{step1Form.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="text-[var(--st-mutedFg)]">Email Address</Label>
                  <Input
                    {...step1Form.register('email')}
                    id="email"
                    type="email"
                    className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                    placeholder="admin@yourchurch.org"
                  />
                  {step1Form.formState.errors.email && (
                    <p className="mt-1 text-sm text-[var(--st-danger)]">{step1Form.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-[var(--st-mutedFg)]">Password</Label>
                  <Input
                    {...step1Form.register('password')}
                    id="password"
                    type="password"
                    className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                    placeholder="At least 12 characters"
                  />
                  {step1Form.formState.errors.password && (
                    <p className="mt-1 text-sm text-[var(--st-danger)]">{step1Form.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-[var(--st-mutedFg)]">Confirm Password</Label>
                  <Input
                    {...step1Form.register('confirmPassword')}
                    id="confirmPassword"
                    type="password"
                    className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                    placeholder="Confirm your password"
                  />
                  {step1Form.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-[var(--st-danger)]">{step1Form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={step1Mutation.isPending}
                  className="w-full bg-[var(--st-primary)] hover:opacity-90 text-white"
                >
                  {step1Mutation.isPending ? 'Creating Account...' : 'Continue'}
                </Button>
              </form>
            )}

            {/* Step 2: Church Profile */}
            {currentStep === 2 && (
              <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-4">
                <h2 className="text-xl font-semibold text-[var(--st-fg)] mb-6">Church Profile</h2>
                
                <div>
                  <Label htmlFor="churchName" className="text-[var(--st-mutedFg)]">Church Name *</Label>
                  <Input
                    {...step2Form.register('churchName')}
                    id="churchName"
                    className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                    placeholder="First Baptist Church"
                  />
                  {step2Form.formState.errors.churchName && (
                    <p className="mt-1 text-sm text-[var(--st-danger)]">{step2Form.formState.errors.churchName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="address" className="text-[var(--st-mutedFg)]">Address</Label>
                    <Input
                      {...step2Form.register('address')}
                      id="address"
                      className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                      placeholder="123 Main St"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-[var(--st-mutedFg)]">City</Label>
                    <Input
                      {...step2Form.register('city')}
                      id="city"
                      className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                      placeholder="Springfield"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="state" className="text-[var(--st-mutedFg)]">State</Label>
                    <Input
                      {...step2Form.register('state')}
                      id="state"
                      className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                      placeholder="MO"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip" className="text-[var(--st-mutedFg)]">ZIP</Label>
                    <Input
                      {...step2Form.register('zip')}
                      id="zip"
                      className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                      placeholder="65802"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-[var(--st-mutedFg)]">Phone</Label>
                    <Input
                      {...step2Form.register('phone')}
                      id="phone"
                      className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website" className="text-[var(--st-mutedFg)]">Website</Label>
                  <Input
                    {...step2Form.register('website')}
                    id="website"
                    className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                    placeholder="https://yourchurch.org"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timezone" className="text-[var(--st-mutedFg)]">Timezone</Label>
                    <Select
                      value={step2Form.watch('timezone')}
                      onValueChange={(value) => step2Form.setValue('timezone', value)}
                    >
                      <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currency" className="text-[var(--st-mutedFg)]">Currency</Label>
                    <Select
                      value={step2Form.watch('currency')}
                      onValueChange={(value) => step2Form.setValue('currency', value)}
                    >
                      <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 border-[var(--st-border)] text-[var(--st-mutedFg)]"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={step2Mutation.isPending}
                    className="flex-1 bg-[var(--st-primary)] hover:opacity-90 text-white"
                  >
                    {step2Mutation.isPending ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Branding */}
            {currentStep === 3 && (
              <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-4">
                <h2 className="text-xl font-semibold text-[var(--st-fg)] mb-6">Branding</h2>
                
                <div>
                  <Label htmlFor="primaryColor" className="text-[var(--st-mutedFg)]">Primary Color</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      {...step3Form.register('primaryColor')}
                      id="primaryColor"
                      type="color"
                      className="w-16 h-10 p-1 bg-[var(--st-surface)] border-[var(--st-border)]"
                    />
                    <Input
                      value={step3Form.watch('primaryColor')}
                      onChange={(e) => step3Form.setValue('primaryColor', e.target.value)}
                      className="flex-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                      placeholder="#2563EB"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="tagline" className="text-[var(--st-mutedFg)]">Tagline / Slogan</Label>
                  <Input
                    {...step3Form.register('tagline')}
                    id="tagline"
                    className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                    placeholder="A place to belong"
                  />
                </div>

                <div className="p-4 rounded-lg bg-[var(--st-surfaceMuted)]">
                  <p className="text-sm text-[var(--st-muted)]">
                    Logo and favicon upload will be available in the Admin Settings after setup is complete.
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 border-[var(--st-border)] text-[var(--st-mutedFg)]"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={step3Mutation.isPending}
                    className="flex-1 bg-[var(--st-primary)] hover:opacity-90 text-white"
                  >
                    {step3Mutation.isPending ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 4: Email Setup */}
            {currentStep === 4 && (
              <form onSubmit={step4Form.handleSubmit(handleStep4Submit)} className="space-y-4">
                <h2 className="text-xl font-semibold text-[var(--st-fg)] mb-6">Email Setup (Optional)</h2>
                
                <div>
                  <Label htmlFor="emailProvider" className="text-[var(--st-mutedFg)]">Email Provider</Label>
                  <Select
                    value={emailProvider}
                    onValueChange={(value: 'none' | 'smtp' | 'sendgrid') => step4Form.setValue('emailProvider', value)}
                  >
                    <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Skip for now)</SelectItem>
                      <SelectItem value="smtp">SMTP Server</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {emailProvider === 'smtp' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpHost" className="text-[var(--st-mutedFg)]">SMTP Host</Label>
                        <Input
                          {...step4Form.register('smtpHost')}
                          id="smtpHost"
                          className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                          placeholder="smtp.example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpPort" className="text-[var(--st-mutedFg)]">Port</Label>
                        <Input
                          {...step4Form.register('smtpPort')}
                          id="smtpPort"
                          type="number"
                          className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                          placeholder="587"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpUser" className="text-[var(--st-mutedFg)]">Username</Label>
                        <Input
                          {...step4Form.register('smtpUser')}
                          id="smtpUser"
                          className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpPassword" className="text-[var(--st-mutedFg)]">Password</Label>
                        <Input
                          {...step4Form.register('smtpPassword')}
                          id="smtpPassword"
                          type="password"
                          className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                        />
                      </div>
                    </div>
                  </>
                )}

                {emailProvider === 'sendgrid' && (
                  <div>
                    <Label htmlFor="sendgridApiKey" className="text-[var(--st-mutedFg)]">SendGrid API Key</Label>
                    <Input
                      {...step4Form.register('sendgridApiKey')}
                      id="sendgridApiKey"
                      type="password"
                      className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                      placeholder="SG.xxxxxxxxx"
                    />
                  </div>
                )}

                {emailProvider !== 'none' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fromEmail" className="text-[var(--st-mutedFg)]">From Email</Label>
                      <Input
                        {...step4Form.register('fromEmail')}
                        id="fromEmail"
                        type="email"
                        className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                        placeholder="noreply@yourchurch.org"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fromName" className="text-[var(--st-mutedFg)]">From Name</Label>
                      <Input
                        {...step4Form.register('fromName')}
                        id="fromName"
                        className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                        placeholder="Your Church Name"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 border-[var(--st-border)] text-[var(--st-mutedFg)]"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={step4Mutation.isPending}
                    className="flex-1 bg-[var(--st-primary)] hover:opacity-90 text-white"
                  >
                    {step4Mutation.isPending ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-[var(--st-fg)] mb-6">Review & Complete</h2>
                
                {summary && (
                  <div className="space-y-4">
                    {summary.church && (
                      <div className="p-4 rounded-lg bg-[var(--st-surfaceMuted)]">
                        <h3 className="font-medium text-[var(--st-fg)] mb-2">Church Profile</h3>
                        <dl className="text-sm text-[var(--st-muted)] space-y-1">
                          <div className="flex justify-between">
                            <dt>Name:</dt>
                            <dd className="text-[var(--st-fg)]">{String(summary.church.name || '-')}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Location:</dt>
                            <dd className="text-[var(--st-fg)]">
                              {[summary.church.city, summary.church.state].filter(Boolean).join(', ') || '-'}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Timezone:</dt>
                            <dd className="text-[var(--st-fg)]">{String(summary.church.timezone || '-')}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Currency:</dt>
                            <dd className="text-[var(--st-fg)]">{String(summary.church.currency || '-')}</dd>
                          </div>
                        </dl>
                      </div>
                    )}

                    {summary.branding && (
                      <div className="p-4 rounded-lg bg-[var(--st-surfaceMuted)]">
                        <h3 className="font-medium text-[var(--st-fg)] mb-2">Branding</h3>
                        <dl className="text-sm text-[var(--st-muted)] space-y-1">
                          <div className="flex justify-between items-center">
                            <dt>Primary Color:</dt>
                            <dd className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded"
                                style={{ backgroundColor: String(summary.branding.primary_color) }}
                              />
                              <span className="text-[var(--st-fg)]">{String(summary.branding.primary_color)}</span>
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Tagline:</dt>
                            <dd className="text-[var(--st-fg)]">{String(summary.branding.tagline || '-')}</dd>
                          </div>
                        </dl>
                      </div>
                    )}

                    {summary.email && (
                      <div className="p-4 rounded-lg bg-[var(--st-surfaceMuted)]">
                        <h3 className="font-medium text-[var(--st-fg)] mb-2">Email</h3>
                        <dl className="text-sm text-[var(--st-muted)] space-y-1">
                          <div className="flex justify-between">
                            <dt>Provider:</dt>
                            <dd className="text-[var(--st-fg)] capitalize">{String(summary.email.provider || 'None')}</dd>
                          </div>
                          {summary.email.provider !== 'none' && (
                            <div className="flex justify-between">
                              <dt>From:</dt>
                              <dd className="text-[var(--st-fg)]">{String(summary.email.from_email || '-')}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4 rounded-lg bg-[var(--st-success)]/10 border border-[var(--st-success)]/30">
                  <p className="text-sm text-[var(--st-success)]">
                    You're all set! Click "Complete Setup" to finish and start using StewardChMS.
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(4)}
                    className="flex-1 border-[var(--st-border)] text-[var(--st-mutedFg)]"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                    className="flex-1 bg-[var(--st-success)] hover:opacity-90 text-white"
                  >
                    {completeMutation.isPending ? 'Completing...' : 'Complete Setup'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-[var(--st-muted)]">
            Part of the Steward Ecosystem
          </p>
        </div>
      </div>
    </div>
  )
}

export default SetupWizardPage
