/**
 * Schedules API module
 *
 * Covers Ministry Calendars, Schedule Periods, Schedule Slots, and the
 * public kiosk endpoint.  All authenticated routes wrap responses in
 * { success: true, data: ... } — this module unwraps that envelope before
 * returning so callers work with plain typed objects.
 */

import { apiRequest } from '@/lib/api'

// ============================================
// Input types (mirror of shared/src/schemas/schedules.ts)
// ============================================

export interface CreateMinistryCalendarInput {
  name: string
  description?: string
  ministryId: string
  reminderDaysBeforeSlot?: number
  serviceDayOfWeek?: number
}

export interface UpdateMinistryCalendarInput {
  name?: string
  description?: string
  reminderDaysBeforeSlot?: number
  serviceDayOfWeek?: number
}

export interface CreateSchedulePeriodInput {
  year: number
  month: number
  autoGenerate?: boolean
}

export interface CreateScheduleSlotInput {
  periodId: string
  slotDate: string
  label?: string
  eventOccurrenceId?: string
}

export interface UpdateScheduleSlotInput {
  slotDate?: string
  label?: string
  eventOccurrenceId?: string
}

export interface AssignSlotInput {
  memberId: string
  notes?: string
}

// ============================================
// Response type helpers
// ============================================

interface ApiEnvelope<T> {
  success: boolean
  data: T
}

/** Strip the { success, data } envelope returned by scheduling routes. */
async function unwrap<T>(promise: Promise<ApiEnvelope<T>>): Promise<T> {
  const envelope = await promise
  return envelope.data
}

// ============================================
// Domain types
// ============================================

export interface MinistryInfo {
  id: string
  name: string
}

