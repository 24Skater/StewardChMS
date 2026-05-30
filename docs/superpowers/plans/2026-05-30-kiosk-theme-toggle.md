# Kiosk Light/Dark Theme Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent light/dark mode toggle to both the Schedule/TV Kiosk and Kids Check-In Kiosk pages.

**Architecture:** A new `useKioskTheme` hook reads/writes `localStorage('kiosk-theme')`, defaulting to `'dark'`. Each kiosk page calls this hook, applies a `dark` CSS class to its root `<div>`, and renders a `fixed bottom-4 right-4` circular toggle button using `Sun`/`Moon` from lucide-react. The Schedule Kiosk replaces all hardcoded dark Tailwind classes with `dark:`/light pairs. The Kids Check-In Kiosk relies on `--st-*` CSS variable cascade (already defined on `.dark`), so only the root div and toggle button need to change.

**Tech Stack:** React 18, TypeScript 5.6, Tailwind CSS (darkMode: 'class'), Vitest, @testing-library/react, lucide-react, localStorage

---

## File Map

| File | Action |
| --- | --- |
| `frontend/src/hooks/useKioskTheme.ts` | **Create** — theme hook |
| `frontend/src/hooks/useKioskTheme.test.ts` | **Create** — unit tests for hook |
| `frontend/src/pages/schedules/ScheduleKioskPage.tsx` | **Modify** — add hook, dark class, replace hardcoded colors, add toggle button |
| `frontend/src/pages/schedules/ScheduleKioskPage.test.tsx` | **Create** — toggle behavior tests |
| `frontend/src/pages/kids-checkin/KioskModePage.tsx` | **Modify** — add hook, dark class on root, add toggle button |
| `frontend/src/pages/kids-checkin/KioskModePage.test.tsx` | **Create** — toggle behavior tests |

---

## Task 1: `useKioskTheme` Hook

**Files:**
- Create: `frontend/src/hooks/useKioskTheme.test.ts`
- Create: `frontend/src/hooks/useKioskTheme.ts`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/hooks/useKioskTheme.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKioskTheme } from './useKioskTheme'

describe('useKioskTheme', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to dark when localStorage is empty', () => {
    const { result } = renderHook(() => useKioskTheme())
    expect(result.current.isDark).toBe(true)
  })

  it('reads light preference from localStorage', () => {
    localStorage.setItem('kiosk-theme', 'light')
    const { result } = renderHook(() => useKioskTheme())
    expect(result.current.isDark).toBe(false)
  })

  it('reads dark preference from localStorage', () => {
    localStorage.setItem('kiosk-theme', 'dark')
    const { result } = renderHook(() => useKioskTheme())
    expect(result.current.isDark).toBe(true)
  })

  it('toggles from dark to light', () => {
    const { result } = renderHook(() => useKioskTheme())
    act(() => result.current.toggle())
    expect(result.current.isDark).toBe(false)
  })

  it('toggles from light to dark', () => {
    localStorage.setItem('kiosk-theme', 'light')
    const { result } = renderHook(() => useKioskTheme())
    act(() => result.current.toggle())
    expect(result.current.isDark).toBe(true)
  })

  it('persists light preference to localStorage after toggle', () => {
    const { result } = renderHook(() => useKioskTheme())
    act(() => result.current.toggle())
    expect(localStorage.getItem('kiosk-theme')).toBe('light')
  })

  it('persists dark preference to localStorage after toggle', () => {
    localStorage.setItem('kiosk-theme', 'light')
    const { result } = renderHook(() => useKioskTheme())
    act(() => result.current.toggle())
    expect(localStorage.getItem('kiosk-theme')).toBe('dark')
  })
})
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
npm run test -w frontend -- --reporter=verbose useKioskTheme
```

Expected: `Error: Failed to resolve import "./useKioskTheme"` or similar — file doesn't exist yet.

- [ ] **Step 3: Create the hook**

Create `frontend/src/hooks/useKioskTheme.ts`:

```ts
import { useState } from 'react'

const STORAGE_KEY = 'kiosk-theme'

export function useKioskTheme(): { isDark: boolean; toggle: () => void } {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored !== 'light'
  })

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
  }

  return { isDark, toggle }
}
```

- [ ] **Step 4: Run the tests — verify they pass**

```bash
npm run test -w frontend -- --reporter=verbose useKioskTheme
```

Expected: 7 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useKioskTheme.ts frontend/src/hooks/useKioskTheme.test.ts
git commit -m "feat: add useKioskTheme hook with localStorage persistence"
```

