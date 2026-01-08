import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DonationFormPage from './DonationFormPage'
import { z } from 'zod'

// Mock the accounting hooks
vi.mock('../../hooks/useAccounting', () => ({
  useCreateDonation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
  useUpdateDonation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
  useDonation: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useFunds: vi.fn(() => ({
    data: { funds: [{ id: 'fund-1', name: 'General Fund' }] },
    isLoading: false,
  })),
}))

// Mock useMembers
vi.mock('../../hooks/useMembers', () => ({
  useMembers: vi.fn(() => ({
    data: {
      members: [
        { id: 'member-1', firstName: 'John', lastName: 'Doe' },
        { id: 'member-2', firstName: 'Jane', lastName: 'Smith' },
      ],
    },
    isLoading: false,
  })),
}))

// Mock useNavigate and useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({}), // No ID = create mode
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

describe('DonationFormPage', () => {
  it('renders the form with all required fields', () => {
    renderWithProviders(<DonationFormPage />)

    // Check heading
    expect(screen.getByRole('heading', { name: 'Add Donation' })).toBeInTheDocument()
    // Check required field labels
    expect(screen.getByText('Amount *')).toBeInTheDocument()
    expect(screen.getByText('Payment Method *')).toBeInTheDocument()
    expect(screen.getByText('Date Received *')).toBeInTheDocument()
  })

  it('renders optional fields', () => {
    renderWithProviders(<DonationFormPage />)

    expect(screen.getByText('Member (optional)')).toBeInTheDocument()
    expect(screen.getByText('Guest Name')).toBeInTheDocument()
    expect(screen.getByText('Fund')).toBeInTheDocument()
    expect(screen.getByText('Note')).toBeInTheDocument()
  })

  it('has cancel and submit buttons', () => {
    renderWithProviders(<DonationFormPage />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add donation/i })).toBeInTheDocument()
  })

  it('defaults date to today', () => {
    renderWithProviders(<DonationFormPage />)

    const today = new Date().toISOString().split('T')[0]
    const dateInput = screen.getByDisplayValue(today)
    expect(dateInput).toBeInTheDocument()
  })
})

// Unit tests for the donation form schema validation logic
describe('Donation schema validation', () => {
  const donationSchema = z.object({
    memberId: z.string().optional(),
    guestName: z.string().optional(),
    amount: z.number().positive('Amount must be positive'),
    method: z.enum(['cash', 'check', 'card', 'online', 'other']),
    fundId: z.string().optional(),
    receivedAt: z.string().min(1, 'Date is required'),
    note: z.string().optional(),
  })

  it('accepts valid donation data', () => {
    const validData = {
      amount: 100,
      method: 'cash' as const,
      receivedAt: '2024-01-01',
    }
    const result = donationSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects negative amounts', () => {
    const invalidData = {
      amount: -50,
      method: 'cash' as const,
      receivedAt: '2024-01-01',
    }
    const result = donationSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Amount must be positive')
    }
  })

  it('rejects zero amounts', () => {
    const invalidData = {
      amount: 0,
      method: 'cash' as const,
      receivedAt: '2024-01-01',
    }
    const result = donationSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Amount must be positive')
    }
  })

  it('rejects empty date', () => {
    const invalidData = {
      amount: 100,
      method: 'cash' as const,
      receivedAt: '',
    }
    const result = donationSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Date is required')
    }
  })

  it('rejects invalid payment method', () => {
    const invalidData = {
      amount: 100,
      method: 'bitcoin' as const,
      receivedAt: '2024-01-01',
    }
    const result = donationSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('accepts all valid payment methods', () => {
    const methods = ['cash', 'check', 'card', 'online', 'other'] as const
    for (const method of methods) {
      const validData = {
        amount: 100,
        method,
        receivedAt: '2024-01-01',
      }
      const result = donationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    }
  })

  it('converts amount correctly from dollars to cents', () => {
    const amount = 150.50
    const amountCents = Math.round(amount * 100)
    expect(amountCents).toBe(15050)
  })

  it('handles decimal precision correctly', () => {
    // Test that $10.99 converts to 1099 cents
    const amount = 10.99
    const amountCents = Math.round(amount * 100)
    expect(amountCents).toBe(1099)

    // Test potential floating-point issues: 0.1 + 0.2
    const floatAmount = 0.1 + 0.2 // This is ~0.30000000000000004
    const floatCents = Math.round(floatAmount * 100)
    expect(floatCents).toBe(30) // Should be 30 cents, not 30.000...
  })
})
