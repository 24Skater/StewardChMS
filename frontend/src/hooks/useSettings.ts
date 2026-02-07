import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'

interface SettingsResponse {
  [category: string]: {
    [key: string]: unknown
  }
}

interface UpdateSettingPayload {
  category: string
  key: string
  value: unknown
}

interface BulkUpdatePayload {
  settings: Array<{
    category: string
    key: string
    value: unknown
  }>
}

interface PublicBrandingResponse {
  logo_url?: string
  favicon_url?: string
  primary_color?: string
  tagline?: string
  church_name?: string
}

async function fetchAllSettings(): Promise<SettingsResponse> {
  return apiRequest<SettingsResponse>('/settings')
}

async function fetchSettingsCategory(category: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/settings/${category}`)
}

async function updateSetting(payload: UpdateSettingPayload): Promise<void> {
  await apiRequest(`/settings/${payload.category}/${payload.key}`, {
    method: 'PUT',
    body: { value: payload.value },
  })
}

async function bulkUpdateSettings(payload: BulkUpdatePayload): Promise<void> {
  await apiRequest('/settings', {
    method: 'PUT',
    body: payload,
  })
}

async function fetchPublicBranding(): Promise<PublicBrandingResponse> {
  const res = await fetch('/api/settings/public/branding')
  if (!res.ok) {
    throw new Error('Failed to fetch branding')
  }
  return res.json()
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: fetchAllSettings,
  })
}

export function useSettingsCategory(category: string) {
  return useQuery({
    queryKey: ['settings', category],
    queryFn: () => fetchSettingsCategory(category),
  })
}

export function useUpdateSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useBulkUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bulkUpdateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function usePublicBranding() {
  return useQuery({
    queryKey: ['public', 'branding'],
    queryFn: fetchPublicBranding,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

