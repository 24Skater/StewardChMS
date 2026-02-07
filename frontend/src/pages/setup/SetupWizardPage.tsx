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
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const { data: status, isLoading: statusLoading } = useSetupStatus()
  const { data: summary } = useSetupSummary()
  const step1Mutation = useSetupStep1()
  const step2Mutation = useSetupStep2()
  const step3Mutation = useSetupStep3()
  const step4Mutation = useSetupStep4()
  const completeMutation = useCompleteSetup()

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
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <div className="text-[#94A3B8]">Loading...</div>
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
    <div className="min-h-screen bg-[#0F172A]">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#2563EB]/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-[#16A34A]/10 blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <div className="mb-8 text-center">
            <img src="/steward-mark-light.svg" alt="Steward" className="mx-auto h-16 w-16 mb-4" />
            <h1 className="text-2xl font-bold text-white">
              Steward <span className="text-[#64748B]">·</span> ChMS Setup
            </h1>
            <p className="mt-1 text-sm text-[#94A3B8]">
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
                    step.number <= currentStep ? 'text-[#2563EB]' : 'text-[#64748B]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      step.number < currentStep
                        ? 'bg-[#16A34A] text-white'
                        : step.number === currentStep
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-[#334155] text-[#64748B]'
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
            <div className="mb-6 rounded-lg border border-[#DC2626]/50 bg-[#DC2626]/10 p-4">
              <p className="text-sm text-[#DC2626]">{error}</p>
            </div>
          )}

          {/* Form Container */}
          <div className="rounded-xl border border-[#334155] bg-[#1E293B]/50 p-8 backdrop-blur-sm">
            {/* Step 1: Admin Account */}
            {currentStep === 1 && (
              <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-6">Create Admin Account</h2>
                
                <div>
                  <Label htmlFor="name" className="text-[#CBD5E1]">Full Name</Label>
                  <Input
                    {...step1Form.register('name')}
                    id="name"
                    className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                    placeholder="John Smith"
                  />
                  {step1Form.formState.errors.name && (
                    <p className="mt-1 text-sm text-[#DC2626]">{step1Form.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="text-[#CBD5E1]">Email Address</Label>
                  <Input
                    {...step1Form.register('email')}
                    id="email"
                    type="email"
                    className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                    placeholder="admin@yourchurch.org"
                  />
                  {step1Form.formState.errors.email && (
                    <p className="mt-1 text-sm text-[#DC2626]">{step1Form.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-[#CBD5E1]">Password</Label>
                  <Input
                    {...step1Form.register('password')}
                    id="password"
                    type="password"
                    className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                    placeholder="At least 12 characters"
                  />
                  {step1Form.formState.errors.password && (
                    <p className="mt-1 text-sm text-[#DC2626]">{step1Form.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-[#CBD5E1]">Confirm Password</Label>
                  <Input
                    {...step1Form.register('confirmPassword')}
                    id="confirmPassword"
                    type="password"
                    className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                    placeholder="Confirm your password"
                  />
                  {step1Form.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-[#DC2626]">{step1Form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={step1Mutation.isPending}
                  className="w-full bg-[#2563EB] hover:bg-[#3B82F6] text-white"
                >
                  {step1Mutation.isPending ? 'Creating Account...' : 'Continue'}
                </Button>
              </form>
            )}

            {/* Step 2: Church Profile */}
            {currentStep === 2 && (
              <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-6">Church Profile</h2>
                
                <div>
                  <Label htmlFor="churchName" className="text-[#CBD5E1]">Church Name *</Label>
                  <Input
                    {...step2Form.register('churchName')}
                    id="churchName"
                    className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                    placeholder="First Baptist Church"
                  />
                  {step2Form.formState.errors.churchName && (
                    <p className="mt-1 text-sm text-[#DC2626]">{step2Form.formState.errors.churchName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="address" className="text-[#CBD5E1]">Address</Label>
                    <Input
                      {...step2Form.register('address')}
                      id="address"
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      placeholder="123 Main St"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-[#CBD5E1]">City</Label>
                    <Input
                      {...step2Form.register('city')}
                      id="city"
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      placeholder="Springfield"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="state" className="text-[#CBD5E1]">State</Label>
                    <Input
                      {...step2Form.register('state')}
                      id="state"
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      placeholder="MO"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip" className="text-[#CBD5E1]">ZIP</Label>
                    <Input
                      {...step2Form.register('zip')}
                      id="zip"
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      placeholder="65802"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-[#CBD5E1]">Phone</Label>
                    <Input
                      {...step2Form.register('phone')}
                      id="phone"
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website" className="text-[#CBD5E1]">Website</Label>
                  <Input
                    {...step2Form.register('website')}
                    id="website"
                    className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                    placeholder="https://yourchurch.org"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timezone" className="text-[#CBD5E1]">Timezone</Label>
                    <Select
                      value={step2Form.watch('timezone')}
                      onValueChange={(value) => step2Form.setValue('timezone', value)}
                    >
                      <SelectTrigger className="mt-1 bg-[#1E293B] border-[#334155] text-white">
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
                    <Label htmlFor="currency" className="text-[#CBD5E1]">Currency</Label>
                    <Select
                      value={step2Form.watch('currency')}
                      onValueChange={(value) => step2Form.setValue('currency', value)}
                    >
                      <SelectTrigger className="mt-1 bg-[#1E293B] border-[#334155] text-white">
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
                    className="flex-1 border-[#334155] text-[#CBD5E1]"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={step2Mutation.isPending}
                    className="flex-1 bg-[#2563EB] hover:bg-[#3B82F6] text-white"
                  >
                    {step2Mutation.isPending ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Branding */}
            {currentStep === 3 && (
              <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-6">Branding</h2>
                
                <div>
                  <Label htmlFor="primaryColor" className="text-[#CBD5E1]">Primary Color</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      {...step3Form.register('primaryColor')}
                      id="primaryColor"
                      type="color"
                      className="w-16 h-10 p-1 bg-[#1E293B] border-[#334155]"
                    />
                    <Input
                      value={step3Form.watch('primaryColor')}
                      onChange={(e) => step3Form.setValue('primaryColor', e.target.value)}
                      className="flex-1 bg-[#1E293B] border-[#334155] text-white"
                      placeholder="#2563EB"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="tagline" className="text-[#CBD5E1]">Tagline / Slogan</Label>
                  <Input
                    {...step3Form.register('tagline')}
                    id="tagline"
                    className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                    placeholder="A place to belong"
                  />
                </div>

                <div className="p-4 rounded-lg bg-[#334155]/30">
                  <p className="text-sm text-[#94A3B8]">
                    Logo and favicon upload will be available in the Admin Settings after setup is complete.
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 border-[#334155] text-[#CBD5E1]"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={step3Mutation.isPending}
                    className="flex-1 bg-[#2563EB] hover:bg-[#3B82F6] text-white"
                  >
                    {step3Mutation.isPending ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 4: Email Setup */}
            {currentStep === 4 && (
              <form onSubmit={step4Form.handleSubmit(handleStep4Submit)} className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-6">Email Setup (Optional)</h2>
                
                <div>
                  <Label htmlFor="emailProvider" className="text-[#CBD5E1]">Email Provider</Label>
                  <Select
                    value={emailProvider}
                    onValueChange={(value: 'none' | 'smtp' | 'sendgrid') => step4Form.setValue('emailProvider', value)}
                  >
                    <SelectTrigger className="mt-1 bg-[#1E293B] border-[#334155] text-white">
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
                        <Label htmlFor="smtpHost" className="text-[#CBD5E1]">SMTP Host</Label>
                        <Input
                          {...step4Form.register('smtpHost')}
                          id="smtpHost"
                          className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                          placeholder="smtp.example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpPort" className="text-[#CBD5E1]">Port</Label>
                        <Input
                          {...step4Form.register('smtpPort')}
                          id="smtpPort"
                          type="number"
                          className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                          placeholder="587"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpUser" className="text-[#CBD5E1]">Username</Label>
                        <Input
                          {...step4Form.register('smtpUser')}
                          id="smtpUser"
                          className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpPassword" className="text-[#CBD5E1]">Password</Label>
                        <Input
                          {...step4Form.register('smtpPassword')}
                          id="smtpPassword"
                          type="password"
                          className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                        />
                      </div>
                    </div>
                  </>
                )}

                {emailProvider === 'sendgrid' && (
                  <div>
                    <Label htmlFor="sendgridApiKey" className="text-[#CBD5E1]">SendGrid API Key</Label>
                    <Input
                      {...step4Form.register('sendgridApiKey')}
                      id="sendgridApiKey"
                      type="password"
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      placeholder="SG.xxxxxxxxx"
                    />
                  </div>
                )}

                {emailProvider !== 'none' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fromEmail" className="text-[#CBD5E1]">From Email</Label>
                      <Input
                        {...step4Form.register('fromEmail')}
                        id="fromEmail"
                        type="email"
                        className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                        placeholder="noreply@yourchurch.org"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fromName" className="text-[#CBD5E1]">From Name</Label>
                      <Input
                        {...step4Form.register('fromName')}
                        id="fromName"
                        className="mt-1 bg-[#1E293B] border-[#334155] text-white"
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
                    className="flex-1 border-[#334155] text-[#CBD5E1]"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={step4Mutation.isPending}
                    className="flex-1 bg-[#2563EB] hover:bg-[#3B82F6] text-white"
                  >
                    {step4Mutation.isPending ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6">Review & Complete</h2>
                
                {summary && (
                  <div className="space-y-4">
                    {summary.church && (
                      <div className="p-4 rounded-lg bg-[#334155]/30">
                        <h3 className="font-medium text-white mb-2">Church Profile</h3>
                        <dl className="text-sm text-[#94A3B8] space-y-1">
                          <div className="flex justify-between">
                            <dt>Name:</dt>
                            <dd className="text-white">{String(summary.church.name || '-')}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Location:</dt>
                            <dd className="text-white">
                              {[summary.church.city, summary.church.state].filter(Boolean).join(', ') || '-'}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Timezone:</dt>
                            <dd className="text-white">{String(summary.church.timezone || '-')}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Currency:</dt>
                            <dd className="text-white">{String(summary.church.currency || '-')}</dd>
                          </div>
                        </dl>
                      </div>
                    )}

                    {summary.branding && (
                      <div className="p-4 rounded-lg bg-[#334155]/30">
                        <h3 className="font-medium text-white mb-2">Branding</h3>
                        <dl className="text-sm text-[#94A3B8] space-y-1">
                          <div className="flex justify-between items-center">
                            <dt>Primary Color:</dt>
                            <dd className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded"
                                style={{ backgroundColor: String(summary.branding.primary_color) }}
                              />
                              <span className="text-white">{String(summary.branding.primary_color)}</span>
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Tagline:</dt>
                            <dd className="text-white">{String(summary.branding.tagline || '-')}</dd>
                          </div>
                        </dl>
                      </div>
                    )}

                    {summary.email && (
                      <div className="p-4 rounded-lg bg-[#334155]/30">
                        <h3 className="font-medium text-white mb-2">Email</h3>
                        <dl className="text-sm text-[#94A3B8] space-y-1">
                          <div className="flex justify-between">
                            <dt>Provider:</dt>
                            <dd className="text-white capitalize">{String(summary.email.provider || 'None')}</dd>
                          </div>
                          {summary.email.provider !== 'none' && (
                            <div className="flex justify-between">
                              <dt>From:</dt>
                              <dd className="text-white">{String(summary.email.from_email || '-')}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4 rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/30">
                  <p className="text-sm text-[#16A34A]">
                    You're all set! Click "Complete Setup" to finish and start using StewardChMS.
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(4)}
                    className="flex-1 border-[#334155] text-[#CBD5E1]"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                    className="flex-1 bg-[#16A34A] hover:bg-[#22C55E] text-white"
                  >
                    {completeMutation.isPending ? 'Completing...' : 'Complete Setup'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-[#475569]">
            Part of the Steward Ecosystem
          </p>
        </div>
      </div>
    </div>
  )
}

export default SetupWizardPage

