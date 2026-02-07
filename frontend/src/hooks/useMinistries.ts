import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'

interface Ministry {
  id: string
  name: string
  description: string | null
  parentId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  parent?: { id: string; name: string } | null
  children?: { id: string; name: string }[]
  groups?: { id: string; name: string }[]
  _count?: { groups: number; children: number }
}

interface CreateMinistryPayload {
  name: string
  description?: string
  parentId?: string
  isActive?: boolean
}

interface UpdateMinistryPayload extends Partial<CreateMinistryPayload> {
  id: string
}

async function fetchMinistries(): Promise<Ministry[]> {
  return apiRequest<Ministry[]>('/ministries')
}

async function fetchMinistry(id: string): Promise<Ministry> {
  return apiRequest<Ministry>(`/ministries/${id}`)
}

async function createMinistry(payload: CreateMinistryPayload): Promise<Ministry> {
  return apiRequest<Ministry>('/ministries', {
    method: 'POST',
    body: payload,
  })
}

async function updateMinistry(payload: UpdateMinistryPayload): Promise<Ministry> {
  const { id, ...data } = payload
  return apiRequest<Ministry>(`/ministries/${id}`, {
    method: 'PUT',
    body: data,
  })
}

async function deleteMinistry(id: string): Promise<void> {
  await apiRequest(`/ministries/${id}`, {
    method: 'DELETE',
  })
}

export function useMinistries() {
  return useQuery({
    queryKey: ['ministries'],
    queryFn: fetchMinistries,
  })
}

export function useMinistry(id: string) {
  return useQuery({
    queryKey: ['ministries', id],
    queryFn: () => fetchMinistry(id),
    enabled: !!id,
  })
}

export function useCreateMinistry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createMinistry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ministries'] })
    },
  })
}

export function useUpdateMinistry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateMinistry,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ministries'] })
      queryClient.invalidateQueries({ queryKey: ['ministries', data.id] })
    },
  })
}

export function useDeleteMinistry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMinistry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ministries'] })
    },
  })
}

