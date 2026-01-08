import { z } from 'zod'

// ============================================
// Registration Schemas
// ============================================

export const registrationStatusSchema = z.enum(['registered', 'canceled'])

export type RegistrationStatus = z.infer<typeof registrationStatusSchema>

export const createRegistrationSchema = z.object({
  memberId: z.string().nullable().optional(),
  guestName: z.string().nullable().optional(),
  guestEmail: z.string().email().nullable().optional(),
  guestPhone: z.string().nullable().optional(),
  partySize: z.number().int().positive().default(1),
}).refine(
  (data) => data.memberId || data.guestName,
  { message: 'Either memberId or guestName is required' }
)

export type CreateRegistrationRequest = z.infer<typeof createRegistrationSchema>

export const registrationResponseSchema = z.object({
  id: z.string(),
  eventOccurrenceId: z.string(),
  memberId: z.string().nullable(),
  guestName: z.string().nullable(),
  guestEmail: z.string().nullable(),
  guestPhone: z.string().nullable(),
  partySize: z.number(),
  status: registrationStatusSchema,
  createdAt: z.string(),
  member: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }).nullable().optional(),
})

export type RegistrationResponse = z.infer<typeof registrationResponseSchema>

// ============================================
// Check-In Schemas
// ============================================

export const createCheckInSchema = z.object({
  memberId: z.string().nullable().optional(),
  guestName: z.string().nullable().optional(),
  method: z.string().default('manual'),
}).refine(
  (data) => data.memberId || data.guestName,
  { message: 'Either memberId or guestName is required' }
)

export type CreateCheckInRequest = z.infer<typeof createCheckInSchema>

export const checkInResponseSchema = z.object({
  id: z.string(),
  eventOccurrenceId: z.string(),
  memberId: z.string().nullable(),
  guestName: z.string().nullable(),
  checkedInAt: z.string(),
  method: z.string(),
  member: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }).nullable().optional(),
})

export type CheckInResponse = z.infer<typeof checkInResponseSchema>

