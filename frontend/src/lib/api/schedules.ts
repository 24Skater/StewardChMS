import { apiRequest } from '@/lib/api'

// ============================================
// Types
// ============================================

export interface Ministry {
  id: string
  name: string
}

export interface RotationMember {
  id: string
  memberId: string
  rotationOrder: number
  member: { id: string; firstName: string; lastName: string }
}

export interface MinistryCalendar {
  id: string
  name: string
  description: string | null
  ministryId: string
  ministry: Ministry
  reminderDaysBeforeSlot: number
  serviceDayOfWeek: number
  rotationNextIndex?: number
  isActive: boolean
  shareToken?: string
  rotationMembers?: RotationMember[]
  createdAt: string
  updatedAt: string
  _count?: { rotationMembers: number; periods: number }
}

export interface SchedulePeriod {
  id: string
  calendarId: string
  year: number
  month: number
  status: 'DRAFT' | 'PUBLISHED'
  createdAt: string
  updatedAt: string
  _count?: { slots: number }
}

export interface SlotAssignment {
  id: string
  memberId: string
  member: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null }
  notes: string | null
  notifiedAt: string | null
  reminderSentAt: string | null
}

export interface ConflictInfo {
  calendarId: string
  calendarName: string
  slotDate: string
  label: string | null
}

export interface ScheduleSlot {
  id: string
  slotDate: string
  label: string | null
  assignment: SlotAssignment | null
}

export interface SchedulePeriodDetail extends SchedulePeriod {
  slots: ScheduleSlot[]
}

export interface PublicSlot {
  slotDate: string
  label: string | null
  assignedMember: string | null
}

export interface PublicSchedule {
  calendarName: string
  slots: PublicSlot[]
}

// ============================================
// Calendar API
// ============================================

export function getCalendars(): Promise<MinistryCalendar[]> {
  return apiRequest('/ministry-calendars')
}

export function getCalendar(id: string): Promise<MinistryCalendar> {
  return apiRequest(`/ministry-calendars/${id}`)
}

export interface CreateCalendarData {
  name: string
  description?: string | null
  ministryId: string
  reminderDaysBeforeSlot?: number
  serviceDayOfWeek?: number
}

export function createCalendar(data: CreateCalendarData): Promise<MinistryCalendar> {
  return apiRequest('/ministry-calendars', { method: 'POST', body: data })
}

export function updateCalendar(id: string, data: Partial<CreateCalendarData>): Promise<MinistryCalendar> {
  return apiRequest(`/ministry-calendars/${id}`, { method: 'PUT', body: data })
}

export function deleteCalendar(id: string): Promise<void> {
  return apiRequest(`/ministry-calendars/${id}`, { method: 'DELETE' })
}

export function updateRotation(id: string, memberIds: string[]): Promise<{ rotationMembers: RotationMember[] }> {
  return apiRequest(`/ministry-calendars/${id}/rotation`, { method: 'PUT', body: { memberIds } })
}

export function regenerateToken(id: string): Promise<{ shareToken: string }> {
  return apiRequest(`/ministry-calendars/${id}/token/regenerate`, { method: 'POST' })
}

// ============================================
// Period API
// ============================================

export function getPeriods(calendarId: string): Promise<SchedulePeriod[]> {
  return apiRequest(`/ministry-calendars/${calendarId}/periods`)
}

export function getPeriod(calendarId: string, id: string): Promise<SchedulePeriodDetail> {
  return apiRequest(`/ministry-calendars/${calendarId}/periods/${id}`)
}

export interface CreatePeriodData {
  year: number
  month: number
  autoGenerate?: boolean
}

export function createPeriod(calendarId: string, data: CreatePeriodData): Promise<SchedulePeriod> {
  return apiRequest(`/ministry-calendars/${calendarId}/periods`, { method: 'POST', body: data })
}

export function publishPeriod(calendarId: string, id: string): Promise<{ id: string; status: string }> {
  return apiRequest(`/ministry-calendars/${calendarId}/periods/${id}/publish`, { method: 'POST' })
}

export function deletePeriod(calendarId: string, id: string): Promise<void> {
  return apiRequest(`/ministry-calendars/${calendarId}/periods/${id}`, { method: 'DELETE' })
}

// ============================================
// Slot API
// ============================================

export interface CreateSlotData {
  periodId: string
  slotDate: string
  label?: string | null
  eventOccurrenceId?: string | null
}

export function createSlot(data: CreateSlotData): Promise<ScheduleSlot> {
  return apiRequest('/schedule-slots', { method: 'POST', body: data })
}

export function updateSlot(id: string, data: { slotDate?: string; label?: string | null }): Promise<ScheduleSlot> {
  return apiRequest(`/schedule-slots/${id}`, { method: 'PUT', body: data })
}

export function deleteSlot(id: string): Promise<void> {
  return apiRequest(`/schedule-slots/${id}`, { method: 'DELETE' })
}

export function assignSlot(id: string, memberId: string, notes?: string | null): Promise<{ assignment: SlotAssignment; conflicts: ConflictInfo[] }> {
  return apiRequest(`/schedule-slots/${id}/assign`, { method: 'POST', body: { memberId, notes } })
}

export function unassignSlot(id: string): Promise<void> {
  return apiRequest(`/schedule-slots/${id}/assignment`, { method: 'DELETE' })
}

// ============================================
// Public API (no auth)
// ============================================

export function getPublicSchedule(token: string): Promise<PublicSchedule> {
  return fetch(`/public/schedule/${token}`).then(r => {
    if (!r.ok) throw new Error('Schedule not found')
    return r.json()
  })
}
