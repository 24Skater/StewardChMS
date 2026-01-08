import { z } from 'zod'

// ============================================
// Enums
// ============================================

export const PaymentMethodSchema = z.enum(['cash', 'check', 'card', 'online', 'other'])
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>

export const PledgeStatusSchema = z.enum(['active', 'completed', 'canceled'])
export type PledgeStatus = z.infer<typeof PledgeStatusSchema>

export const InvoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'void'])
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>

export const PurchaseOrderStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected', 'closed', 'void'])
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusSchema>

// ============================================
// Fund Schemas
// ============================================

export const CreateFundSchema = z.object({
  name: z.string().min(1, 'Fund name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  isRestricted: z.boolean().optional().default(false),
})

export const UpdateFundSchema = CreateFundSchema.partial()

export const FundResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isRestricted: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const FundListResponseSchema = z.object({
  funds: z.array(FundResponseSchema),
  total: z.number(),
})

export type CreateFund = z.infer<typeof CreateFundSchema>
export type UpdateFund = z.infer<typeof UpdateFundSchema>
export type FundResponse = z.infer<typeof FundResponseSchema>
export type FundListResponse = z.infer<typeof FundListResponseSchema>

// ============================================
// Donation Schemas
// ============================================

export const CreateDonationSchema = z.object({
  memberId: z.string().nullable().optional(),
  guestName: z.string().max(100).nullable().optional(),
  amountCents: z.number().int().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  fundId: z.string().nullable().optional(),
  method: PaymentMethodSchema,
  receivedAt: z.string().datetime(),
  note: z.string().max(500).nullable().optional(),
})

export const UpdateDonationSchema = CreateDonationSchema.partial()

export const DonationResponseSchema = z.object({
  id: z.string(),
  memberId: z.string().nullable(),
  guestName: z.string().nullable(),
  amountCents: z.number(),
  currency: z.string(),
  fundId: z.string().nullable(),
  method: PaymentMethodSchema,
  receivedAt: z.string(),
  note: z.string().nullable(),
  createdAt: z.string(),
  member: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }).nullable().optional(),
  fund: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
})

export const DonationListResponseSchema = z.object({
  donations: z.array(DonationResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export type CreateDonation = z.infer<typeof CreateDonationSchema>
export type UpdateDonation = z.infer<typeof UpdateDonationSchema>
export type DonationResponse = z.infer<typeof DonationResponseSchema>
export type DonationListResponse = z.infer<typeof DonationListResponseSchema>

// ============================================
// Pledge Schemas
// ============================================

export const CreatePledgeSchema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  fundId: z.string().nullable().optional(),
  amountCents: z.number().int().positive('Amount must be positive'),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  status: PledgeStatusSchema.optional().default('active'),
})

export const UpdatePledgeSchema = CreatePledgeSchema.partial()

export const PledgeResponseSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  fundId: z.string().nullable(),
  amountCents: z.number(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  status: PledgeStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  member: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }).optional(),
  fund: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
})

export const PledgeListResponseSchema = z.object({
  pledges: z.array(PledgeResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export type CreatePledge = z.infer<typeof CreatePledgeSchema>
export type UpdatePledge = z.infer<typeof UpdatePledgeSchema>
export type PledgeResponse = z.infer<typeof PledgeResponseSchema>
export type PledgeListResponse = z.infer<typeof PledgeListResponseSchema>

// ============================================
// Vendor Schemas
// ============================================

export const CreateVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(100),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  street: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
})

export const UpdateVendorSchema = CreateVendorSchema.partial()

export const VendorResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  street: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const VendorListResponseSchema = z.object({
  vendors: z.array(VendorResponseSchema),
  total: z.number(),
})

export type CreateVendor = z.infer<typeof CreateVendorSchema>
export type UpdateVendor = z.infer<typeof UpdateVendorSchema>
export type VendorResponse = z.infer<typeof VendorResponseSchema>
export type VendorListResponse = z.infer<typeof VendorListResponseSchema>

// ============================================
// Expense Schemas
// ============================================

export const CreateExpenseSchema = z.object({
  vendorId: z.string().nullable().optional(),
  fundId: z.string().nullable().optional(),
  amountCents: z.number().int().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  expenseDate: z.string().datetime(),
  category: z.string().max(100).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
})

export const UpdateExpenseSchema = CreateExpenseSchema.partial()

export const ExpenseResponseSchema = z.object({
  id: z.string(),
  vendorId: z.string().nullable(),
  fundId: z.string().nullable(),
  amountCents: z.number(),
  currency: z.string(),
  expenseDate: z.string(),
  category: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  vendor: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
  fund: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
})

export const ExpenseListResponseSchema = z.object({
  expenses: z.array(ExpenseResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export type CreateExpense = z.infer<typeof CreateExpenseSchema>
export type UpdateExpense = z.infer<typeof UpdateExpenseSchema>
export type ExpenseResponse = z.infer<typeof ExpenseResponseSchema>
export type ExpenseListResponse = z.infer<typeof ExpenseListResponseSchema>

// ============================================
// Invoice Schemas
// ============================================

export const InvoiceItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().positive('Quantity must be positive'),
  unitPriceCents: z.number().int().min(0, 'Unit price cannot be negative'),
})

export const CreateInvoiceSchema = z.object({
  vendorId: z.string().nullable().optional(),
  billToName: z.string().max(200).nullable().optional(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime().nullable().optional(),
  status: InvoiceStatusSchema.optional().default('draft'),
  taxCents: z.number().int().min(0).optional().default(0),
  note: z.string().max(1000).nullable().optional(),
  items: z.array(InvoiceItemInputSchema).optional(),
})

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial()

export const InvoiceItemResponseSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitPriceCents: z.number(),
  lineTotalCents: z.number(),
  sortOrder: z.number(),
})

export const InvoiceResponseSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  vendorId: z.string().nullable(),
  billToName: z.string().nullable(),
  issueDate: z.string(),
  dueDate: z.string().nullable(),
  status: InvoiceStatusSchema,
  subtotalCents: z.number(),
  taxCents: z.number(),
  totalCents: z.number(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  vendor: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
  items: z.array(InvoiceItemResponseSchema).optional(),
})

