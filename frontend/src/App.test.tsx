import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

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

describe('App', () => {
  it('renders the homepage with app title', () => {
    renderWithProviders(<App />)
    expect(screen.getByText('StewardChMS')).toBeInTheDocument()
  })

  it('displays the tagline', () => {
    renderWithProviders(<App />)
    expect(screen.getByText('Modern Church Management System')).toBeInTheDocument()
  })
})

