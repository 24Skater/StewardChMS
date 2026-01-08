import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MemberFormPage from './MemberFormPage'

// Mock the hooks
vi.mock('@/hooks/useMembers', () => ({
  useMember: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useCreateMember: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
  useUpdateMember: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
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

// Mock useAuth to return a user with permissions
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'test-user',
      email: 'admin@test.com',
      name: 'Admin',
      roles: ['admin'],
      permissions: ['members.read', 'members.write', 'members.notes'],
    },
    isLoading: false,
    isAuthenticated: true,
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

describe('MemberFormPage', () => {
  it('renders the form with all fields', () => {
    renderWithProviders(<MemberFormPage />)
    
    expect(screen.getByText('Add New Member')).toBeInTheDocument()
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument()
  })

  it('shows address fields', () => {
    renderWithProviders(<MemberFormPage />)
    
    expect(screen.getByLabelText(/Street Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/State/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ZIP Code/i)).toBeInTheDocument()
  })

  it('shows notes field for users with permission', () => {
    renderWithProviders(<MemberFormPage />)
    
    expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument()
  })

  it('shows validation error for empty first name', async () => {
    renderWithProviders(<MemberFormPage />)
    
    const submitButton = screen.getByText('Create Member')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument()
    })
  })

  it('shows validation error for empty last name', async () => {
    renderWithProviders(<MemberFormPage />)
    
    const firstNameInput = screen.getByLabelText(/First Name/i)
    fireEvent.change(firstNameInput, { target: { value: 'John' } })
    
    const submitButton = screen.getByText('Create Member')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Last name is required')).toBeInTheDocument()
    })
  })

  it('has cancel button', () => {
    renderWithProviders(<MemberFormPage />)
    
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
})