export const InvoiceListResponseSchema = z.object({
  invoices: z.array(InvoiceResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export const CreateInvoiceItemSchema = InvoiceItemInputSchema.extend({
  sortOrder: z.number().int().optional(),
})

export const UpdateInvoiceItemSchema = CreateInvoiceItemSchema.partial()

export type InvoiceItemInput = z.infer<typeof InvoiceItemInputSchema>
export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>
export type UpdateInvoice = z.infer<typeof UpdateInvoiceSchema>
export type InvoiceItemResponse = z.infer<typeof InvoiceItemResponseSchema>
export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>
export type InvoiceListResponse = z.infer<typeof InvoiceListResponseSchema>
export type CreateInvoiceItem = z.infer<typeof CreateInvoiceItemSchema>
export type UpdateInvoiceItem = z.infer<typeof UpdateInvoiceItemSchema>

// ============================================
// Purchase Order Schemas
// ============================================

export const PurchaseOrderItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().positive('Quantity must be positive'),
  unitPriceCents: z.number().int().min(0, 'Unit price cannot be negative'),
})

export const CreatePurchaseOrderSchema = z.object({
  vendorId: z.string().nullable().optional(),
  issueDate: z.string().datetime(),
  status: PurchaseOrderStatusSchema.optional().default('draft'),
  taxCents: z.number().int().min(0).optional().default(0),
  note: z.string().max(1000).nullable().optional(),
  items: z.array(PurchaseOrderItemInputSchema).optional(),
})

export const UpdatePurchaseOrderSchema = CreatePurchaseOrderSchema.partial()

export const PurchaseOrderItemResponseSchema = z.object({
  id: z.string(),
  purchaseOrderId: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitPriceCents: z.number(),
  lineTotalCents: z.number(),
  sortOrder: z.number(),
})

export const PurchaseOrderResponseSchema = z.object({
  id: z.string(),
  poNumber: z.string(),
  vendorId: z.string().nullable(),
  requestorUserId: z.string().nullable(),
  issueDate: z.string(),
  status: PurchaseOrderStatusSchema,
  subtotalCents: z.number(),
  taxCents: z.number(),
  totalCents: z.number(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  vendor: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
  requestorUser: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }).nullable().optional(),
  items: z.array(PurchaseOrderItemResponseSchema).optional(),
})

export const PurchaseOrderListResponseSchema = z.object({
  purchaseOrders: z.array(PurchaseOrderResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export const CreatePurchaseOrderItemSchema = PurchaseOrderItemInputSchema.extend({
  sortOrder: z.number().int().optional(),
})

export const UpdatePurchaseOrderItemSchema = CreatePurchaseOrderItemSchema.partial()

export type PurchaseOrderItemInput = z.infer<typeof PurchaseOrderItemInputSchema>
export type CreatePurchaseOrder = z.infer<typeof CreatePurchaseOrderSchema>
export type UpdatePurchaseOrder = z.infer<typeof UpdatePurchaseOrderSchema>
export type PurchaseOrderItemResponse = z.infer<typeof PurchaseOrderItemResponseSchema>
export type PurchaseOrderResponse = z.infer<typeof PurchaseOrderResponseSchema>
export type PurchaseOrderListResponse = z.infer<typeof PurchaseOrderListResponseSchema>
export type CreatePurchaseOrderItem = z.infer<typeof CreatePurchaseOrderItemSchema>
export type UpdatePurchaseOrderItem = z.infer<typeof UpdatePurchaseOrderItemSchema>

// ============================================
// Report Schemas
// ============================================

export const FundBalanceSchema = z.object({
  fundId: z.string().nullable(),
  fundName: z.string().nullable(),
  incomeCents: z.number(),
  expensesCents: z.number(),
  netCents: z.number(),
})

export const FundSummaryResponseSchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  funds: z.array(FundBalanceSchema),
  totals: z.object({
    incomeCents: z.number(),
    expensesCents: z.number(),
    netCents: z.number(),
  }),
})

export const DonorGivingSchema = z.object({
  memberId: z.string().nullable(),
  memberName: z.string().nullable(),
  guestName: z.string().nullable(),
  totalCents: z.number(),
  donationCount: z.number(),
})

export const GivingSummaryResponseSchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  donors: z.array(DonorGivingSchema),
  totalCents: z.number(),
  totalDonations: z.number(),
})

export const DonorStatementDonationSchema = z.object({
  id: z.string(),
  receivedAt: z.string(),
  amountCents: z.number(),
  fundName: z.string().nullable(),
  method: PaymentMethodSchema,
})

export const DonorStatementResponseSchema = z.object({
  member: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().nullable(),
    street: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    zip: z.string().nullable(),
  }),
  year: z.number(),
  donations: z.array(DonorStatementDonationSchema),
  totalCents: z.number(),
})

export type FundBalance = z.infer<typeof FundBalanceSchema>
export type FundSummaryResponse = z.infer<typeof FundSummaryResponseSchema>
export type DonorGiving = z.infer<typeof DonorGivingSchema>
export type GivingSummaryResponse = z.infer<typeof GivingSummaryResponseSchema>
export type DonorStatementDonation = z.infer<typeof DonorStatementDonationSchema>
export type DonorStatementResponse = z.infer<typeof DonorStatementResponseSchema>

