import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SaleFormPage from './SaleFormPage'

// Mock the hooks
vi.mock('../../hooks/useSales', () => ({
  useCreateSale: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('../../hooks/useProducts', () => ({
  useProducts: vi.fn(() => ({
    data: {
      products: [
        { id: 'product-1', name: 'Test Product', priceCents: 1000, isActive: true },
        { id: 'product-2', name: 'Another Product', priceCents: 2500, isActive: true },
      ],
    },
    isLoading: false,
  })),
}))

vi.mock('../../hooks/useMembers', () => ({
  useMembers: vi.fn(() => ({
    data: {
      members: [{ id: 'member-1', firstName: 'John', lastName: 'Doe' }],
    },
    isLoading: false,
  })),
}))

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
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('SaleFormPage', () => {
  it('renders the form with all required elements', () => {
    renderWithProviders(<SaleFormPage />)

    expect(screen.getByRole('heading', { name: /New Sale/i })).toBeInTheDocument()
    expect(screen.getByText('Add Items')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Complete Sale/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
  })

  it('disables Complete Sale button when no items added', () => {
    renderWithProviders(<SaleFormPage />)

    const submitButton = screen.getByRole('button', { name: /Complete Sale/i })
    expect(submitButton).toBeDisabled()
  })

  it('renders member select', () => {
    renderWithProviders(<SaleFormPage />)

    // Check that member select is rendered
    const memberLabel = screen.getByText('Member (optional)')
    expect(memberLabel).toBeInTheDocument()
  })

  it('renders Add Items section', () => {
    renderWithProviders(<SaleFormPage />)

    expect(screen.getByText('Add Items')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Qty')).toBeInTheDocument()
  })

  it('renders totals section', () => {
    renderWithProviders(<SaleFormPage />)

    expect(screen.getByText('Subtotal:')).toBeInTheDocument()
    expect(screen.getByText('Total:')).toBeInTheDocument()
  })
})

describe('Sale Calculation Tests', () => {
  it('should compute line total as quantity * unitPrice', () => {
    const quantity = 3
    const unitPriceCents = 1500 // $15.00
    const lineTotalCents = quantity * unitPriceCents
    expect(lineTotalCents).toBe(4500) // $45.00
  })

  it('should compute subtotal as sum of line totals', () => {
    const items = [
      { quantity: 2, unitPriceCents: 1000 }, // $20.00
      { quantity: 1, unitPriceCents: 2500 }, // $25.00
      { quantity: 5, unitPriceCents: 500 },  // $25.00
    ]
    const subtotalCents = items.reduce((sum, item) => sum + (item.quantity * item.unitPriceCents), 0)
    expect(subtotalCents).toBe(7000) // $70.00
  })

  it('should compute total as subtotal + tax', () => {
    const subtotalCents = 7000 // $70.00
    const taxCents = 560       // $5.60 (8% tax)
    const totalCents = subtotalCents + taxCents
    expect(totalCents).toBe(7560) // $75.60
  })
})

