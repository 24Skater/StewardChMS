import { z } from 'zod'

// ============================================
// Password Validation
// ============================================

// Password must be at least 12 characters
// Must contain at least 3 of: lowercase, uppercase, number, special
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .refine(
    (password) => {
      const checks = [
        /[a-z]/.test(password), // lowercase
        /[A-Z]/.test(password), // uppercase
        /[0-9]/.test(password), // number
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), // special
      ]
      return checks.filter(Boolean).length >= 3
    },
    {
      message: 'Password must contain at least 3 of: lowercase, uppercase, number, special character',
    }
  )

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
  expiresAt: z.string().datetime().optional(),
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

// ============================================
// Change Password
// ============================================

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
})

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>

export const changePasswordResponseSchema = z.object({
  message: z.string(),
})

export type ChangePasswordResponse = z.infer<typeof changePasswordResponseSchema>

// ============================================
// Password Validation Response
// ============================================

export const passwordValidationResponseSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  score: z.number().min(0).max(4),
  scoreLabel: z.enum(['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']),
})

export type PasswordValidationResponse = z.infer<typeof passwordValidationResponseSchema>
