import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  // Funds
  getFunds,
  getFund,
  createFund,
  updateFund,
  deleteFund,
  CreateFundData,
  // Donations
  getDonations,
  getDonation,
  createDonation,
  updateDonation,
  deleteDonation,
  DonationSearchParams,
  CreateDonationData,
  // Pledges
  getPledges,
  getPledge,
  createPledge,
  updatePledge,
  deletePledge,
  PledgeSearchParams,
  CreatePledgeData,
  // Vendors
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  CreateVendorData,
  // Expenses
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  ExpenseSearchParams,
  CreateExpenseData,
  // Invoices
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  InvoiceSearchParams,
  CreateInvoiceData,
  InvoiceItemInput,
  // Purchase Orders
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  addPurchaseOrderItem,
  updatePurchaseOrderItem,
  deletePurchaseOrderItem,
  PurchaseOrderSearchParams,
  CreatePurchaseOrderData,
  PurchaseOrderItemInput,
  // Reports
  getFundsSummary,
  getGivingSummary,
  getDonorStatement,
} from '../lib/api'

// ============================================
// Fund Hooks
// ============================================

export function useFunds() {
  return useQuery({
    queryKey: ['funds'],
    queryFn: getFunds,
  })
}

export function useFund(id: string) {
  return useQuery({
    queryKey: ['funds', id],
    queryFn: () => getFund(id),
    enabled: !!id,
  })
}

export function useCreateFund() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFundData) => createFund(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] })
    },
  })
}

export function useUpdateFund() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateFundData> }) =>
      updateFund(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['funds'] })
      queryClient.invalidateQueries({ queryKey: ['funds', id] })
    },
  })
}

export function useDeleteFund() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFund(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] })
    },
  })
}

// ============================================
// Donation Hooks
// ============================================

export function useDonations(params: DonationSearchParams = {}) {
  return useQuery({
    queryKey: ['donations', params],
    queryFn: () => getDonations(params),
  })
}

export function useDonation(id: string) {
  return useQuery({
    queryKey: ['donations', id],
    queryFn: () => getDonation(id),
    enabled: !!id,
  })
}

export function useCreateDonation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDonationData) => createDonation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] })
    },
  })
}

export function useUpdateDonation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDonationData> }) =>
      updateDonation(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['donations'] })
      queryClient.invalidateQueries({ queryKey: ['donations', id] })
    },
  })
}

export function useDeleteDonation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDonation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] })
    },
  })
}

// ============================================
// Pledge Hooks
// ============================================

export function usePledges(params: PledgeSearchParams = {}) {
  return useQuery({
    queryKey: ['pledges', params],
    queryFn: () => getPledges(params),
  })
}

export function usePledge(id: string) {
  return useQuery({
    queryKey: ['pledges', id],
    queryFn: () => getPledge(id),
    enabled: !!id,
  })
}

export function useCreatePledge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePledgeData) => createPledge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pledges'] })
    },
  })
}

export function useUpdatePledge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePledgeData> }) =>
      updatePledge(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pledges'] })
      queryClient.invalidateQueries({ queryKey: ['pledges', id] })
    },
  })
}

export function useDeletePledge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pledges'] })
    },
  })
}

// ============================================
// Vendor Hooks
// ============================================

export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: getVendors,
  })
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ['vendors', id],
    queryFn: () => getVendor(id),
    enabled: !!id,
  })
}

export function useCreateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateVendorData) => createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useUpdateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateVendorData> }) =>
      updateVendor(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['vendors', id] })
    },
  })
}

export function useDeleteVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

// ============================================
// Expense Hooks
// ============================================

export function useExpenses(params: ExpenseSearchParams = {}) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => getExpenses(params),
  })
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: () => getExpense(id),
    enabled: !!id,
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateExpenseData) => createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateExpenseData> }) =>
      updateExpense(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses', id] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

// ============================================
// Invoice Hooks
// ============================================

export function useInvoices(params: InvoiceSearchParams = {}) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => getInvoices(params),
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => getInvoice(id),
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInvoiceData) => createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateInvoiceData> }) =>
      updateInvoice(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', id] })
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useAddInvoiceItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: InvoiceItemInput & { sortOrder?: number } }) =>
      addInvoiceItem(invoiceId, data),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] })
    },
  })
}

export function useUpdateInvoiceItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; invoiceId: string; data: Partial<InvoiceItemInput & { sortOrder?: number }> }) =>
      updateInvoiceItem(itemId, data),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] })
    },
  })
}

export function useDeleteInvoiceItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId }: { itemId: string; invoiceId: string }) =>
      deleteInvoiceItem(itemId),
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] })
    },
  })
}

// ============================================
// Purchase Order Hooks
// ============================================

export function usePurchaseOrders(params: PurchaseOrderSearchParams = {}) {
  return useQuery({
    queryKey: ['purchaseOrders', params],
    queryFn: () => getPurchaseOrders(params),
  })
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchaseOrders', id],
    queryFn: () => getPurchaseOrder(id),
    enabled: !!id,
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePurchaseOrderData) => createPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
    },
  })
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePurchaseOrderData> }) =>
      updatePurchaseOrder(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', id] })
    },
  })
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
    },
  })
}

export function useAddPurchaseOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: PurchaseOrderItemInput & { sortOrder?: number } }) =>
      addPurchaseOrderItem(poId, data),
    onSuccess: (_, { poId }) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', poId] })
    },
  })
}

export function useUpdatePurchaseOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; poId: string; data: Partial<PurchaseOrderItemInput & { sortOrder?: number }> }) =>
      updatePurchaseOrderItem(itemId, data),
    onSuccess: (_, { poId }) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', poId] })
    },
  })
}

export function useDeletePurchaseOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId }: { itemId: string; poId: string }) =>
      deletePurchaseOrderItem(itemId),
    onSuccess: (_, { poId }) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', poId] })
    },
  })
}

// ============================================
// Report Hooks
// ============================================

export function useFundsSummary(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['reports', 'fundsSummary', dateFrom, dateTo],
    queryFn: () => getFundsSummary(dateFrom, dateTo),
    enabled: !!dateFrom && !!dateTo,
  })
}

export function useGivingSummary(dateFrom: string, dateTo: string, memberId?: string) {
  return useQuery({
    queryKey: ['reports', 'givingSummary', dateFrom, dateTo, memberId],
    queryFn: () => getGivingSummary(dateFrom, dateTo, memberId),
    enabled: !!dateFrom && !!dateTo,
  })
}

export function useDonorStatement(memberId: string, year: number) {
  return useQuery({
    queryKey: ['reports', 'donorStatement', memberId, year],
    queryFn: () => getDonorStatement(memberId, year),
    enabled: !!memberId && !!year,
  })
}

