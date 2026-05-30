import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ScheduleKioskPage from './ScheduleKioskPage'

vi.mock('@/lib/api/schedules', () => ({
  getPublicSchedule: vi.fn().mockResolvedValue({
    calendarName: 'Sunday Team',
    slots: [],
  }),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/kiosk/test-token']}>
      <Routes>
        <Route path="/kiosk/:token" element={<ScheduleKioskPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ScheduleKioskPage theme toggle', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('root element has dark class by default', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('kiosk-root')).toHaveClass('dark')
    })
  })

  it('renders a theme toggle button', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
    })
  })

  it('removes dark class when toggle is clicked', async () => {
    renderPage()
    const btn = await screen.findByRole('button', { name: /toggle theme/i })
    fireEvent.click(btn)
    expect(screen.getByTestId('kiosk-root')).not.toHaveClass('dark')
  })

  it('persists light preference to localStorage after toggle', async () => {
    renderPage()
    const btn = await screen.findByRole('button', { name: /toggle theme/i })
    fireEvent.click(btn)
    expect(localStorage.getItem('kiosk-theme')).toBe('light')
  })
})
