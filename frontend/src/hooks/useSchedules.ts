import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCalendars, getCalendar, createCalendar, updateCalendar, deleteCalendar,
  updateRotation, regenerateToken,
  getPeriods, getPeriod, createPeriod, publishPeriod, deletePeriod,
  createSlot, updateSlot, deleteSlot, assignSlot, unassignSlot,
  CreateCalendarData, CreatePeriodData, CreateSlotData,
} from '@/lib/api/schedules'
import { ApiClientError } from '@/lib/api'

// ============================================
// Query Keys
// ============================================

export const scheduleKeys = {
  all: ['schedules'] as const,
  calendars: () => [...scheduleKeys.all, 'calendars'] as const,
  calendar: (id: string) => [...scheduleKeys.calendars(), id] as const,
  periods: (calendarId: string) => [...scheduleKeys.calendar(calendarId), 'periods'] as const,
  period: (calendarId: string, id: string) => [...scheduleKeys.periods(calendarId), id] as const,
}

// ============================================
// Calendars
// ============================================

export function useCalendars() {
  return useQuery({
    queryKey: scheduleKeys.calendars(),
    queryFn: getCalendars,
  })
}

export function useCalendar(id: string) {
  return useQuery({
    queryKey: scheduleKeys.calendar(id),
    queryFn: () => getCalendar(id),
    enabled: !!id,
  })
}

export function useCreateCalendar() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof createCalendar>>, ApiClientError, CreateCalendarData>({
    mutationFn: createCalendar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: scheduleKeys.calendars() }) },
  })
}

export function useUpdateCalendar() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof updateCalendar>>, ApiClientError, { id: string } & Partial<CreateCalendarData>>({
    mutationFn: ({ id, ...data }) => updateCalendar(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: scheduleKeys.calendar(id) })
      qc.invalidateQueries({ queryKey: scheduleKeys.calendars() })
    },
  })
}

export function useDeleteCalendar() {
  const qc = useQueryClient()
  return useMutation<void, ApiClientError, string>({
    mutationFn: deleteCalendar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: scheduleKeys.calendars() }) },
  })
}

export function useUpdateRotation() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof updateRotation>>, ApiClientError, { id: string; memberIds: string[] }>({
    mutationFn: ({ id, memberIds }) => updateRotation(id, memberIds),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: scheduleKeys.calendar(id) }) },
  })
}

export function useRegenerateToken() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof regenerateToken>>, ApiClientError, string>({
    mutationFn: regenerateToken,
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: scheduleKeys.calendar(id) }) },
  })
}

// ============================================
// Periods
// ============================================

export function usePeriods(calendarId: string) {
  return useQuery({
    queryKey: scheduleKeys.periods(calendarId),
    queryFn: () => getPeriods(calendarId),
    enabled: !!calendarId,
  })
}

export function usePeriod(calendarId: string, id: string) {
  return useQuery({
    queryKey: scheduleKeys.period(calendarId, id),
    queryFn: () => getPeriod(calendarId, id),
    enabled: !!calendarId && !!id,
  })
}

export function useCreatePeriod() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof createPeriod>>, ApiClientError, { calendarId: string } & CreatePeriodData>({
    mutationFn: ({ calendarId, ...data }) => createPeriod(calendarId, data),
    onSuccess: (_, { calendarId }) => { qc.invalidateQueries({ queryKey: scheduleKeys.periods(calendarId) }) },
  })
}

export function usePublishPeriod() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof publishPeriod>>, ApiClientError, { calendarId: string; id: string }>({
    mutationFn: ({ calendarId, id }) => publishPeriod(calendarId, id),
    onSuccess: (_, { calendarId, id }) => {
      qc.invalidateQueries({ queryKey: scheduleKeys.period(calendarId, id) })
      qc.invalidateQueries({ queryKey: scheduleKeys.periods(calendarId) })
    },
  })
}

export function useDeletePeriod() {
  const qc = useQueryClient()
  return useMutation<void, ApiClientError, { calendarId: string; id: string }>({
    mutationFn: ({ calendarId, id }) => deletePeriod(calendarId, id),
    onSuccess: (_, { calendarId }) => { qc.invalidateQueries({ queryKey: scheduleKeys.periods(calendarId) }) },
  })
}

// ============================================
// Slots
// ============================================

export function useCreateSlot() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof createSlot>>, ApiClientError, { calendarId: string } & CreateSlotData>({
    mutationFn: ({ calendarId: _cid, ...data }) => createSlot(data),
    onSuccess: (_data, { calendarId }) => {
      qc.invalidateQueries({ queryKey: scheduleKeys.periods(calendarId) })
      qc.invalidateQueries({ queryKey: scheduleKeys.all })
    },
  })
}

export function useUpdateSlot() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof updateSlot>>, ApiClientError, { id: string; calendarId: string; slotDate?: string; label?: string | null }>({
    mutationFn: ({ id, calendarId: _cid, ...data }) => updateSlot(id, data),
    onSuccess: (_, { calendarId }) => { qc.invalidateQueries({ queryKey: scheduleKeys.periods(calendarId) }) },
  })
}

export function useDeleteSlot() {
  const qc = useQueryClient()
  return useMutation<void, ApiClientError, { id: string; calendarId: string }>({
    mutationFn: ({ id }) => deleteSlot(id),
    onSuccess: (_, { calendarId }) => { qc.invalidateQueries({ queryKey: scheduleKeys.periods(calendarId) }) },
  })
}

export function useAssignSlot() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof assignSlot>>, ApiClientError, { id: string; calendarId: string; periodId: string; memberId: string; notes?: string | null }>({
    mutationFn: ({ id, memberId, notes }) => assignSlot(id, memberId, notes),
    onSuccess: (_, { calendarId, periodId }) => {
      qc.invalidateQueries({ queryKey: scheduleKeys.period(calendarId, periodId) })
    },
  })
}

export function useUnassignSlot() {
  const qc = useQueryClient()
  return useMutation<void, ApiClientError, { id: string; calendarId: string; periodId: string }>({
    mutationFn: ({ id }) => unassignSlot(id),
    onSuccess: (_, { calendarId, periodId }) => {
      qc.invalidateQueries({ queryKey: scheduleKeys.period(calendarId, periodId) })
    },
  })
}
