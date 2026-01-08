import { z } from 'zod'

// ============================================
// Enums
// ============================================

export const MessageChannelSchema = z.enum(['email', 'sms'])
export type MessageChannel = z.infer<typeof MessageChannelSchema>

export const DeliveryStatusSchema = z.enum(['pending', 'sent', 'failed'])
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>

// ============================================
// Message Template Schemas
// ============================================

export const CreateMessageTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  channel: MessageChannelSchema,
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1, 'Template body is required'),
})
export type CreateMessageTemplateRequest = z.infer<typeof CreateMessageTemplateSchema>

export const UpdateMessageTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  channel: MessageChannelSchema.optional(),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1).optional(),
})
export type UpdateMessageTemplateRequest = z.infer<typeof UpdateMessageTemplateSchema>

export const MessageTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  channel: MessageChannelSchema,
  subject: z.string().nullable(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type MessageTemplate = z.infer<typeof MessageTemplateSchema>

export const MessageTemplateListSchema = z.object({
  templates: z.array(MessageTemplateSchema),
  total: z.number(),
})
export type MessageTemplateListResponse = z.infer<typeof MessageTemplateListSchema>

// ============================================
// Message Target Schemas
// ============================================

export const MessageTargetSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('all'),
  }),
  z.object({
    type: z.literal('memberIds'),
    memberIds: z.array(z.string()).min(1, 'At least one member ID is required'),
  }),
  z.object({
    type: z.literal('status'),
    status: z.enum(['active', 'inactive', 'visitor']),
  }),
])
export type MessageTarget = z.infer<typeof MessageTargetSchema>

// ============================================
// Message Schemas
// ============================================

export const CreateMessageSchema = z.object({
  channel: MessageChannelSchema,
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1, 'Message body is required'),
  target: MessageTargetSchema,
})
export type CreateMessageRequest = z.infer<typeof CreateMessageSchema>

export const MessageSchema = z.object({
  id: z.string(),
  channel: MessageChannelSchema,
  subject: z.string().nullable(),
  body: z.string(),
  createdByUserId: z.string(),
  createdAt: z.string(),
  createdByUser: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }).optional(),
  _count: z.object({
    recipients: z.number(),
  }).optional(),
})
export type Message = z.infer<typeof MessageSchema>

export const MessageListSchema = z.object({
  messages: z.array(MessageSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})
export type MessageListResponse = z.infer<typeof MessageListSchema>

// ============================================
// Recipient Schemas
// ============================================

export const GuestContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})
export type GuestContact = z.infer<typeof GuestContactSchema>

export const MessageRecipientSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  memberId: z.string().nullable(),
  guestContact: GuestContactSchema.nullable(),
  deliveryStatus: DeliveryStatusSchema,
  deliveredAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
  member: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
  }).nullable().optional(),
})
export type MessageRecipient = z.infer<typeof MessageRecipientSchema>

export const RecipientListSchema = z.object({
  recipients: z.array(MessageRecipientSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})
export type RecipientListResponse = z.infer<typeof RecipientListSchema>

// ============================================
// Opt-In Preference Schemas
// ============================================

export const OptInPreferenceSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  channel: MessageChannelSchema,
  isOptedIn: z.boolean(),
  updatedAt: z.string(),
})
export type OptInPreference = z.infer<typeof OptInPreferenceSchema>

export const UpdateOptInPreferenceSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
})
export type UpdateOptInPreferenceRequest = z.infer<typeof UpdateOptInPreferenceSchema>

export const MemberOptInPreferencesSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
})
export type MemberOptInPreferences = z.infer<typeof MemberOptInPreferencesSchema>

// ============================================
// Query Params
// ============================================

export const MessageSearchParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  channel: MessageChannelSchema.optional(),
})
export type MessageSearchParams = z.infer<typeof MessageSearchParamsSchema>

export const RecipientSearchParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: DeliveryStatusSchema.optional(),
})
export type RecipientSearchParams = z.infer<typeof RecipientSearchParamsSchema>

