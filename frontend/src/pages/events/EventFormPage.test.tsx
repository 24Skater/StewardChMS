import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EventFormPage from './EventFormPage'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  }
})

// Mock the API
vi.mock('../../lib/api', () => ({
  getToken: vi.fn(() => 'test-token'),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  getEvent: vi.fn(),
}))

// Mock the hooks
vi.mock('../../hooks/useEvents', () => ({
  useEvent: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useCreateEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-event-id' }),
    isPending: false,
  })),
  useUpdateEvent: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('EventFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the create event form', async () => {
    renderWithProviders(<EventFormPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create Event/i })).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Location/i)).toBeInTheDocument()
  })

  it('shows validation error when title is empty', async () => {
    renderWithProviders(<EventFormPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create Event/i })).toBeInTheDocument()
    })

    // Submit without filling title - find the submit button specifically
    const submitButtons = screen.getAllByRole('button')
    const submitButton = submitButtons.find(btn => btn.textContent === 'Create Event')
    fireEvent.click(submitButton!)

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument()
    })
  })

  it('has recurring event checkbox', async () => {
    renderWithProviders(<EventFormPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/This is a recurring event/i)).toBeInTheDocument()
    })
  })

  it('shows recurrence options when recurring is checked', async () => {
    renderWithProviders(<EventFormPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create Event/i })).toBeInTheDocument()
    })

    const recurringCheckbox = screen.getByLabelText(/This is a recurring event/i)
    fireEvent.click(recurringCheckbox)

    await waitFor(() => {
      expect(screen.getByText('Recurrence Pattern')).toBeInTheDocument()
      expect(screen.getByText('Day of Week')).toBeInTheDocument()
    })
  })

  it('has cancel button that navigates back', async () => {
    renderWithProviders(<EventFormPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create Event/i })).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelButton)

    expect(mockNavigate).toHaveBeenCalledWith('/events')
  })
})

