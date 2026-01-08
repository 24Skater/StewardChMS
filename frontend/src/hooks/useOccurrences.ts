import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getOccurrences,
  getOccurrence,
  updateOccurrence,
  getRegistrations,
  createRegistration,
  cancelRegistration,
  getCheckIns,
  createCheckIn,
  OccurrenceSearchParams,
  CreateRegistrationData,
  CreateCheckInData,
} from '../lib/api'

export function useOccurrences(params: OccurrenceSearchParams = {}) {
  return useQuery({
    queryKey: ['occurrences', params],
    queryFn: () => getOccurrences(params),
  })
}

export function useOccurrence(id: string | undefined) {
  return useQuery({
    queryKey: ['occurrences', id],
    queryFn: () => getOccurrence(id!),
    enabled: !!id,
  })
}

export function useUpdateOccurrence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateOccurrence>[1] }) =>
      updateOccurrence(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['occurrences'] })
      queryClient.invalidateQueries({ queryKey: ['occurrences', id] })
    },
  })
}

// Registration hooks
export function useRegistrations(occurrenceId: string | undefined) {
  return useQuery({
    queryKey: ['registrations', occurrenceId],
    queryFn: () => getRegistrations(occurrenceId!),
    enabled: !!occurrenceId,
  })
}

export function useCreateRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ occurrenceId, data }: { occurrenceId: string; data: CreateRegistrationData }) =>
      createRegistration(occurrenceId, data),
    onSuccess: (_, { occurrenceId }) => {
      queryClient.invalidateQueries({ queryKey: ['registrations', occurrenceId] })
      queryClient.invalidateQueries({ queryKey: ['occurrences', occurrenceId] })
    },
  })
}

export function useCancelRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string; occurrenceId: string }) =>
      cancelRegistration(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['registrations', variables.occurrenceId] })
      queryClient.invalidateQueries({ queryKey: ['occurrences', variables.occurrenceId] })
    },
  })
}

// Check-in hooks
export function useCheckIns(occurrenceId: string | undefined) {
  return useQuery({
    queryKey: ['checkins', occurrenceId],
    queryFn: () => getCheckIns(occurrenceId!),
    enabled: !!occurrenceId,
  })
}

export function useCreateCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ occurrenceId, data }: { occurrenceId: string; data: CreateCheckInData }) =>
      createCheckIn(occurrenceId, data),
    onSuccess: (_, { occurrenceId }) => {
      queryClient.invalidateQueries({ queryKey: ['checkins', occurrenceId] })
      queryClient.invalidateQueries({ queryKey: ['occurrences', occurrenceId] })
    },
  })
}

