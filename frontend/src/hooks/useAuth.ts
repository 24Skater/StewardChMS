import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { login, logout, getMe, LoginRequest, LoginResponse, UserSummary, ApiClientError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

// ============================================
// Query Keys
// ============================================

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
}

// ============================================
// useMe Hook
// ============================================

export function useMe() {
  return useQuery<UserSummary, ApiClientError>({
    queryKey: authKeys.me(),
    queryFn: getMe,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// ============================================
// useLogin Hook
// ============================================

export function useLogin() {
  const queryClient = useQueryClient()
  const { setUser } = useAuth()

  return useMutation<LoginResponse, ApiClientError, LoginRequest>({
    mutationFn: login,
    onSuccess: (data) => {
      // Update auth context
      setUser(data.user)
      // Invalidate me query to refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.me() })
    },
  })
}

// ============================================
// useLogout Hook
// ============================================

export function useLogout() {
  const queryClient = useQueryClient()
  const { logout: clearAuth } = useAuth()

  return useMutation<void, ApiClientError>({
    mutationFn: logout,
    onSuccess: () => {
      // Clear auth context
      clearAuth()
      // Clear all queries
      queryClient.clear()
    },
    onError: () => {
      // Even on error, clear local state
      clearAuth()
      queryClient.clear()
    },
  })
}

