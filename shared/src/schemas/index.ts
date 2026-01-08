// Shared Zod schemas for validation
// Add schemas here as features are implemented

import { z } from 'zod'

// Health check response schema
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
  service: z.string(),
})

export type HealthResponse = z.infer<typeof healthResponseSchema>

// API error response schema
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  statusCode: z.number().optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>

// Auth schemas
export * from './auth.js'

// Member CRM schemas (Phase 2)
export * from './members.js'
export * from './households.js'

// Events + Worship schemas (Phase 3)
export * from './events.js'
export * from './registrations.js'
export * from './songs.js'
export * from './worship-plans.js'

// Communications schemas (Phase 4)
export * from './communications.js'

// Accounting + Giving schemas (Phase 5)
export * from './accounting.js'

