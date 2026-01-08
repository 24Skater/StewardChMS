import { z } from 'zod'

// ============================================
// Recurrence Rule Schema
// ============================================

export const recurrenceRuleSchema = z.object({
  frequency: z.enum(['weekly', 'monthly']),
  dayOfWeek: z.number().min(0).max(6), // 0 = Sunday, 6 = Saturday
  weekOfMonth: z.number().min(1).max(5).optional(), // For monthly: 1st, 2nd, 3rd, 4th, 5th
})

export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>

// ============================================
// Event Schemas
// ============================================

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  ministryId: z.string().nullable().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().nullable().optional(), // JSON string of RecurrenceRule
  startDatetime: z.string().datetime().nullable().optional(),
  endDatetime: z.string().datetime().nullable().optional(),
})

export type CreateEventRequest = z.infer<typeof createEventSchema>

export const updateEventSchema = createEventSchema.partial()

export type UpdateEventRequest = z.infer<typeof updateEventSchema>

export const eventResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  category: z.string().nullable(),
  ministryId: z.string().nullable(),
  isRecurring: z.boolean(),
  recurrenceRule: z.string().nullable(),
  startDatetime: z.string().nullable(),
  endDatetime: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type EventResponse = z.infer<typeof eventResponseSchema>

// ============================================
// Event Search
// ============================================

export const eventSearchParamsSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

export type EventSearchParams = z.infer<typeof eventSearchParamsSchema>

// ============================================
// Generate Occurrences
// ============================================

export const generateOccurrencesSchema = z.object({
  daysAhead: z.number().int().positive().max(365).optional().default(90),
})

export type GenerateOccurrencesRequest = z.infer<typeof generateOccurrencesSchema>

// ============================================
// Occurrence Schemas
// ============================================

export const occurrenceStatusSchema = z.enum(['scheduled', 'canceled'])

export type OccurrenceStatus = z.infer<typeof occurrenceStatusSchema>

export const updateOccurrenceSchema = z.object({
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  status: occurrenceStatusSchema.optional(),
  notes: z.string().nullable().optional(),
})

export type UpdateOccurrenceRequest = z.infer<typeof updateOccurrenceSchema>

export const occurrenceResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  status: occurrenceStatusSchema,
  notes: z.string().nullable(),
  event: eventResponseSchema.optional(),
})

export type OccurrenceResponse = z.infer<typeof occurrenceResponseSchema>

export const occurrenceSearchParamsSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  eventId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
})

export type OccurrenceSearchParams = z.infer<typeof occurrenceSearchParamsSchema>

