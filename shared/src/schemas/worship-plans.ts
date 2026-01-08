import { z } from 'zod'

// ============================================
// Worship Plan Schemas
// ============================================

export const createWorshipPlanSchema = z.object({
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type CreateWorshipPlanRequest = z.infer<typeof createWorshipPlanSchema>

export const updateWorshipPlanSchema = createWorshipPlanSchema

export type UpdateWorshipPlanRequest = z.infer<typeof updateWorshipPlanSchema>

// ============================================
// Worship Plan Item Schemas
// ============================================

export const itemTypeSchema = z.enum(['song', 'scripture', 'announcement', 'sermon', 'prayer', 'other'])

export type ItemType = z.infer<typeof itemTypeSchema>

export const createWorshipPlanItemSchema = z.object({
  sortOrder: z.number().int().min(0),
  itemType: itemTypeSchema,
  title: z.string().min(1, 'Title is required'),
  details: z.string().nullable().optional(),
  songId: z.string().nullable().optional(),
  assignedMemberId: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
})

export type CreateWorshipPlanItemRequest = z.infer<typeof createWorshipPlanItemSchema>

export const updateWorshipPlanItemSchema = createWorshipPlanItemSchema.partial()

export type UpdateWorshipPlanItemRequest = z.infer<typeof updateWorshipPlanItemSchema>

export const reorderWorshipPlanItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    sortOrder: z.number().int().min(0),
  })),
})

export type ReorderWorshipPlanItemsRequest = z.infer<typeof reorderWorshipPlanItemsSchema>

// ============================================
// Response Schemas
// ============================================

export const worshipPlanItemResponseSchema = z.object({
  id: z.string(),
  worshipPlanId: z.string(),
  sortOrder: z.number(),
  itemType: z.string(),
  title: z.string(),
  details: z.string().nullable(),
  songId: z.string().nullable(),
  assignedMemberId: z.string().nullable(),
  durationMinutes: z.number().nullable(),
  song: z.object({
    id: z.string(),
    title: z.string(),
    artist: z.string().nullable(),
    defaultKey: z.string().nullable(),
  }).nullable().optional(),
  assignedMember: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }).nullable().optional(),
})

export type WorshipPlanItemResponse = z.infer<typeof worshipPlanItemResponseSchema>

export const worshipPlanResponseSchema = z.object({
  id: z.string(),
  eventOccurrenceId: z.string(),
  title: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(worshipPlanItemResponseSchema),
})

export type WorshipPlanResponse = z.infer<typeof worshipPlanResponseSchema>

