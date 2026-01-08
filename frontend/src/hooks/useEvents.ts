import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  generateOccurrences,
  EventSearchParams,
  CreateEventData,
} from '../lib/api'

export function useEvents(params: EventSearchParams = {}) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => getEvents(params),
  })
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => getEvent(id!),
    enabled: !!id,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateEventData) => createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEventData> }) =>
      updateEvent(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events', id] })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useGenerateOccurrences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, daysAhead }: { eventId: string; daysAhead?: number }) =>
      generateOccurrences(eventId, daysAhead),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId] })
      queryClient.invalidateQueries({ queryKey: ['occurrences'] })
    },
  })
}

