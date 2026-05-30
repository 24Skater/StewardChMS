import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import KioskModePage from './KioskModePage'

vi.mock('@/lib/api', () => ({
  apiRequest: vi.fn().mockResolvedValue([]),
}))

describe('KioskModePage theme toggle', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('root element has dark class by default', () => {
    render(<KioskModePage />)
    expect(screen.getByTestId('kiosk-root')).toHaveClass('dark')
  })

  it('renders a theme toggle button', () => {
    render(<KioskModePage />)
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })

  it('removes dark class when toggle is clicked', () => {
    render(<KioskModePage />)
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }))
    expect(screen.getByTestId('kiosk-root')).not.toHaveClass('dark')
  })

  it('persists light preference to localStorage after toggle', () => {
    render(<KioskModePage />)
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }))
    expect(localStorage.getItem('kiosk-theme')).toBe('light')
  })
})
