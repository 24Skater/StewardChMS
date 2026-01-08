import { z } from 'zod'

// ============================================
// Login
// ============================================

export const loginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>

export const loginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
    roles: z.array(z.string()),
    permissions: z.array(z.string()),
  }),
})

export type LoginResponse = z.infer<typeof loginResponseSchema>

// ============================================
// Current User (me)
// ============================================

export const userSummarySchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  isActive: z.boolean(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  createdAt: z.string().datetime(),
})

export type UserSummary = z.infer<typeof userSummarySchema>

// ============================================
// Logout
// ============================================

export const logoutResponseSchema = z.object({
  message: z.string(),
})

export type LogoutResponse = z.infer<typeof logoutResponseSchema>

