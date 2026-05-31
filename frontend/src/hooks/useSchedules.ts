import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchMinistryCalendars,
  fetchMinistryCalendar,
  createMinistryCalendar,
  updateMinistryCalendar,
  deleteMinistryCalendar,
  updateRotation,
  regenerateShareToken,
  fetchPeriods,
  fetchPeriod,
  createPeriod,
  publishPeriod,
  deletePeriod,
  createSlot,
  updateSlot,
  deleteSlot,
  assignSlot,
  unassignSlot,
  fetchPublicSchedule,
  type MinistryCalendar,
  type MinistryCalendarWithRotation,
  type SchedulePeriod,
  type SchedulePeriodWithSlots,
  type ScheduleSlot,
  type SlotAssignment,
  type ConflictInfo,
  type PublicSlot,
  type PublicSchedule,
  type CreateMinistryCalendarInput,
  type UpdateMinistryCalendarInput,
  type CreateSchedulePeriodInput,
  type CreateScheduleSlotInput,
  type UpdateScheduleSlotInput,
  type AssignSlotInput,
} from '@/lib/api/schedules'
import { ApiClientError } from '@/lib/api'

// ============================================
// Query Keys
// ============================================

export const scheduleKeys = {
  all: ['ministry-calendars'] as const,
  lists: () => [...scheduleKeys.all, 'list'] as const,
  detail: (id: string) => [...scheduleKeys.all, 'detail', id] as const,
  periods: (calendarId: string) =>
    [...scheduleKeys.all, 'periods', calendarId] as const,
  period: (calendarId: string, periodId: string) =>
    [...scheduleKeys.all, 'periods', calendarId, periodId] as const,
  publicSchedule: (token: string) => ['public-schedule', token] as const,
}

// ============================================
// useMinistryCalendars — List all calendars
// ============================================

export function useMinistryCalendars() {
  return useQuery<MinistryCalendar[], ApiClientError>({
    queryKey: scheduleKeys.lists(),
    queryFn: fetchMinistryCalendars,
  })
}

// ============================================
// useMinistryCalendar — Single calendar with rotation
// ============================================

export function useMinistryCalendar(id: string) {
  return useQuery<MinistryCalendarWithRotation, ApiClientError>({
    queryKey: scheduleKeys.detail(id),
    queryFn: () => fetchMinistryCalendar(id),
    enabled: !!id,
  })
}

// ============================================
// usePeriods — List periods for a calendar
// ============================================

export function usePeriods(calendarId: string) {
  return useQuery<SchedulePeriod[], ApiClientError>({
    queryKey: scheduleKeys.periods(calendarId),
    queryFn: () => fetchPeriods(calendarId),
    enabled: !!calendarId,
  })
}

// ============================================
// usePeriod — Single period with slots/assignments
// ============================================

export function usePeriod(calendarId: string, periodId: string) {
  return useQuery<SchedulePeriodWithSlots, ApiClientError>({
    queryKey: scheduleKeys.period(calendarId, periodId),
    queryFn: () => fetchPeriod(calendarId, periodId),
    enabled: !!calendarId && !!periodId,
  })
}

// ============================================
// usePublicSchedule — Public kiosk, no auth
// ============================================

export function usePublicSchedule(token: string) {
  return useQuery<PublicSchedule, ApiClientError>({
    queryKey: scheduleKeys.publicSchedule(token),
    queryFn: () => fetchPublicSchedule(token),
    enabled: !!token,
  })
}

// ============================================
// useCreateCalendar
// ============================================

export function useCreateCalendar() {
  const queryClient = useQueryClient()

  return useMutation<MinistryCalendar, ApiClientError, CreateMinistryCalendarInput>({
    mutationFn: createMinistryCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() })
    },
  })
}

// ============================================
// useUpdateCalendar
// ============================================

export function useUpdateCalendar() {
  const queryClient = useQueryClient()

  return useMutation<
    MinistryCalendarWithRotation,
    ApiClientError,
    { id: string; data: UpdateMinistryCalendarInput }
  >({
    mutationFn: ({ id, data }) => updateMinistryCalendar(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() })
    },
  })
}

