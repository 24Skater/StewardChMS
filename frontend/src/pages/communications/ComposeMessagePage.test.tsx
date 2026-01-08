import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ComposeMessagePage from './ComposeMessagePage'

// Mock the hooks
vi.mock('../../hooks/useMembers', () => ({
  useMembers: vi.fn(),
}))

vi.mock('../../hooks/useCommunications', () => ({
  useMessageTemplates: vi.fn(),
  useSendMessage: vi.fn(),
}))

import { useMembers } from '../../hooks/useMembers'
import { useMessageTemplates, useSendMessage } from '../../hooks/useCommunications'

describe('ComposeMessagePage', () => {
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
          <ComposeMessagePage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders compose form', () => {
    vi.mocked(useMembers).mockReturnValue({
      data: { members: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useMembers>)

    vi.mocked(useMessageTemplates).mockReturnValue({
      data: { templates: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useMessageTemplates>)

    vi.mocked(useSendMessage).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useSendMessage>)

    renderComponent()

    expect(screen.getByText('Compose Message')).toBeInTheDocument()
    expect(screen.getByText('📧 Email')).toBeInTheDocument()
    expect(screen.getByText('📱 SMS')).toBeInTheDocument()
  })

  it('shows subject field for email', () => {
    vi.mocked(useMembers).mockReturnValue({
      data: { members: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useMembers>)

    vi.mocked(useMessageTemplates).mockReturnValue({
      data: { templates: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useMessageTemplates>)

    vi.mocked(useSendMessage).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useSendMessage>)

    renderComponent()

    // Email channel is selected by default
    expect(screen.getByLabelText('Subject')).toBeInTheDocument()
  })

  it('shows available variables hint', () => {
    vi.mocked(useMembers).mockReturnValue({
      data: { members: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useMembers>)

    vi.mocked(useMessageTemplates).mockReturnValue({
      data: { templates: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useMessageTemplates>)

    vi.mocked(useSendMessage).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useSendMessage>)

    renderComponent()

    expect(screen.getByText(/\{\{firstName\}\}/)).toBeInTheDocument()
    expect(screen.getByText(/\{\{lastName\}\}/)).toBeInTheDocument()
  })

  it('validates required body field', async () => {
    const user = userEvent.setup()

    vi.mocked(useMembers).mockReturnValue({
      data: { members: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useMembers>)

    vi.mocked(useMessageTemplates).mockReturnValue({
      data: { templates: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useMessageTemplates>)

    const mockMutate = vi.fn()
    vi.mocked(useSendMessage).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useSendMessage>)

    renderComponent()

    // Try to submit without entering a message body
    const submitButton = screen.getByText('Send Message')
    await user.click(submitButton)

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/message body is required/i)).toBeInTheDocument()
    })

    // Should not have called the mutation
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('shows templates selector when templates exist', () => {
    vi.mocked(useMembers).mockReturnValue({
      data: { members: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useMembers>)

    vi.mocked(useMessageTemplates).mockReturnValue({
      data: {
        templates: [
          {
            id: '1',
            name: 'Welcome Email',
            channel: 'email' as const,
            subject: 'Welcome!',
            body: 'Hello {{firstName}}!',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useMessageTemplates>)

    vi.mocked(useSendMessage).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useSendMessage>)

    renderComponent()

    expect(screen.getByText(/use template/i)).toBeInTheDocument()
  })
})
