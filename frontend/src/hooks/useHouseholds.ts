import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getHouseholds,
  getHousehold,
  createHousehold,
  updateHousehold,
  deleteHousehold,
  linkMemberToHousehold,
  unlinkMemberFromHousehold,
  HouseholdListResponse,
  Household,
  HouseholdMember,
  RelationshipType,
  ApiClientError,
} from '@/lib/api'
import { memberKeys } from './useMembers'

// ============================================
// Query Keys
// ============================================

export const householdKeys = {
  all: ['households'] as const,
  lists: () => [...householdKeys.all, 'list'] as const,
  details: () => [...householdKeys.all, 'detail'] as const,
  detail: (id: string) => [...householdKeys.details(), id] as const,
}

// ============================================
// useHouseholds - List all
// ============================================

export function useHouseholds() {
  return useQuery<HouseholdListResponse, ApiClientError>({
    queryKey: householdKeys.lists(),
    queryFn: getHouseholds,
  })
}

// ============================================
// useHousehold - Single household
// ============================================

export function useHousehold(id: string) {
  return useQuery<Household, ApiClientError>({
    queryKey: householdKeys.detail(id),
    queryFn: () => getHousehold(id),
    enabled: !!id,
  })
}

// ============================================
// useCreateHousehold
// ============================================

export function useCreateHousehold() {
  const queryClient = useQueryClient()

  return useMutation<Household, ApiClientError, { name?: string | null }>({
    mutationFn: createHousehold,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdKeys.lists() })
    },
  })
}

// ============================================
// useUpdateHousehold
// ============================================

export function useUpdateHousehold() {
  const queryClient = useQueryClient()

  return useMutation<Household, ApiClientError, { id: string; data: { name?: string | null } }>({
    mutationFn: ({ id, data }) => updateHousehold(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: householdKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: householdKeys.lists() })
    },
  })
}

// ============================================
// useDeleteHousehold
// ============================================

export function useDeleteHousehold() {
  const queryClient = useQueryClient()

  return useMutation<{ message: string }, ApiClientError, string>({
    mutationFn: deleteHousehold,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdKeys.lists() })
    },
  })
}

// ============================================
// useLinkMemberToHousehold
// ============================================

export function useLinkMemberToHousehold() {
  const queryClient = useQueryClient()

  return useMutation<
    HouseholdMember,
    ApiClientError,
    { householdId: string; memberId: string; relationshipType: RelationshipType }
  >({
    mutationFn: ({ householdId, memberId, relationshipType }) =>
      linkMemberToHousehold(householdId, memberId, relationshipType),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: householdKeys.detail(householdId) })
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
    },
  })
}

// ============================================
// useUnlinkMemberFromHousehold
// ============================================

export function useUnlinkMemberFromHousehold() {
  const queryClient = useQueryClient()

  return useMutation<{ message: string }, ApiClientError, { householdId: string; memberId: string }>({
    mutationFn: ({ householdId, memberId }) => unlinkMemberFromHousehold(householdId, memberId),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: householdKeys.detail(householdId) })
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
    },
  })
}

