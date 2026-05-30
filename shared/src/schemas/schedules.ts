import { z } from 'zod'

// ============================================
// Enums
// ============================================

export const schedulePeriodStatusSchema = z.enum(['DRAFT', 'PUBLISHED'])
export type SchedulePeriodStatus = z.infer<typeof schedulePeriodStatusSchema>

// ============================================
// MinistryCalendar
// ============================================

export const createCalendarSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  ministryId: z.string().min(1, 'Ministry is required'),
  reminderDaysBeforeSlot: z.number().int().min(0).max(30).optional().default(2),
  serviceDayOfWeek: z.number().int().min(0).max(6).optional().default(0),
})

export type CreateCalendarRequest = z.infer<typeof createCalendarSchema>

export const updateCalendarSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  reminderDaysBeforeSlot: z.number().int().min(0).max(30).optional(),
  serviceDayOfWeek: z.number().int().min(0).max(6).optional(),
})

export type UpdateCalendarRequest = z.infer<typeof updateCalendarSchema>

export const updateRotationSchema = z.object({
  memberIds: z.array(z.string()).min(0),
})

export type UpdateRotationRequest = z.infer<typeof updateRotationSchema>

// ============================================
// SchedulePeriod
// ============================================

export const createPeriodSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  autoGenerate: z.boolean().optional().default(false),
})

export type CreatePeriodRequest = z.infer<typeof createPeriodSchema>

// ============================================
// ScheduleSlot
// ============================================

export const createSlotSchema = z.object({
  periodId: z.string().min(1),
  slotDate: z.string().min(1),
  label: z.string().max(100).nullable().optional(),
  eventOccurrenceId: z.string().nullable().optional(),
})

export type CreateSlotRequest = z.infer<typeof createSlotSchema>

export const updateSlotSchema = z.object({
  slotDate: z.string().optional(),
  label: z.string().max(100).nullable().optional(),
  eventOccurrenceId: z.string().nullable().optional(),
})

export type UpdateSlotRequest = z.infer<typeof updateSlotSchema>

export const assignSlotSchema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  notes: z.string().max(500).nullable().optional(),
})

export type AssignSlotRequest = z.infer<typeof assignSlotSchema>
