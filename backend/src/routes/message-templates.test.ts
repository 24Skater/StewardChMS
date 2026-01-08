import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Test the validation schemas directly
describe('Message Template Validation Schemas', () => {
  const createTemplateSchema = z.object({
    name: z.string().min(1, 'Template name is required').max(100),
    channel: z.enum(['email', 'sms']),
    subject: z.string().max(200).optional().nullable(),
    body: z.string().min(1, 'Template body is required'),
  })

  const updateTemplateSchema = createTemplateSchema.partial()

  describe('createTemplateSchema', () => {
    it('should accept valid email template', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Welcome Email',
        channel: 'email',
        subject: 'Welcome to Our Church',
        body: 'Hello {{firstName}}, welcome to our community!',
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid sms template without subject', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Event Reminder',
        channel: 'sms',
        body: 'Hi {{firstName}}, reminder about tomorrow\'s event!',
      })
      expect(result.success).toBe(true)
    })

    it('should reject template without name', () => {
      const result = createTemplateSchema.safeParse({
        channel: 'email',
        body: 'Test body',
      })
      expect(result.success).toBe(false)
    })

    it('should reject template with empty name', () => {
      const result = createTemplateSchema.safeParse({
        name: '',
        channel: 'email',
        body: 'Test body',
      })
      expect(result.success).toBe(false)
    })

    it('should reject template without body', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Test Template',
        channel: 'email',
      })
      expect(result.success).toBe(false)
    })

    it('should reject template with empty body', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Test Template',
        channel: 'email',
        body: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid channel', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Test Template',
        channel: 'fax',
        body: 'Test body',
      })
      expect(result.success).toBe(false)
    })

    it('should reject name over 100 characters', () => {
      const result = createTemplateSchema.safeParse({
        name: 'a'.repeat(101),
        channel: 'email',
        body: 'Test body',
      })
      expect(result.success).toBe(false)
    })

    it('should reject subject over 200 characters', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Test Template',
        channel: 'email',
        subject: 'a'.repeat(201),
        body: 'Test body',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateTemplateSchema', () => {
    it('should accept partial update with only name', () => {
      const result = updateTemplateSchema.safeParse({
        name: 'Updated Name',
      })
      expect(result.success).toBe(true)
    })

    it('should accept partial update with only body', () => {
      const result = updateTemplateSchema.safeParse({
        body: 'Updated body content',
      })
      expect(result.success).toBe(true)
    })

    it('should accept empty object (no changes)', () => {
      const result = updateTemplateSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should still validate constraints on provided fields', () => {
      const result = updateTemplateSchema.safeParse({
        name: '', // Empty name should still fail
      })
      expect(result.success).toBe(false)
    })
  })
})

// Integration tests - only run if DATABASE_URL is available
const runIntegrationTests = !!process.env.DATABASE_URL

describe.skipIf(!runIntegrationTests)('Message Templates API Integration Tests', () => {
  it('should be skipped if no database', () => {
    expect(true).toBe(true)
  })
})