---

## Task 2: Schedule Kiosk — Theme Toggle

**Files:**
- Create: `frontend/src/pages/schedules/ScheduleKioskPage.test.tsx`
- Modify: `frontend/src/pages/schedules/ScheduleKioskPage.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/pages/schedules/ScheduleKioskPage.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
npm run test -w frontend -- --reporter=verbose ScheduleKioskPage
```

Expected: Tests fail because `kiosk-root` testid doesn't exist and the toggle button doesn't exist.

- [ ] **Step 3: Update the Schedule Kiosk page**

Replace the full contents of `frontend/src/pages/schedules/ScheduleKioskPage.tsx` with the following. Key changes: import `useKioskTheme`, `Sun`, `Moon`; add `data-testid="kiosk-root"` + conditional `dark` class to every top-level return div; replace all hardcoded dark classes with dark:/light variants; add toggle button.

```tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { getPublicSchedule, PublicSchedule, PublicSlot } from '@/lib/api/schedules'
import { useKioskTheme } from '@/hooks/useKioskTheme'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

interface MonthData {
  year: number
  month: number
  numRows: number
  grid: (number | null)[][]
  slotsByDay: Record<number, PublicSlot[]>
}

function buildMonth(slots: PublicSlot[]): MonthData {
  const today = new Date()
  const first = slots.length > 0 ? new Date(slots[0].slotDate + 'T00:00:00') : today
  const year = first.getFullYear()
  const month = first.getMonth() + 1

  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const grid: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) grid.push(cells.slice(i, i + 7))

  const slotsByDay: Record<number, PublicSlot[]> = {}
  for (const s of slots) {
    const d = new Date(s.slotDate + 'T00:00:00')
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      const day = d.getDate()
      if (!slotsByDay[day]) slotsByDay[day] = []
      slotsByDay[day].push(s)
    }
  }

  return { year, month, numRows: grid.length, grid, slotsByDay }
}

// vw-based text sizing — scales linearly with screen width
// Tuned so 1080p (1920px) gets comfortable TV-readable sizes
const vw = (n: number) => `${n}vw`

function ThemeToggle({ isDark, toggle }: { isDark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`fixed bottom-4 right-4 w-9 h-9 rounded-full flex items-center justify-center border shadow-md hover:opacity-80 transition-opacity ${
        isDark
          ? 'bg-gray-800 border-gray-600 text-gray-200'
          : 'bg-gray-100 border-gray-300 text-gray-700'
      }`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

function ScheduleKioskPage() {
  const { token } = useParams<{ token: string }>()
  const { isDark, toggle } = useKioskTheme()
  const [schedule, setSchedule] = useState<PublicSchedule | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  const load = async () => {
    if (!token) return
    try {
      const data = await getPublicSchedule(token)
      setSchedule(data)
      setLastRefreshed(new Date())
      setError(null)
    } catch {
      setError('Schedule not found or the link has expired.')
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [token])

  if (error) {
    return (
      <div
        data-testid="kiosk-root"
        className={`h-screen flex items-center justify-center dark:bg-gray-950 bg-white dark:text-white text-gray-900 ${isDark ? 'dark' : ''}`}
      >
        <div className="text-center space-y-4">
          <h1 style={{ fontSize: vw(3) }} className="font-bold">Schedule Unavailable</h1>
          <p style={{ fontSize: vw(1.2) }} className="dark:text-gray-400 text-gray-500">{error}</p>
        </div>
        <ThemeToggle isDark={isDark} toggle={toggle} />
      </div>
    )
  }

  if (!schedule) {
    return (
      <div
        data-testid="kiosk-root"
        className={`h-screen flex items-center justify-center dark:bg-gray-950 bg-white ${isDark ? 'dark' : ''}`}
      >
        <p style={{ fontSize: vw(1.8) }} className="dark:text-gray-400 text-gray-500 animate-pulse">Loading schedule...</p>
        <ThemeToggle isDark={isDark} toggle={toggle} />
      </div>
    )
  }

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
  const { year, month, grid, slotsByDay } = buildMonth(schedule.slots)

  if (schedule.slots.length === 0) {
    return (
      <div
        data-testid="kiosk-root"
        className={`h-screen flex flex-col dark:bg-gray-950 bg-white dark:text-white text-gray-900 ${isDark ? 'dark' : ''}`}
      >
        <div className="px-[2.5vw] py-[1.5vh] border-b dark:border-gray-800 border-gray-200">
          <h1 style={{ fontSize: vw(2.8) }} className="font-bold tracking-tight">{schedule.calendarName}</h1>
          <p style={{ fontSize: vw(1) }} className="dark:text-gray-500 text-gray-400 mt-1">{MONTH_NAMES[month - 1]} {year}</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p style={{ fontSize: vw(1.6) }} className="dark:text-gray-600 text-gray-400">No upcoming duties scheduled</p>
        </div>
        <ThemeToggle isDark={isDark} toggle={toggle} />
      </div>
    )
  }

  // Weekday header height: 5vh. Footer: 4vh. Header: ~11vh. Rest goes to grid rows.
  const dayNumSize = vw(1.1)
  const dayNumCircle = `clamp(24px, ${vw(2)}, 56px)`
  const labelSize = vw(0.8)
  const nameSize = vw(1.05)
  const weekdayHeaderSize = vw(0.75)

  return (
    <div
      data-testid="kiosk-root"
      className={`h-screen overflow-hidden flex flex-col dark:bg-gray-950 bg-white dark:text-white text-gray-900 ${isDark ? 'dark' : ''}`}
    >

      {/* ── Header ── */}
      <header
        className="flex-none px-[2.5vw] flex items-center justify-between border-b dark:border-gray-800 border-gray-200"
        style={{ height: '10vh' }}
      >
        <div>
          <h1 style={{ fontSize: vw(2.6) }} className="font-bold tracking-tight leading-none">
            {schedule.calendarName}
          </h1>
          <p style={{ fontSize: vw(0.95) }} className="dark:text-gray-500 text-gray-400 mt-1">
            {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>
        <p style={{ fontSize: vw(0.8) }} className="dark:text-gray-700 text-gray-400 text-right">
          Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </header>

      {/* ── Weekday headers ── */}
      <div
        className="flex-none grid grid-cols-7 border-b dark:border-gray-800 border-gray-200 dark:bg-gray-900/60 bg-gray-50"
        style={{ height: '5vh' }}
      >
        {WEEKDAYS.map(d => (
          <div
            key={d}
            className="flex items-center justify-center font-semibold dark:text-gray-500 text-gray-400 uppercase tracking-widest border-r dark:border-gray-800 border-gray-200 last:border-r-0"
            style={{ fontSize: weekdayHeaderSize }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar rows ── */}
      <div className="flex-1 flex flex-col border-b dark:border-gray-800 border-gray-200">
        {grid.map((row, ri) => (
          <div
            key={ri}
            className="flex-1 grid grid-cols-7 border-b dark:border-gray-800 border-gray-200 last:border-b-0"
          >
            {row.map((day, ci) => {
              const isToday = day !== null && `${year}-${month}-${day}` === todayKey
              const daySlots = day !== null ? (slotsByDay[day] ?? []) : []
              const hasSlots = daySlots.length > 0

              return (
                <div
                  key={ci}
                  className={`flex flex-col p-[0.6vw] border-r dark:border-gray-800 border-gray-200 last:border-r-0 overflow-hidden ${
                    day === null
                      ? 'dark:bg-gray-900/40 bg-gray-50/60'
                      : isToday
                      ? 'dark:bg-blue-950/40 bg-blue-50/40'
                      : ''
                  }`}
                >
                  {day !== null && (
                    <>
                      {/* Day number circle */}
                      <div
                        className={`flex-none flex items-center justify-center rounded-full font-bold leading-none mb-[0.4vh] ${
                          isToday
                            ? 'bg-blue-500 text-white'
                            : hasSlots
                            ? 'dark:text-white text-gray-900'
                            : 'dark:text-gray-700 text-gray-300'
                        }`}
                        style={{
                          width: dayNumCircle,
                          height: dayNumCircle,
                          fontSize: dayNumSize,
                        }}
                      >
                        {day}
                      </div>

                      {/* Slot cards */}
                      <div className="flex flex-col gap-[0.3vh] flex-1 overflow-hidden">
                        {daySlots.map((slot, i) => (
                          <div
                            key={i}
                            className="rounded-lg px-[0.5vw] py-[0.4vh] dark:bg-blue-900/55 bg-blue-50 dark:border-blue-800/50 border-blue-200 border overflow-hidden"
                          >
                            {slot.label && (
                              <div
                                className="dark:text-blue-400 text-blue-600 font-medium truncate leading-tight"
                                style={{ fontSize: labelSize }}
                              >
                                {slot.label}
                              </div>
                            )}
                            <div
                              className="font-semibold dark:text-white text-gray-900 truncate leading-tight"
                              style={{ fontSize: nameSize }}
                            >
                              {slot.assignedMember ?? (
                                <span className="dark:text-gray-500 text-gray-400 font-normal italic">TBD</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <footer
        className="flex-none flex items-center px-[2.5vw] border-t dark:border-gray-800/50 border-gray-200 dark:bg-gray-900/30 bg-gray-50"
        style={{ height: '4vh' }}
      >
        <p style={{ fontSize: vw(0.65) }} className="dark:text-gray-700 text-gray-400">
          Auto-refreshes every 5 minutes
        </p>
      </footer>

      <ThemeToggle isDark={isDark} toggle={toggle} />
    </div>
  )
}

export default ScheduleKioskPage
```

