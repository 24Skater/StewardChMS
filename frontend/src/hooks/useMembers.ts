import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  importMembers,
  MemberSearchParams,
  MemberListResponse,
  Member,
  CreateMemberData,
  CsvImportResult,
  ApiClientError,
} from '@/lib/api'

// ============================================
// Query Keys
// ============================================

export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (params: MemberSearchParams) => [...memberKeys.lists(), params] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
}

// ============================================
// useMembers - List with search/filter
// ============================================

export function useMembers(params: MemberSearchParams = {}) {
  return useQuery<MemberListResponse, ApiClientError>({
    queryKey: memberKeys.list(params),
    queryFn: () => getMembers(params),
  })
}

// ============================================
// useMember - Single member
// ============================================

export function useMember(id: string) {
  return useQuery<Member, ApiClientError>({
    queryKey: memberKeys.detail(id),
    queryFn: () => getMember(id),
    enabled: !!id,
  })
}

// ============================================
// useCreateMember
// ============================================

export function useCreateMember() {
  const queryClient = useQueryClient()

  return useMutation<Member, ApiClientError, CreateMemberData>({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
    },
  })
}

// ============================================
// useUpdateMember
// ============================================

export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation<Member, ApiClientError, { id: string; data: Partial<CreateMemberData> }>({
    mutationFn: ({ id, data }) => updateMember(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
    },
  })
}

// ============================================
// useDeleteMember
// ============================================

export function useDeleteMember() {
  const queryClient = useQueryClient()

  return useMutation<{ message: string }, ApiClientError, string>({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
    },
  })
}

// ============================================
// useImportMembers
// ============================================

export function useImportMembers() {
  const queryClient = useQueryClient()

  return useMutation<CsvImportResult, ApiClientError, Array<Record<string, string>>>({
    mutationFn: importMembers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
    },
  })
}

