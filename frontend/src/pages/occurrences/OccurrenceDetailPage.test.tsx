import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OccurrenceDetailPage from './OccurrenceDetailPage'

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: 'test-occurrence-id' }),
  }
})

// Mock the API
vi.mock('../../lib/api', () => ({
  getToken: vi.fn(() => 'test-token'),
}))

// Mock the hooks
vi.mock('../../hooks/useOccurrences', () => ({
  useOccurrence: vi.fn(() => ({
    data: {
      id: 'test-occurrence-id',
      eventId: 'test-event-id',
      startsAt: new Date().toISOString(),
      endsAt: null,
      status: 'scheduled',
      notes: null,
      event: {
        id: 'test-event-id',
        title: 'Sunday Service',
        description: 'Weekly worship',
        location: 'Main Sanctuary',
        category: 'Church-wide',
      },
      registrations: [
        {
          id: 'reg-1',
          eventOccurrenceId: 'test-occurrence-id',
          memberId: 'member-1',
          guestName: null,
          partySize: 2,
          status: 'registered',
          createdAt: new Date().toISOString(),
          member: { id: 'member-1', firstName: 'John', lastName: 'Doe' },
        },
      ],
      checkIns: [
        {
          id: 'checkin-1',
          eventOccurrenceId: 'test-occurrence-id',
          memberId: 'member-1',
          guestName: null,
          checkedInAt: new Date().toISOString(),
          method: 'manual',
          member: { id: 'member-1', firstName: 'John', lastName: 'Doe' },
        },
      ],
      worshipPlan: null,
    },
    isLoading: false,
    error: null,
  })),
  useUpdateOccurrence: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useCreateRegistration: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useCancelRegistration: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useCreateCheckIn: vi.fn(() => ({ mutateAsync: vi.fn() })),
}))

vi.mock('../../hooks/useWorshipPlans', () => ({
  useWorshipPlan: vi.fn(() => ({
    data: null,
    error: { status: 404 },
  })),
  useCreateWorshipPlan: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useCreateWorshipPlanItem: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteWorshipPlanItem: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useReorderWorshipPlanItems: vi.fn(() => ({ mutateAsync: vi.fn() })),
}))

vi.mock('../../hooks/useSongs', () => ({
  useSongs: vi.fn(() => ({
    data: { songs: [] },
  })),
}))

vi.mock('../../hooks/useMembers', () => ({
  useMembers: vi.fn(() => ({
    data: { members: [] },
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

describe('OccurrenceDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the occurrence details', async () => {
    renderWithProviders(<OccurrenceDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sunday Service')
    })

    expect(screen.getByText('scheduled')).toBeInTheDocument()
  })

  it('displays registrations section', async () => {
    renderWithProviders(<OccurrenceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Registrations')).toBeInTheDocument()
    })

    // John Doe appears in both registrations and check-ins
    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
  })

  it('displays check-ins section', async () => {
    renderWithProviders(<OccurrenceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Check-ins')).toBeInTheDocument()
    })

    expect(screen.getByText('manual')).toBeInTheDocument()
  })

  it('shows create worship plan button when no plan exists', async () => {
    renderWithProviders(<OccurrenceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Create Worship Plan')).toBeInTheDocument()
    })
  })

  it('has add registration button', async () => {
    renderWithProviders(<OccurrenceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Registration')).toBeInTheDocument()
    })
  })

  it('has add check-in button', async () => {
    renderWithProviders(<OccurrenceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Check-in')).toBeInTheDocument()
    })
  })

  it('shows registration form when add registration is clicked', async () => {
    renderWithProviders(<OccurrenceDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Registration')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add Registration')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Party Size')).toBeInTheDocument()
    })
  })
})