- [ ] **Step 4: Run the tests — verify they pass**

```bash
npm run test -w frontend -- --reporter=verbose ScheduleKioskPage
```

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/schedules/ScheduleKioskPage.tsx frontend/src/pages/schedules/ScheduleKioskPage.test.tsx
git commit -m "feat: add light/dark toggle to Schedule Kiosk"
```

---

## Task 3: Kids Check-In Kiosk — Theme Toggle

**Files:**
- Create: `frontend/src/pages/kids-checkin/KioskModePage.test.tsx`
- Modify: `frontend/src/pages/kids-checkin/KioskModePage.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/pages/kids-checkin/KioskModePage.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
npm run test -w frontend -- --reporter=verbose KioskModePage
```

Expected: Tests fail because `kiosk-root` testid doesn't exist and toggle button doesn't exist.

- [ ] **Step 3: Update the Kids Check-In Kiosk page**

In `frontend/src/pages/kids-checkin/KioskModePage.tsx`, make three targeted changes:

**3a. Add imports** at the top of the file (after the existing imports):

```tsx
import { Sun, Moon } from 'lucide-react'
import { useKioskTheme } from '@/hooks/useKioskTheme'
```

**3b. Add hook call** inside `KioskModePage()`, immediately after the existing `useState`/`useRef` declarations (before the `useReactToPrint` call):

```tsx
const { isDark, toggle } = useKioskTheme()
```

**3c. Replace the opening `<div>` of the return statement** (currently line 228):

Before:
```tsx
return (
  <div className="min-h-screen bg-gradient-to-br from-[var(--st-primary)] via-purple-600 to-[var(--st-color-success)] flex items-center justify-center p-4">
```

After:
```tsx
return (
  <div
    data-testid="kiosk-root"
    className={`min-h-screen bg-gradient-to-br from-[var(--st-primary)] via-purple-600 to-[var(--st-color-success)] flex items-center justify-center p-4 ${isDark ? 'dark' : ''}`}
  >
```

**3d. Add the toggle button** as the last child before the closing `</div>` of the root element — immediately before the `{/* Print Dialog (hidden) */}` comment:

```tsx
      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="fixed bottom-4 right-4 w-9 h-9 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:opacity-80 transition-opacity shadow-md"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
```

- [ ] **Step 4: Run the tests — verify they pass**

```bash
npm run test -w frontend -- --reporter=verbose KioskModePage
```

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 6: Run all frontend tests to confirm no regressions**

```bash
npm run test -w frontend
```

Expected: All existing tests continue to pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/kids-checkin/KioskModePage.tsx frontend/src/pages/kids-checkin/KioskModePage.test.tsx
git commit -m "feat: add light/dark toggle to Kids Check-In Kiosk"
```

---

## Done

All three tasks complete. Both kiosk pages now have a persistent light/dark toggle. Verify manually by:

1. Run `npm run dev:frontend`
2. Open `http://localhost:5173/kids-checkin/kiosk` — confirm dark default, toggle switches to light, refresh preserves light
3. Open a schedule kiosk link — confirm same behavior; confirm calendar colors flip correctly
4. Open the admin app in the same browser tab, set it to a different theme — confirm kiosk theme is unaffected
