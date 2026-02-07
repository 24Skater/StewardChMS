import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const API_BASE = '/api'

interface SetupStatus {
  needsSetup: boolean
  hasUsers: boolean
  isComplete: boolean
}

interface SetupStep1Data {
  email: string
  password: string
  name: string
}

interface SetupStep2Data {
  churchName: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  website?: string
  timezone?: string
  currency?: string
}

interface SetupStep3Data {
  logoUrl?: string
  faviconUrl?: string
  primaryColor?: string
  tagline?: string
}

interface SetupStep4Data {
  emailProvider: 'none' | 'smtp' | 'sendgrid'
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPassword?: string
  sendgridApiKey?: string
  fromEmail?: string
  fromName?: string
}

interface SetupStep1Response {
  success: boolean
  token: string
  expiresAt: string
  user: {
    id: string
    email: string
    name: string
    roles: string[]
    permissions: string[]
  }
}

interface SetupStepResponse {
  success: boolean
  message?: string
}

interface SetupSummary {
  church?: Record<string, unknown>
  branding?: Record<string, unknown>
  email?: Record<string, unknown>
}

async function fetchSetupStatus(): Promise<SetupStatus> {
  const res = await fetch(`${API_BASE}/setup/status`)
  if (!res.ok) {
    throw new Error('Failed to check setup status')
  }
  return res.json()
}

async function submitStep1(data: SetupStep1Data): Promise<SetupStep1Response> {
  const res = await fetch(`${API_BASE}/setup/step1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create admin account')
  }
  return res.json()
}

async function submitStep2(data: SetupStep2Data): Promise<SetupStepResponse> {
  const res = await fetch(`${API_BASE}/setup/step2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to save church profile')
  }
  return res.json()
}

async function submitStep3(data: SetupStep3Data): Promise<SetupStepResponse> {
  const res = await fetch(`${API_BASE}/setup/step3`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to save branding')
  }
  return res.json()
}

async function submitStep4(data: SetupStep4Data): Promise<SetupStepResponse> {
  const res = await fetch(`${API_BASE}/setup/step4`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to save email settings')
  }
  return res.json()
}

async function completeSetup(): Promise<SetupStepResponse> {
  const res = await fetch(`${API_BASE}/setup/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to complete setup')
  }
  return res.json()
}

async function fetchSetupSummary(): Promise<SetupSummary> {
  const res = await fetch(`${API_BASE}/setup/summary`, {
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error('Failed to fetch setup summary')
  }
  return res.json()
}

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setup', 'status'],
    queryFn: fetchSetupStatus,
    retry: 1,
  })
}

export function useSetupStep1() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitStep1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup'] })
    },
  })
}

export function useSetupStep2() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitStep2,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup'] })
    },
  })
}

export function useSetupStep3() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitStep3,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup'] })
    },
  })
}

export function useSetupStep4() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitStep4,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup'] })
    },
  })
}

export function useCompleteSetup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: completeSetup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup'] })
    },
  })
}

export function useSetupSummary() {
  return useQuery({
    queryKey: ['setup', 'summary'],
    queryFn: fetchSetupSummary,
  })
}