// ============================================
// useDeleteCalendar
// ============================================

export function useDeleteCalendar() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiClientError, string>({
    mutationFn: deleteMinistryCalendar,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() })
    },
  })
}

// ============================================
// useUpdateRotation
// ============================================

export function useUpdateRotation() {
  const queryClient = useQueryClient()

  return useMutation<
    MinistryCalendarWithRotation,
    ApiClientError,
    { id: string; memberIds: string[] }
  >({
    mutationFn: ({ id, memberIds }) => updateRotation(id, memberIds),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(id) })
    },
  })
}

// ============================================
// useRegenerateToken
// ============================================

export function useRegenerateToken() {
  const queryClient = useQueryClient()

  return useMutation<{ shareToken: string }, ApiClientError, string>({
    mutationFn: regenerateShareToken,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() })
    },
  })
}

// ============================================
// useCreatePeriod
// ============================================

export function useCreatePeriod() {
  const queryClient = useQueryClient()

  return useMutation<
    SchedulePeriod,
    ApiClientError,
    { calendarId: string; data: CreateSchedulePeriodInput }
  >({
    mutationFn: ({ calendarId, data }) => createPeriod(calendarId, data),
    onSuccess: (_, { calendarId }) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.periods(calendarId) })
    },
  })
}

// ============================================
// usePublishPeriod
// ============================================

export function usePublishPeriod() {
  const queryClient = useQueryClient()

  return useMutation<
    SchedulePeriod,
    ApiClientError,
    { calendarId: string; periodId: string }
  >({
    mutationFn: ({ calendarId, periodId }) => publishPeriod(calendarId, periodId),
    onSuccess: (_, { calendarId, periodId }) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.period(calendarId, periodId) })
      queryClient.invalidateQueries({ queryKey: scheduleKeys.periods(calendarId) })
    },
  })
}

// ============================================
// useDeletePeriod
// ============================================

export function useDeletePeriod() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiClientError, { calendarId: string; periodId: string }>({
    mutationFn: ({ calendarId, periodId }) => deletePeriod(calendarId, periodId),
    onSuccess: (_, { calendarId }) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.periods(calendarId) })
    },
  })
}

// ============================================
// useCreateSlot
// ============================================

export function useCreateSlot() {
  const queryClient = useQueryClient()

  return useMutation<ScheduleSlot, ApiClientError, CreateScheduleSlotInput>({
    mutationFn: createSlot,
    onSuccess: () => {
      // Invalidate all calendar-related queries — periodId/calendarId not
      // available from the slot response alone, so we do a broader invalidation.
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
    },
  })
}

// ============================================
// useUpdateSlot
// ============================================

export function useUpdateSlot() {
  const queryClient = useQueryClient()

  return useMutation<ScheduleSlot, ApiClientError, { id: string; data: UpdateScheduleSlotInput }>({
    mutationFn: ({ id, data }) => updateSlot(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
    },
  })
}

// ============================================
// useDeleteSlot
// ============================================

export function useDeleteSlot() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiClientError, string>({
    mutationFn: deleteSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
    },
  })
}

// ============================================
// useAssignSlot
// ============================================

export function useAssignSlot() {
  const queryClient = useQueryClient()

  return useMutation<
    { assignment: SlotAssignment; conflicts: ConflictInfo[] },
    ApiClientError,
    { id: string; data: AssignSlotInput }
  >({
    mutationFn: ({ id, data }) => assignSlot(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
    },
  })
}

// ============================================
// useUnassignSlot
// ============================================

export function useUnassignSlot() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiClientError, string>({
    mutationFn: unassignSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
    },
  })
}

// Re-export domain types for consumer convenience
export type {
  MinistryCalendar,
  MinistryCalendarWithRotation,
  SchedulePeriod,
  SchedulePeriodWithSlots,
  ScheduleSlot,
  SlotAssignment,
  ConflictInfo,
  PublicSlot,
  PublicSchedule,
}
