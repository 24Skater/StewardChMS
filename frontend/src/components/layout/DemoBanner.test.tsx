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
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText(/Demo environment/i)).toBeInTheDocument()
  })

  it('shows the reset time and credentials', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    render(<DemoBanner />)
    expect(screen.getByText(/1 AM UTC/i)).toBeInTheDocument()
    expect(screen.getByText(/admin@demo\.steward\.app/i)).toBeInTheDocument()
    expect(screen.getByText(/Demo1234!/i)).toBeInTheDocument()
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