export interface MinistryCalendar {
  id: string
  name: string
  description: string | null
  ministryId: string
  ministry: MinistryInfo
  shareToken: string
  reminderDaysBeforeSlot: number
  serviceDayOfWeek: number
  rotationNextIndex: number
  rotationMemberCount?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MemberSummary {
  id: string
  firstName: string
  lastName: string
  email: string | null
}

export interface RotationMember {
  id: string
  memberId: string
  rotationOrder: number
  member: MemberSummary
}

export interface MinistryCalendarWithRotation extends MinistryCalendar {
  rotationMembers: RotationMember[]
}

export interface SchedulePeriod {
  id: string
  calendarId: string
  year: number
  month: number
  status: 'draft' | 'published'
  slotCount: number
  createdAt: string
  updatedAt: string
}

export interface SlotAssignment {
  id: string
  memberId: string
  member: MemberSummary
  assignedById: string
  notes: string | null
  notifiedAt: string | null
  reminderSentAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ScheduleSlot {
  id: string
  periodId: string
  slotDate: string
  label: string | null
  eventOccurrenceId: string | null
  createdAt: string
  updatedAt: string
}

export interface ScheduleSlotWithAssignment extends ScheduleSlot {
  assignment: SlotAssignment | null
}

export interface SchedulePeriodWithSlots extends SchedulePeriod {
  slots: ScheduleSlotWithAssignment[]
}

export interface ConflictInfo {
  calendarId: string
  calendarName: string
  slotDate: string
  label: string | null
}

export interface PublicSlot {
  slotDate: string
  label: string | null
  assignedMember: string
}

export interface PublicSchedule {
  calendarName: string
  slots: PublicSlot[]
}

// ============================================
// Ministry Calendars
// ============================================

export async function fetchMinistryCalendars(): Promise<MinistryCalendar[]> {
  return unwrap(
    apiRequest<ApiEnvelope<MinistryCalendar[]>>('/ministry-calendars')
  )
}

export async function fetchMinistryCalendar(id: string): Promise<MinistryCalendarWithRotation> {
  return unwrap(
    apiRequest<ApiEnvelope<MinistryCalendarWithRotation>>(`/ministry-calendars/${id}`)
  )
}

export async function createMinistryCalendar(
  data: CreateMinistryCalendarInput
): Promise<MinistryCalendar> {
  return unwrap(
    apiRequest<ApiEnvelope<MinistryCalendar>>('/ministry-calendars', {
      method: 'POST',
      body: data,
    })
  )
}

export async function updateMinistryCalendar(
  id: string,
  data: UpdateMinistryCalendarInput
): Promise<MinistryCalendarWithRotation> {
  return unwrap(
    apiRequest<ApiEnvelope<MinistryCalendarWithRotation>>(`/ministry-calendars/${id}`, {
      method: 'PUT',
      body: data,
    })
  )
}

export async function deleteMinistryCalendar(id: string): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(`/ministry-calendars/${id}`, {
    method: 'DELETE',
  })
}

export async function updateRotation(
  id: string,
  memberIds: string[]
): Promise<MinistryCalendarWithRotation> {
  return unwrap(
    apiRequest<ApiEnvelope<MinistryCalendarWithRotation>>(`/ministry-calendars/${id}/rotation`, {
      method: 'PUT',
      body: { memberIds },
    })
  )
}

export async function regenerateShareToken(id: string): Promise<{ shareToken: string }> {
  return unwrap(
    apiRequest<ApiEnvelope<{ shareToken: string }>>(
      `/ministry-calendars/${id}/token/regenerate`,
      { method: 'POST' }
    )
  )
}

// ============================================
// Schedule Periods
// ============================================

export async function fetchPeriods(calendarId: string): Promise<SchedulePeriod[]> {
  return unwrap(
    apiRequest<ApiEnvelope<SchedulePeriod[]>>(`/ministry-calendars/${calendarId}/periods`)
  )
}

export async function fetchPeriod(
  calendarId: string,
  periodId: string
): Promise<SchedulePeriodWithSlots> {
  return unwrap(
    apiRequest<ApiEnvelope<SchedulePeriodWithSlots>>(
      `/ministry-calendars/${calendarId}/periods/${periodId}`
    )
  )
}

export async function createPeriod(
  calendarId: string,
  data: CreateSchedulePeriodInput
): Promise<SchedulePeriod> {
  return unwrap(
    apiRequest<ApiEnvelope<SchedulePeriod>>(`/ministry-calendars/${calendarId}/periods`, {
      method: 'POST',
      body: data,
    })
  )
}

export async function publishPeriod(
  calendarId: string,
  periodId: string
): Promise<SchedulePeriod> {
  return unwrap(
    apiRequest<ApiEnvelope<SchedulePeriod>>(
      `/ministry-calendars/${calendarId}/periods/${periodId}/publish`,
      { method: 'POST' }
    )
  )
}

export async function deletePeriod(calendarId: string, periodId: string): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(
    `/ministry-calendars/${calendarId}/periods/${periodId}`,
    { method: 'DELETE' }
  )
}

// ============================================
// Schedule Slots
// ============================================

export async function createSlot(data: CreateScheduleSlotInput): Promise<ScheduleSlot> {
  return unwrap(
    apiRequest<ApiEnvelope<ScheduleSlot>>('/schedule-slots', {
      method: 'POST',
      body: data,
    })
  )
}

export async function updateSlot(
  id: string,
  data: UpdateScheduleSlotInput
): Promise<ScheduleSlot> {
  return unwrap(
    apiRequest<ApiEnvelope<ScheduleSlot>>(`/schedule-slots/${id}`, {
      method: 'PUT',
      body: data,
    })
  )
}

export async function deleteSlot(id: string): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(`/schedule-slots/${id}`, {
    method: 'DELETE',
  })
}

export async function assignSlot(
  id: string,
  data: AssignSlotInput
): Promise<{ assignment: SlotAssignment; conflicts: ConflictInfo[] }> {
  return unwrap(
    apiRequest<ApiEnvelope<{ assignment: SlotAssignment; conflicts: ConflictInfo[] }>>(
      `/schedule-slots/${id}/assign`,
      { method: 'POST', body: data }
    )
  )
}

export async function unassignSlot(id: string): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(`/schedule-slots/${id}/assignment`, {
    method: 'DELETE',
  })
}

// ============================================
// Public kiosk (no auth required)
// ============================================

export async function fetchPublicSchedule(token: string): Promise<PublicSchedule> {
  return unwrap(
    apiRequest<ApiEnvelope<PublicSchedule>>(`/public/schedule/${token}`, { auth: false })
  )
}

export const getPublicSchedule = fetchPublicSchedule
