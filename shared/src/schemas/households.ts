import { z } from 'zod'

// ============================================
// Relationship Type Enum
// ============================================

export const relationshipTypeSchema = z.enum(['parent', 'child', 'spouse', 'other'])
export type RelationshipType = z.infer<typeof relationshipTypeSchema>

// ============================================
// Household Schemas
// ============================================

export const createHouseholdSchema = z.object({
  name: z.string().max(200).nullable().optional(),
})

export type CreateHouseholdRequest = z.infer<typeof createHouseholdSchema>

export const updateHouseholdSchema = createHouseholdSchema

export type UpdateHouseholdRequest = z.infer<typeof updateHouseholdSchema>

export const householdMemberSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  relationshipType: relationshipTypeSchema,
})

export type HouseholdMemberInfo = z.infer<typeof householdMemberSchema>

export const householdResponseSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  members: z.array(householdMemberSchema),
})

export type HouseholdResponse = z.infer<typeof householdResponseSchema>

// ============================================
// Link Member to Household
// ============================================

export const linkMemberToHouseholdSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  relationshipType: relationshipTypeSchema,
})

export type LinkMemberToHouseholdRequest = z.infer<typeof linkMemberToHouseholdSchema>

// ============================================
// Household List
// ============================================

export const householdListResponseSchema = z.object({
  households: z.array(householdResponseSchema),
  total: z.number(),
})

export type HouseholdListResponse = z.infer<typeof householdListResponseSchema>

