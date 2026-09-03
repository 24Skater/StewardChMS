import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DemoBanner } from './DemoBanner'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('DemoBanner', () => {
  it('renders the banner when VITE_DEMO_MODE is true', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    render(<DemoBanner />)
    expect(screen.getByRole('note')).toBeInTheDocument()
    expect(screen.getByText(/Demo environment/i)).toBeInTheDocument()
  })

  it('shows the reset time and the configured credentials', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    vi.stubEnv('VITE_DEMO_ADMIN_EMAIL', 'admin@demo.test')
    vi.stubEnv('VITE_DEMO_ADMIN_PASSWORD', 'Sample1234!')
    render(<DemoBanner />)
    expect(screen.getByText(/1 AM UTC/i)).toBeInTheDocument()
    expect(screen.getByText('admin@demo.test')).toBeInTheDocument()
    expect(screen.getByText('Sample1234!')).toBeInTheDocument()
  })

  it('falls back to placeholder credentials when none are configured', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    render(<DemoBanner />)
    expect(screen.getByText('admin@demo.example.com')).toBeInTheDocument()
    expect(screen.getByText('Demo1234!')).toBeInTheDocument()
  })

  it('renders nothing when VITE_DEMO_MODE is not set', () => {
    vi.stubEnv('VITE_DEMO_MODE', '')
    const { container } = render(<DemoBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when VITE_DEMO_MODE is false', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false')
    const { container } = render(<DemoBanner />)
    expect(container).toBeEmptyDOMElement()
  })
})
