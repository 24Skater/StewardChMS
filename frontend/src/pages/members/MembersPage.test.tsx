import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MembersPage from './MembersPage'

// Mock the useMembers hook
vi.mock('@/hooks/useMembers', () => ({
  useMembers: vi.fn(() => ({
    data: {
      members: [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: null,
          phone: null,
          status: 'visitor',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
    isLoading: false,
    error: null,
  })),
  useDeleteMember: vi.fn(() => ({
    mutate: vi.fn(),
  })),
}))

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

describe('MembersPage', () => {
  it('renders the members list', () => {
    renderWithProviders(<MembersPage />)
    
    expect(screen.getByText('Members')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('displays member emails', () => {
    renderWithProviders(<MembersPage />)
    
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('displays status badges', () => {
    renderWithProviders(<MembersPage />)
    
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Visitor')).toBeInTheDocument()
  })

  it('has Add Member button', () => {
    renderWithProviders(<MembersPage />)
    
    expect(screen.getByText('Add Member')).toBeInTheDocument()
  })

  it('has Import CSV button', () => {
    renderWithProviders(<MembersPage />)
    
    expect(screen.getByText('Import CSV')).toBeInTheDocument()
  })

  it('has search input', () => {
    renderWithProviders(<MembersPage />)
    
    expect(screen.getByPlaceholderText('Search by name or email...')).toBeInTheDocument()
  })
})

