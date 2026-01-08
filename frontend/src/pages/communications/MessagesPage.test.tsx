import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import MessagesPage from './MessagesPage'

// Mock the useCommunications hook
vi.mock('../../hooks/useCommunications', () => ({
  useMessages: vi.fn(),
}))

import { useMessages } from '../../hooks/useCommunications'

describe('MessagesPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MessagesPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('shows loading state', () => {
    vi.mocked(useMessages).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useMessages>)

    renderComponent()
    expect(screen.getByText(/loading messages/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    vi.mocked(useMessages).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as unknown as ReturnType<typeof useMessages>)

    renderComponent()
    expect(screen.getByText(/error loading messages/i)).toBeInTheDocument()
  })

  it('shows empty state when no messages', () => {
    vi.mocked(useMessages).mockReturnValue({
      data: {
        messages: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMessages>)

    renderComponent()
    expect(screen.getByText(/no messages sent yet/i)).toBeInTheDocument()
  })

  it('renders messages list', () => {
    vi.mocked(useMessages).mockReturnValue({
      data: {
        messages: [
          {
            id: '1',
            channel: 'email' as const,
            subject: 'Test Subject',
            body: 'Test body content',
            createdByUserId: 'user1',
            createdAt: '2024-01-08T10:00:00Z',
            createdByUser: { id: 'user1', name: 'Admin', email: 'admin@test.com' },
            _count: { recipients: 5 },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMessages>)

    renderComponent()
    
    expect(screen.getByText('Test Subject')).toBeInTheDocument()
    expect(screen.getByText(/5 recipients/i)).toBeInTheDocument()
  })

  it('renders compose message button', () => {
    vi.mocked(useMessages).mockReturnValue({
      data: {
        messages: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMessages>)

    renderComponent()
    expect(screen.getByText('Compose Message')).toBeInTheDocument()
  })

  it('renders manage templates button', () => {
    vi.mocked(useMessages).mockReturnValue({
      data: {
        messages: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMessages>)

    renderComponent()
    expect(screen.getByText('Manage Templates')).toBeInTheDocument()
  })
})
