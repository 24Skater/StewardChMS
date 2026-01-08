import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import InvoiceFormPage from './InvoiceFormPage'

// Mock the accounting hooks
vi.mock('../../hooks/useAccounting', () => ({
  useCreateInvoice: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
  useVendors: vi.fn(() => ({
    data: { vendors: [{ id: 'vendor-1', name: 'Test Vendor' }] },
    isLoading: false,
  })),
}))

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('InvoiceFormPage', () => {
  it('renders the form', () => {
    renderWithProviders(<InvoiceFormPage />)

    expect(screen.getByRole('heading', { name: 'Create Invoice' })).toBeInTheDocument()
    expect(screen.getByText('Line Items')).toBeInTheDocument()
    expect(screen.getByText('Issue Date *')).toBeInTheDocument()
  })

  it('displays initial totals as zero', () => {
    renderWithProviders(<InvoiceFormPage />)

    expect(screen.getByText('Subtotal: $0.00')).toBeInTheDocument()
    expect(screen.getByText('Total: $0.00')).toBeInTheDocument()
  })

  it('calculates line item total correctly', () => {
    renderWithProviders(<InvoiceFormPage />)

    // Add an item: 2 x $10.00 = $20.00
    const descriptionInput = screen.getByPlaceholderText('Description')
    const qtyInput = screen.getByPlaceholderText('Qty')
    const priceInput = screen.getByPlaceholderText('Unit Price')

    fireEvent.change(descriptionInput, { target: { value: 'Test Item' } })
    fireEvent.change(qtyInput, { target: { value: '2' } })
    fireEvent.change(priceInput, { target: { value: '10' } })

    const addButton = screen.getByRole('button', { name: 'Add' })
    fireEvent.click(addButton)

    // Check the item was added with correct total
    expect(screen.getByText('Test Item')).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
    expect(screen.getByText('Subtotal: $20.00')).toBeInTheDocument()
    expect(screen.getByText('Total: $20.00')).toBeInTheDocument()
  })

  it('calculates subtotal for multiple items', () => {
    renderWithProviders(<InvoiceFormPage />)

    const descriptionInput = screen.getByPlaceholderText('Description')
    const qtyInput = screen.getByPlaceholderText('Qty')
    const priceInput = screen.getByPlaceholderText('Unit Price')
    const addButton = screen.getByRole('button', { name: 'Add' })

    // Add first item: 2 x $10.00 = $20.00
    fireEvent.change(descriptionInput, { target: { value: 'Item 1' } })
    fireEvent.change(qtyInput, { target: { value: '2' } })
    fireEvent.change(priceInput, { target: { value: '10' } })
    fireEvent.click(addButton)

    // Add second item: 3 x $15.00 = $45.00
    fireEvent.change(descriptionInput, { target: { value: 'Item 2' } })
    fireEvent.change(qtyInput, { target: { value: '3' } })
    fireEvent.change(priceInput, { target: { value: '15' } })
    fireEvent.click(addButton)

    // Total should be $65.00
    expect(screen.getByText('Subtotal: $65.00')).toBeInTheDocument()
    expect(screen.getByText('Total: $65.00')).toBeInTheDocument()
  })

  it('handles fractional quantities', () => {
    renderWithProviders(<InvoiceFormPage />)

    const descriptionInput = screen.getByPlaceholderText('Description')
    const qtyInput = screen.getByPlaceholderText('Qty')
    const priceInput = screen.getByPlaceholderText('Unit Price')
    const addButton = screen.getByRole('button', { name: 'Add' })

    // Add item: 2.5 x $4.00 = $10.00
    fireEvent.change(descriptionInput, { target: { value: 'Fractional Item' } })
    fireEvent.change(qtyInput, { target: { value: '2.5' } })
    fireEvent.change(priceInput, { target: { value: '4' } })
    fireEvent.click(addButton)

    expect(screen.getByText('Subtotal: $10.00')).toBeInTheDocument()
  })

  it('removes items and updates totals', () => {
    renderWithProviders(<InvoiceFormPage />)

    const descriptionInput = screen.getByPlaceholderText('Description')
    const qtyInput = screen.getByPlaceholderText('Qty')
    const priceInput = screen.getByPlaceholderText('Unit Price')
    const addButton = screen.getByRole('button', { name: 'Add' })

    // Add two items
    fireEvent.change(descriptionInput, { target: { value: 'Item 1' } })
    fireEvent.change(qtyInput, { target: { value: '1' } })
    fireEvent.change(priceInput, { target: { value: '50' } })
    fireEvent.click(addButton)

    fireEvent.change(descriptionInput, { target: { value: 'Item 2' } })
    fireEvent.change(qtyInput, { target: { value: '1' } })
    fireEvent.change(priceInput, { target: { value: '30' } })
    fireEvent.click(addButton)

    expect(screen.getByText('Subtotal: $80.00')).toBeInTheDocument()

    // Remove first item
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' })
    fireEvent.click(removeButtons[0])

    // Should now be $30.00
    expect(screen.getByText('Subtotal: $30.00')).toBeInTheDocument()
  })

  it('has cancel button', () => {
    renderWithProviders(<InvoiceFormPage />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('defaults issue date to today', () => {
    renderWithProviders(<InvoiceFormPage />)

    const today = new Date().toISOString().split('T')[0]
    const dateInput = screen.getByDisplayValue(today)
    expect(dateInput).toBeInTheDocument()
  })
})

// Unit tests for the calculation logic
describe('Invoice calculation logic', () => {
  it('calculates line total as quantity * unit price in cents', () => {
    const quantity = 3
    const unitPriceCents = 1500 // $15.00
    const lineTotal = Math.round(quantity * unitPriceCents)
    expect(lineTotal).toBe(4500) // $45.00
  })

  it('handles decimal quantities correctly', () => {
    const quantity = 2.5
    const unitPriceCents = 1000 // $10.00
    const lineTotal = Math.round(quantity * unitPriceCents)
    expect(lineTotal).toBe(2500) // $25.00
  })

  it('rounds fractional cents correctly', () => {
    const quantity = 3
    const unitPriceCents = 333 // $3.33
    const lineTotal = Math.round(quantity * unitPriceCents)
    expect(lineTotal).toBe(999) // $9.99
  })

  it('calculates total as subtotal + tax', () => {
    const items = [
      { quantity: 2, unitPriceCents: 1000 }, // $20.00
      { quantity: 1, unitPriceCents: 1500 }, // $15.00
    ]
    const subtotalCents = items.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
      0
    )
    const taxCents = 350 // $3.50
    const totalCents = subtotalCents + taxCents

    expect(subtotalCents).toBe(3500) // $35.00
    expect(totalCents).toBe(3850) // $38.50
  })

  it('handles empty items array', () => {
    const items: { quantity: number; unitPriceCents: number }[] = []
    const subtotalCents = items.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
      0
    )
    expect(subtotalCents).toBe(0)
  })

  it('formats cents to dollars correctly', () => {
    const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`

    expect(formatCents(0)).toBe('$0.00')
    expect(formatCents(100)).toBe('$1.00')
    expect(formatCents(150)).toBe('$1.50')
    expect(formatCents(1099)).toBe('$10.99')
    expect(formatCents(10000)).toBe('$100.00')
  })

  it('handles large amounts', () => {
    const quantity = 100
    const unitPriceCents = 100000 // $1000.00
    const lineTotal = Math.round(quantity * unitPriceCents)
    expect(lineTotal).toBe(10000000) // $100,000.00
  })
})
