import { z } from 'zod'

// ============================================
// Member Status Enum
// ============================================

export const memberStatusSchema = z.enum(['active', 'inactive', 'visitor'])
export type MemberStatus = z.infer<typeof memberStatusSchema>

// ============================================
// Member Schemas
// ============================================

export const createMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  street: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  dateOfBirth: z.string().datetime().nullable().optional(),
  status: memberStatusSchema.optional().default('active'),
  notes: z.string().nullable().optional(),
  profilePhotoUrl: z.string().url().nullable().optional(),
})

export type CreateMemberRequest = z.infer<typeof createMemberSchema>

export const updateMemberSchema = createMemberSchema.partial()

export type UpdateMemberRequest = z.infer<typeof updateMemberSchema>

export const memberResponseSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  street: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  status: memberStatusSchema,
  notes: z.string().nullable().optional(), // Only included if user has members.notes permission
  profilePhotoUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  households: z.array(z.object({
    id: z.string(),
    householdId: z.string(),
    householdName: z.string().nullable(),
    relationshipType: z.string(),
  })).optional(),
})

export type MemberResponse = z.infer<typeof memberResponseSchema>

// ============================================
// Member List / Search
// ============================================

export const memberSearchParamsSchema = z.object({
  search: z.string().optional(),
  status: memberStatusSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

export type MemberSearchParams = z.infer<typeof memberSearchParamsSchema>

export const memberListResponseSchema = z.object({
  members: z.array(memberResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export type MemberListResponse = z.infer<typeof memberListResponseSchema>

// ============================================
// CSV Import
// ============================================

export const csvImportRowSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
})

export type CsvImportRow = z.infer<typeof csvImportRowSchema>

export const csvImportResultSchema = z.object({
  success: z.number(),
  failed: z.number(),
  errors: z.array(z.object({
    row: z.number(),
    message: z.string(),
  })),
})

export type CsvImportResult = z.infer<typeof csvImportResultSchema>

