import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'

interface GroupMember {
  id: string
  joinedAt: string
  member: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
  }
}

interface GroupLeader {
  id: string
  role: string
  member: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
  }
}

interface Group {
  id: string
  name: string
  ministryId: string
  description: string | null
  meetingDay: string | null
  meetingTime: string | null
  location: string | null
  capacity: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  ministry?: { id: string; name: string }
  members?: GroupMember[]
  leaders?: GroupLeader[]
  _count?: { members: number; leaders: number }
}

interface CreateGroupPayload {
  name: string
  ministryId: string
  description?: string
  meetingDay?: string
  meetingTime?: string
  location?: string
  capacity?: number
  isActive?: boolean
}

interface UpdateGroupPayload {
  id: string
  name?: string
  description?: string
  meetingDay?: string
  meetingTime?: string
  location?: string
  capacity?: number
  isActive?: boolean
}

interface GroupsFilter {
  ministryId?: string
  isActive?: boolean
}

async function fetchGroups(filter?: GroupsFilter): Promise<Group[]> {
  const params = new URLSearchParams()
  if (filter?.ministryId) params.append('ministryId', filter.ministryId)
  if (filter?.isActive !== undefined) params.append('isActive', String(filter.isActive))
  
  const query = params.toString()
  return apiRequest<Group[]>(`/groups${query ? `?${query}` : ''}`)
}

async function fetchGroup(id: string): Promise<Group> {
  return apiRequest<Group>(`/groups/${id}`)
}

async function createGroup(payload: CreateGroupPayload): Promise<Group> {
  return apiRequest<Group>('/groups', {
    method: 'POST',
    body: payload,
  })
}

async function updateGroup(payload: UpdateGroupPayload): Promise<Group> {
  const { id, ...data } = payload
  return apiRequest<Group>(`/groups/${id}`, {
    method: 'PUT',
    body: data,
  })
}

async function deleteGroup(id: string): Promise<void> {
  await apiRequest(`/groups/${id}`, {
    method: 'DELETE',
  })
}

async function addGroupMember(groupId: string, memberId: string): Promise<GroupMember> {
  return apiRequest<GroupMember>(`/groups/${groupId}/members`, {
    method: 'POST',
    body: { memberId },
  })
}

async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  await apiRequest(`/groups/${groupId}/members/${memberId}`, {
    method: 'DELETE',
  })
}

async function addGroupLeader(groupId: string, memberId: string, role?: string): Promise<GroupLeader> {
  return apiRequest<GroupLeader>(`/groups/${groupId}/leaders`, {
    method: 'POST',
    body: { memberId, role: role || 'leader' },
  })
}

async function removeGroupLeader(groupId: string, memberId: string): Promise<void> {
  await apiRequest(`/groups/${groupId}/leaders/${memberId}`, {
    method: 'DELETE',
  })
}

export function useGroups(filter?: GroupsFilter) {
  return useQuery({
    queryKey: ['groups', filter],
    queryFn: () => fetchGroups(filter),
  })
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: () => fetchGroup(id),
    enabled: !!id,
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['ministries'] })
    },
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateGroup,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['groups', data.id] })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['ministries'] })
    },
  })
}

export function useAddGroupMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) =>
      addGroupMember(groupId, memberId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId] })
    },
  })
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) =>
      removeGroupMember(groupId, memberId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId] })
    },
  })
}

export function useAddGroupLeader() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, memberId, role }: { groupId: string; memberId: string; role?: string }) =>
      addGroupLeader(groupId, memberId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId] })
    },
  })
}

export function useRemoveGroupLeader() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) =>
      removeGroupLeader(groupId, memberId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId] })
    },
  })
}

