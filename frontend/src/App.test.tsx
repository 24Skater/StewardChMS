import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/health')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      })
    }
    if (url.includes('/api/setup/status')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ needsSetup: false, hasUsers: true, isComplete: true }),
      })
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  })
})

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>{ui}</AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('App', () => {
  it('renders the homepage with app title', async () => {
    renderWithProviders(<App />)
    await waitFor(() => {
      expect(screen.getByText(/Steward.*ChMS/)).toBeInTheDocument()
    })
  })

  it('displays the tagline', async () => {
    renderWithProviders(<App />)
    await waitFor(() => {
      expect(screen.getByText('Modern Church Management System')).toBeInTheDocument()
    })
  })
})
