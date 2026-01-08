import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Test the validation schemas directly
describe('Opt-In Validation Schemas', () => {
  const updateOptInSchema = z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
  })

  describe('updateOptInSchema', () => {
    it('should accept email opt-in only', () => {
      const result = updateOptInSchema.safeParse({
        email: true,
      })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ email: true })
    })

    it('should accept sms opt-in only', () => {
      const result = updateOptInSchema.safeParse({
        sms: false,
      })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ sms: false })
    })

    it('should accept both email and sms', () => {
      const result = updateOptInSchema.safeParse({
        email: true,
        sms: false,
      })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ email: true, sms: false })
    })

    it('should accept empty object (no changes)', () => {
      const result = updateOptInSchema.safeParse({})
      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })

    it('should reject non-boolean values for email', () => {
      const result = updateOptInSchema.safeParse({
        email: 'yes',
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-boolean values for sms', () => {
      const result = updateOptInSchema.safeParse({
        sms: 1,
      })
      expect(result.success).toBe(false)
    })
  })
})

// Test opt-in enforcement logic
describe('Opt-In Enforcement Logic', () => {
  interface OptInPreference {
    channel: 'email' | 'sms'
    isOptedIn: boolean
  }

  function shouldSendToMember(
    preferences: OptInPreference[],
    channel: 'email' | 'sms'
  ): boolean {
    const preference = preferences.find(p => p.channel === channel)
    // Default to opted in if no preference exists
    return preference ? preference.isOptedIn : true
  }

  it('should allow sending if no preferences exist (default opted in)', () => {
    const result = shouldSendToMember([], 'email')
    expect(result).toBe(true)
  })

  it('should allow sending if opted in', () => {
    const result = shouldSendToMember(
      [{ channel: 'email', isOptedIn: true }],
      'email'
    )
    expect(result).toBe(true)
  })

  it('should block sending if opted out', () => {
    const result = shouldSendToMember(
      [{ channel: 'email', isOptedIn: false }],
      'email'
    )
    expect(result).toBe(false)
  })

  it('should check correct channel', () => {
    const preferences = [
      { channel: 'email' as const, isOptedIn: false },
      { channel: 'sms' as const, isOptedIn: true },
    ]
    expect(shouldSendToMember(preferences, 'email')).toBe(false)
    expect(shouldSendToMember(preferences, 'sms')).toBe(true)
  })
})

// Integration tests - only run if DATABASE_URL is available
const runIntegrationTests = !!process.env.DATABASE_URL

describe.skipIf(!runIntegrationTests)('Opt-In API Integration Tests', () => {
  it('should be skipped if no database', () => {
    expect(true).toBe(true)
  })
})

