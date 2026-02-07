import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'

// ============================================
// Types
// ============================================

export interface Child {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  allergies: string | null
  medicalNotes: string | null
  parentalNotes: string | null
  profilePhotoUrl: string | null
  parents: {
    id: string
    firstName: string
    lastName: string
    phone: string | null
  }[]
}

export interface Occurrence {
  id: string
  startsAt: string
  endsAt: string | null
  event: {
    id: string
    title: string
  }
  _count: {
    checkIns: number
  }
}

export interface CheckIn {
  id: string
  memberId: string
  occurrenceId: string
  checkedInAt: string
  checkedOutAt: string | null
  member: {
    id: string
    firstName: string
    lastName: string
    securityCode: string | null
    allergies: string | null
    medicalNotes: string | null
  }
  occurrence: {
    id: string
    startTime: string
    endTime: string
    event: {
      title: string
    }
  }
}

export interface CheckInResponse extends CheckIn {
  securityCode: string
  parentGuardianName?: string
  label: {
    childName: string
    eventName: string
    securityCode: string
    allergies: string | null
    medicalNotes: string | null
    checkedInAt: string
    parentGuardianName?: string
  }
}

export interface CheckinStats {
  totalChildren: number
  checkedInToday: number
  currentlyCheckedIn: number
  checkedOutToday: number
}

// ============================================
// Hooks
// ============================================

export function useChildren() {
  return useQuery({
    queryKey: ['kids-checkin', 'children'],
    queryFn: () => apiRequest<Child[]>('/kids-checkin/children'),
  })
}

export function useOccurrences() {
  return useQuery({
    queryKey: ['kids-checkin', 'occurrences'],
    queryFn: () => apiRequest<Occurrence[]>('/kids-checkin/occurrences'),
    refetchInterval: 60000, // Refetch every minute
  })
}

export function useCheckedIn(occurrenceId?: string) {
  return useQuery({
    queryKey: ['kids-checkin', 'checked-in', occurrenceId],
    queryFn: () => {
      const params = occurrenceId ? `?occurrenceId=${occurrenceId}` : ''
      return apiRequest<CheckIn[]>(`/kids-checkin/checked-in${params}`)
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export function useCheckinStats() {
  return useQuery({
    queryKey: ['kids-checkin', 'stats'],
    queryFn: () => apiRequest<CheckinStats>('/kids-checkin/stats'),
    refetchInterval: 30000,
  })
}

export function useCheckIn() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { memberId: string; occurrenceId: string; parentGuardianName?: string }) =>
      apiRequest<CheckInResponse>('/kids-checkin/checkin', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kids-checkin', 'checked-in'] })
      queryClient.invalidateQueries({ queryKey: ['kids-checkin', 'stats'] })
    },
  })
}

export function useCheckOutByCode() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (securityCode: string) =>
      apiRequest<CheckIn>('/kids-checkin/checkout', {
        method: 'POST',
        body: { securityCode },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kids-checkin', 'checked-in'] })
      queryClient.invalidateQueries({ queryKey: ['kids-checkin', 'stats'] })
    },
  })
}

export function useCheckOutById() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (checkInId: string) =>
      apiRequest<CheckIn>(`/kids-checkin/checkout/${checkInId}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kids-checkin', 'checked-in'] })
      queryClient.invalidateQueries({ queryKey: ['kids-checkin', 'stats'] })
    },
  })
}

