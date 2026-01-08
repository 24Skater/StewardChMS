import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EventsPage from './EventsPage'

// Mock the API
vi.mock('../../lib/api', () => ({
  getToken: vi.fn(() => 'test-token'),
  apiRequest: vi.fn(),
  getEvents: vi.fn(),
}))

// Mock useEvents hook
vi.mock('../../hooks/useEvents', () => ({
  useEvents: vi.fn(() => ({
    data: {
      events: [
        {
          id: '1',
          title: 'Sunday Service',
          description: 'Weekly worship service',
          location: 'Main Sanctuary',
          category: 'Church-wide',
          isRecurring: true,
          recurrenceRule: JSON.stringify({ frequency: 'weekly', dayOfWeek: 0 }),
          startDatetime: new Date().toISOString(),
          endDatetime: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Youth Night',
          description: 'Weekly youth gathering',
          location: 'Youth Center',
          category: 'Youth',
          isRecurring: true,
          recurrenceRule: JSON.stringify({ frequency: 'weekly', dayOfWeek: 5 }),
          startDatetime: new Date().toISOString(),
          endDatetime: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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

describe('EventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the events list', async () => {
    renderWithProviders(<EventsPage />)

    await waitFor(() => {
      expect(screen.getByText('Events')).toBeInTheDocument()
    })

    expect(screen.getByText('Sunday Service')).toBeInTheDocument()
    expect(screen.getByText('Youth Night')).toBeInTheDocument()
  })

  it('shows create event button', async () => {
    renderWithProviders(<EventsPage />)

    await waitFor(() => {
      expect(screen.getByText('Create Event')).toBeInTheDocument()
    })
  })

  it('displays event categories', async () => {
    renderWithProviders(<EventsPage />)

    await waitFor(() => {
      expect(screen.getByText('Church-wide')).toBeInTheDocument()
      expect(screen.getByText('Youth')).toBeInTheDocument()
    })
  })

  it('shows recurring badge for recurring events', async () => {
    renderWithProviders(<EventsPage />)

    await waitFor(() => {
      const recurringBadges = screen.getAllByText('Recurring')
      expect(recurringBadges.length).toBe(2)
    })
  })
})

