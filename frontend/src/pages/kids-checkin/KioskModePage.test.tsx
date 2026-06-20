import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import KioskModePage from './KioskModePage'

const mockKioskRequest = vi.fn()
const mockActivateKiosk = vi.fn()
const mockSetKioskToken = vi.fn()
let mockGetKioskToken: () => string | null = () => null

vi.mock('@/lib/api', () => ({
  kioskRequest: (...args: unknown[]) => mockKioskRequest(...args),
  getKioskToken: () => mockGetKioskToken(),
  setKioskToken: (...args: unknown[]) => mockSetKioskToken(...args),
  activateKiosk: () => mockActivateKiosk(),
}))

describe('KioskModePage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // Default: no kiosk token
    mockGetKioskToken = () => null
    // Default: occurrences resolves to empty array
    mockKioskRequest.mockResolvedValue([])
  })

  // ----------------------------------------------------------------
  // Activation screen
  // ----------------------------------------------------------------

  it('renders activation screen when no kiosk token in localStorage', () => {
    render(<KioskModePage />)
    expect(screen.getByText('Kiosk Not Activated')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /activate kiosk/i })).toBeInTheDocument()
  })

  it('does not render phone entry when no kiosk token', () => {
    render(<KioskModePage />)
    expect(screen.queryByText('Enter your phone number to get started')).not.toBeInTheDocument()
  })

  it('shows activation error when activateKiosk throws', async () => {
    mockActivateKiosk.mockRejectedValue(new Error('Unauthorized'))
    render(<KioskModePage />)
    fireEvent.click(screen.getByRole('button', { name: /activate kiosk/i }))
    await waitFor(() => {
      expect(screen.getByText('Please log in as staff first, then activate.')).toBeInTheDocument()
    })
  })

  it('transitions to kiosk after successful activation', async () => {
    mockActivateKiosk.mockResolvedValue({ token: 'kiosk-jwt-abc', expiresAt: '2026-09-01' })
    render(<KioskModePage />)
    fireEvent.click(screen.getByRole('button', { name: /activate kiosk/i }))
    await waitFor(() => {
      expect(mockSetKioskToken).toHaveBeenCalledWith('kiosk-jwt-abc')
    })
    await waitFor(() => {
      expect(screen.getByText('Enter your phone number to get started')).toBeInTheDocument()
    })
  })

  // ----------------------------------------------------------------
  // Phone entry step (token present)
  // ----------------------------------------------------------------

  it('renders phone entry step when kiosk token exists', () => {
    mockGetKioskToken = () => 'existing-kiosk-token'
    render(<KioskModePage />)
    expect(screen.getByText('Enter your phone number to get started')).toBeInTheDocument()
    expect(screen.queryByText('Kiosk Not Activated')).not.toBeInTheDocument()
  })

  // ----------------------------------------------------------------
  // Demo fallback removed
  // ----------------------------------------------------------------

  it('shows error message when phone lookup fails — no child list shown', async () => {
    mockGetKioskToken = () => 'existing-kiosk-token'
    // First call: occurrences. Second call: lookup — throws.
    mockKioskRequest
      .mockResolvedValueOnce([]) // loadOccurrences
      .mockRejectedValueOnce(new Error('Not Found')) // lookup
    render(<KioskModePage />)

    // Type a 10-digit phone and submit
    const input = screen.getByPlaceholderText('(555) 123-4567')
    fireEvent.change(input, { target: { value: '5551234567' } })
    fireEvent.click(screen.getByRole('button', { name: /check in/i }))

    await waitFor(() => {
      expect(screen.getByText('Unable to find children. Please see a volunteer.')).toBeInTheDocument()
    })
    // No child list should be rendered
    expect(screen.queryByText('Select your child')).not.toBeInTheDocument()
  })

  // ----------------------------------------------------------------
  // Correct endpoint used for phone lookup
  // ----------------------------------------------------------------

  it('calls /kids-checkin/lookup and not /kids-checkin/children on phone submit', async () => {
    mockGetKioskToken = () => 'existing-kiosk-token'
    mockKioskRequest
      .mockResolvedValueOnce([]) // loadOccurrences
      .mockResolvedValueOnce({ children: [{ id: '1', firstName: 'Alice', lastName: 'Smith', allergies: null, medicalNotes: null }] })
    render(<KioskModePage />)

    const input = screen.getByPlaceholderText('(555) 123-4567')
    fireEvent.change(input, { target: { value: '5551234567' } })
    fireEvent.click(screen.getByRole('button', { name: /check in/i }))

    await waitFor(() => {
      expect(screen.getByText('Select your child')).toBeInTheDocument()
    })

    const lookupCall = mockKioskRequest.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].startsWith('/kids-checkin/lookup')
    )
    expect(lookupCall).toBeDefined()

    const childrenCall = mockKioskRequest.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0] === '/kids-checkin/children'
    )
    expect(childrenCall).toBeUndefined()
  })

  // ----------------------------------------------------------------
  // Theme toggle (preserve existing coverage)
  // ----------------------------------------------------------------

  describe('theme toggle', () => {
    beforeEach(() => {
      mockGetKioskToken = () => 'existing-kiosk-token'
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
})
