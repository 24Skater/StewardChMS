import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettings, useBulkUpdateSettings } from '@/hooks/useSettings'

// Schemas
const churchSettingsSchema = z.object({
  name: z.string().min(1, 'Church name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  timezone: z.string().default('America/New_York'),
  currency: z.string().default('USD'),
})

const brandingSettingsSchema = z.object({
  logo_url: z.string().optional(),
  favicon_url: z.string().optional(),
  primary_color: z.string().default('#2563EB'),
  tagline: z.string().optional(),
})

const emailSettingsSchema = z.object({
  provider: z.enum(['none', 'smtp', 'sendgrid']).default('none'),
  smtp_host: z.string().optional(),
  smtp_port: z.coerce.number().optional(),
  smtp_user: z.string().optional(),
  smtp_password: z.string().optional(),
  sendgrid_api_key: z.string().optional(),
  from_email: z.string().optional(),
  from_name: z.string().optional(),
})

const securitySettingsSchema = z.object({
  session_timeout: z.coerce.number().default(7),
  password_min_length: z.coerce.number().default(12),
  max_login_attempts: z.coerce.number().default(5),
})

type ChurchSettings = z.infer<typeof churchSettingsSchema>
type BrandingSettings = z.infer<typeof brandingSettingsSchema>
type EmailSettings = z.infer<typeof emailSettingsSchema>
type SecuritySettings = z.infer<typeof securitySettingsSchema>

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

function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('church')
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  
  const { data: settings, isLoading } = useSettings()
  const bulkUpdateMutation = useBulkUpdateSettings()

  // Church form
  const churchForm = useForm<ChurchSettings>({
    resolver: zodResolver(churchSettingsSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      website: '',
      timezone: 'America/New_York',
      currency: 'USD',
    },
    values: settings?.church ? {
      name: String(settings.church.name || ''),
      address: String(settings.church.address || ''),
      city: String(settings.church.city || ''),
      state: String(settings.church.state || ''),
      zip: String(settings.church.zip || ''),
      phone: String(settings.church.phone || ''),
      website: String(settings.church.website || ''),
      timezone: String(settings.church.timezone || 'America/New_York'),
      currency: String(settings.church.currency || 'USD'),
    } : undefined,
  })

  // Branding form
  const brandingForm = useForm<BrandingSettings>({
    resolver: zodResolver(brandingSettingsSchema),
    defaultValues: {
      logo_url: '',
      favicon_url: '',
      primary_color: '#2563EB',
      tagline: '',
    },
    values: settings?.branding ? {
      logo_url: String(settings.branding.logo_url || ''),
      favicon_url: String(settings.branding.favicon_url || ''),
      primary_color: String(settings.branding.primary_color || '#2563EB'),
      tagline: String(settings.branding.tagline || ''),
    } : undefined,
  })

  // Email form
  const emailForm = useForm<EmailSettings>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      provider: 'none',
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_password: '',
      sendgrid_api_key: '',
      from_email: '',
      from_name: '',
    },
    values: settings?.email ? {
      provider: (settings.email.provider as 'none' | 'smtp' | 'sendgrid') || 'none',
      smtp_host: String(settings.email.smtp_host || ''),
      smtp_port: Number(settings.email.smtp_port) || 587,
      smtp_user: String(settings.email.smtp_user || ''),
      smtp_password: '',
      sendgrid_api_key: '',
      from_email: String(settings.email.from_email || ''),
      from_name: String(settings.email.from_name || ''),
    } : undefined,
  })

  // Security form
  const securityForm = useForm<SecuritySettings>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      session_timeout: 7,
      password_min_length: 12,
      max_login_attempts: 5,
    },
    values: settings?.security ? {
      session_timeout: Number(settings.security.session_timeout) || 7,
      password_min_length: Number(settings.security.password_min_length) || 12,
      max_login_attempts: Number(settings.security.max_login_attempts) || 5,
    } : undefined,
  })

  const emailProvider = emailForm.watch('provider')

  const handleChurchSave = async (data: ChurchSettings) => {
    setSaveSuccess(null)
    try {
      await bulkUpdateMutation.mutateAsync({
        settings: Object.entries(data).map(([key, value]) => ({
          category: 'church',
          key,
          value,
        })),
      })
      setSaveSuccess('Church settings saved successfully!')
    } catch {
      // Error handled by mutation
    }
  }

  const handleBrandingSave = async (data: BrandingSettings) => {
    setSaveSuccess(null)
    try {
      await bulkUpdateMutation.mutateAsync({
        settings: Object.entries(data).map(([key, value]) => ({
          category: 'branding',
          key,
          value,
        })),
      })
      setSaveSuccess('Branding settings saved successfully!')
    } catch {
      // Error handled by mutation
    }
  }

  const handleEmailSave = async (data: EmailSettings) => {
    setSaveSuccess(null)
    try {
      // Filter out empty password fields to avoid overwriting
      const settingsToUpdate = Object.entries(data)
        .filter(([key, value]) => {
          if (key === 'smtp_password' || key === 'sendgrid_api_key') {
            return value && String(value).length > 0
          }
          return true
        })
        .map(([key, value]) => ({
          category: 'email',
          key,
          value,
        }))

      await bulkUpdateMutation.mutateAsync({ settings: settingsToUpdate })
      setSaveSuccess('Email settings saved successfully!')
    } catch {
      // Error handled by mutation
    }
  }

  const handleSecuritySave = async (data: SecuritySettings) => {
    setSaveSuccess(null)
    try {
      await bulkUpdateMutation.mutateAsync({
        settings: Object.entries(data).map(([key, value]) => ({
          category: 'security',
          key,
          value,
        })),
      })
      setSaveSuccess('Security settings saved successfully!')
    } catch {
      // Error handled by mutation
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-[#94A3B8]">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="border-b border-[#334155] bg-[#1E293B]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-2xl font-bold text-white">Admin Settings</h1>
          <p className="text-sm text-[#94A3B8]">Configure your church management system</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        {saveSuccess && (
          <div className="mb-6 rounded-lg border border-[#16A34A]/50 bg-[#16A34A]/10 p-4">
            <p className="text-sm text-[#16A34A]">{saveSuccess}</p>
          </div>
        )}

        {bulkUpdateMutation.isError && (
          <div className="mb-6 rounded-lg border border-[#DC2626]/50 bg-[#DC2626]/10 p-4">
            <p className="text-sm text-[#DC2626]">Failed to save settings. Please try again.</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-[#1E293B] border border-[#334155]">
            <TabsTrigger value="church" className="data-[state=active]:bg-[#2563EB]">General</TabsTrigger>
            <TabsTrigger value="branding" className="data-[state=active]:bg-[#2563EB]">Branding</TabsTrigger>
            <TabsTrigger value="email" className="data-[state=active]:bg-[#2563EB]">Email</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-[#2563EB]">Security</TabsTrigger>
          </TabsList>

          {/* Church Settings */}
          <TabsContent value="church">
            <Card className="border-[#334155] bg-[#1E293B]/50">
              <CardHeader>
                <CardTitle className="text-white">General Settings</CardTitle>
                <CardDescription className="text-[#94A3B8]">
                  Basic information about your church
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={churchForm.handleSubmit(handleChurchSave)} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-[#CBD5E1]">Church Name *</Label>
                    <Input
                      {...churchForm.register('name')}
                      id="name"
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                    />
                    {churchForm.formState.errors.name && (
                      <p className="mt-1 text-sm text-[#DC2626]">{churchForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="address" className="text-[#CBD5E1]">Address</Label>
                      <Input
                        {...churchForm.register('address')}
                        id="address"
                        className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city" className="text-[#CBD5E1]">City</Label>
                      <Input
                        {...churchForm.register('city')}
                        id="city"
                        className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="state" className="text-[#CBD5E1]">State</Label>
                      <Input
                        {...churchForm.register('state')}
                        id="state"
                        className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip" className="text-[#CBD5E1]">ZIP Code</Label>
                      <Input
                        {...churchForm.register('zip')}
                        id="zip"
                        className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-[#CBD5E1]">Phone</Label>
                      <Input
                        {...churchForm.register('phone')}
                        id="phone"
                        className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website" className="text-[#CBD5E1]">Website</Label>
                    <Input
                      {...churchForm.register('website')}
                      id="website"
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      placeholder="https://yourchurch.org"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="timezone" className="text-[#CBD5E1]">Timezone</Label>
                      <Select
                        value={churchForm.watch('timezone')}
                        onValueChange={(v) => churchForm.setValue('timezone', v)}
                      >
                        <SelectTrigger className="mt-1 bg-[#1E293B] border-[#334155] text-white">
                          <SelectValue />
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
                        value={churchForm.watch('currency')}
                        onValueChange={(v) => churchForm.setValue('currency', v)}
                      >
                        <SelectTrigger className="mt-1 bg-[#1E293B] border-[#334155] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={bulkUpdateMutation.isPending}
                    className="bg-[#2563EB] hover:bg-[#3B82F6] text-white"
                  >
                    {bulkUpdateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Settings */}
          <TabsContent value="branding">
            <Card className="border-[#334155] bg-[#1E293B]/50">
              <CardHeader>
                <CardTitle className="text-white">Branding</CardTitle>
                <CardDescription className="text-[#94A3B8]">
                  Customize the look and feel of your system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={brandingForm.handleSubmit(handleBrandingSave)} className="space-y-4">
                  <div>
                    <Label htmlFor="logo_url" className="text-[#CBD5E1]">Logo URL</Label>
                    <Input
                      {...brandingForm.register('logo_url')}
                      id="logo_url"
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="mt-1 text-xs text-[#64748B]">
                      Enter a URL to your logo image (PNG, SVG recommended)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="favicon_url" className="text-[#CBD5E1]">Favicon URL</Label>
                    <Input
                      {...brandingForm.register('favicon_url')}
                      id="favicon_url"
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      placeholder="https://example.com/favicon.ico"
                    />
                  </div>

                  <div>
                    <Label htmlFor="primary_color" className="text-[#CBD5E1]">Primary Color</Label>
                    <div className="mt-1 flex gap-2">
                      <Input
                        type="color"
                        value={brandingForm.watch('primary_color')}
                        onChange={(e) => brandingForm.setValue('primary_color', e.target.value)}
                        className="w-16 h-10 p-1 bg-[#1E293B] border-[#334155]"
                      />
                      <Input
                        {...brandingForm.register('primary_color')}
                        className="flex-1 bg-[#1E293B] border-[#334155] text-white"
                        placeholder="#2563EB"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tagline" className="text-[#CBD5E1]">Tagline</Label>
                    <Input
                      {...brandingForm.register('tagline')}
                      id="tagline"
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      placeholder="A place to belong"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={bulkUpdateMutation.isPending}
                    className="bg-[#2563EB] hover:bg-[#3B82F6] text-white"
                  >
                    {bulkUpdateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email">
            <Card className="border-[#334155] bg-[#1E293B]/50">
              <CardHeader>
                <CardTitle className="text-white">Email Configuration</CardTitle>
                <CardDescription className="text-[#94A3B8]">
                  Configure email sending for communications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={emailForm.handleSubmit(handleEmailSave)} className="space-y-4">
                  <div>
                    <Label htmlFor="provider" className="text-[#CBD5E1]">Email Provider</Label>
                    <Select
                      value={emailProvider}
                      onValueChange={(v: 'none' | 'smtp' | 'sendgrid') => emailForm.setValue('provider', v)}
                    >
                      <SelectTrigger className="mt-1 bg-[#1E293B] border-[#334155] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Disabled)</SelectItem>
                        <SelectItem value="smtp">SMTP Server</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {emailProvider === 'smtp' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="smtp_host" className="text-[#CBD5E1]">SMTP Host</Label>
                          <Input
                            {...emailForm.register('smtp_host')}
                            id="smtp_host"
                            className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                            placeholder="smtp.example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="smtp_port" className="text-[#CBD5E1]">Port</Label>
                          <Input
                            {...emailForm.register('smtp_port')}
                            id="smtp_port"
                            type="number"
                            className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                            placeholder="587"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="smtp_user" className="text-[#CBD5E1]">Username</Label>
                          <Input
                            {...emailForm.register('smtp_user')}
                            id="smtp_user"
                            className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="smtp_password" className="text-[#CBD5E1]">Password</Label>
                          <Input
                            {...emailForm.register('smtp_password')}
                            id="smtp_password"
                            type="password"
                            className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                            placeholder="Leave blank to keep current"
                          />
                          {!!settings?.email?.smtp_password && (
                            <p className="mt-1 text-xs text-[#64748B]">Password is configured</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {emailProvider === 'sendgrid' && (
                    <div>
                      <Label htmlFor="sendgrid_api_key" className="text-[#CBD5E1]">SendGrid API Key</Label>
                      <Input
                        {...emailForm.register('sendgrid_api_key')}
                        id="sendgrid_api_key"
                        type="password"
                        className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                        placeholder="Leave blank to keep current"
                      />
                      {!!settings?.email?.sendgrid_api_key && (
                        <p className="mt-1 text-xs text-[#64748B]">API key is configured</p>
                      )}
                    </div>
                  )}

                  {emailProvider !== 'none' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="from_email" className="text-[#CBD5E1]">From Email</Label>
                        <Input
                          {...emailForm.register('from_email')}
                          id="from_email"
                          type="email"
                          className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                          placeholder="noreply@yourchurch.org"
                        />
                      </div>
                      <div>
                        <Label htmlFor="from_name" className="text-[#CBD5E1]">From Name</Label>
                        <Input
                          {...emailForm.register('from_name')}
                          id="from_name"
                          className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                          placeholder="Your Church Name"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={bulkUpdateMutation.isPending}
                    className="bg-[#2563EB] hover:bg-[#3B82F6] text-white"
                  >
                    {bulkUpdateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card className="border-[#334155] bg-[#1E293B]/50">
              <CardHeader>
                <CardTitle className="text-white">Security Settings</CardTitle>
                <CardDescription className="text-[#94A3B8]">
                  Configure security policies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={securityForm.handleSubmit(handleSecuritySave)} className="space-y-4">
                  <div>
                    <Label htmlFor="session_timeout" className="text-[#CBD5E1]">Session Timeout (days)</Label>
                    <Input
                      {...securityForm.register('session_timeout')}
                      id="session_timeout"
                      type="number"
                      min={1}
                      max={30}
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                    />
                    <p className="mt-1 text-xs text-[#64748B]">
                      How long before users need to log in again
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="password_min_length" className="text-[#CBD5E1]">Minimum Password Length</Label>
                    <Input
                      {...securityForm.register('password_min_length')}
                      id="password_min_length"
                      type="number"
                      min={8}
                      max={32}
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                    />
                    <p className="mt-1 text-xs text-[#64748B]">
                      Minimum characters required for passwords (recommended: 12)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="max_login_attempts" className="text-[#CBD5E1]">Max Login Attempts</Label>
                    <Input
                      {...securityForm.register('max_login_attempts')}
                      id="max_login_attempts"
                      type="number"
                      min={3}
                      max={10}
                      className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                    />
                    <p className="mt-1 text-xs text-[#64748B]">
                      Number of failed attempts before rate limiting
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={bulkUpdateMutation.isPending}
                    className="bg-[#2563EB] hover:bg-[#3B82F6] text-white"
                  >
                    {bulkUpdateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default AdminSettingsPage

