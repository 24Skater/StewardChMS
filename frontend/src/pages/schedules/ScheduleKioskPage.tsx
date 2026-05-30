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

  return { year, month, grid, slotsByDay }
}

// vw-based text sizing — scales linearly with screen width
// Tuned so 1080p (1920px) gets comfortable TV-readable sizes
const vw = (n: number) => `${n}vw`

function ThemeToggle({ isDark, toggle }: { isDark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`absolute bottom-4 right-4 w-9 h-9 rounded-full flex items-center justify-center border shadow-md hover:opacity-80 transition-opacity ${
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

  useEffect(() => {
    if (!token) return
    const doLoad = async () => {
      try {
        const data = await getPublicSchedule(token)
        setSchedule(data)
        setLastRefreshed(new Date())
        setError(null)
      } catch {
        setError('Schedule not found or the link has expired.')
      }
    }
    doLoad()
    const interval = setInterval(doLoad, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [token])

  if (error) {
    return (
      <div data-testid="kiosk-root" className={`relative ${isDark ? 'dark' : ''}`}>
        <div className="h-screen flex items-center justify-center dark:bg-gray-950 bg-white dark:text-white text-gray-900">
          <div className="text-center space-y-4">
            <h1 style={{ fontSize: vw(3) }} className="font-bold">Schedule Unavailable</h1>
            <p style={{ fontSize: vw(1.2) }} className="dark:text-gray-400 text-gray-500">{error}</p>
          </div>
        </div>
        <ThemeToggle isDark={isDark} toggle={toggle} />
      </div>
    )
  }

  if (!schedule) {
    return (
      <div data-testid="kiosk-root" className={`relative ${isDark ? 'dark' : ''}`}>
        <div className="h-screen flex items-center justify-center dark:bg-gray-950 bg-white">
          <p style={{ fontSize: vw(1.8) }} className="dark:text-gray-400 text-gray-500 animate-pulse">Loading schedule...</p>
        </div>
        <ThemeToggle isDark={isDark} toggle={toggle} />
      </div>
    )
  }

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const { year, month, grid, slotsByDay } = buildMonth(schedule.slots)

  if (schedule.slots.length === 0) {
    return (
      <div data-testid="kiosk-root" className={`relative ${isDark ? 'dark' : ''}`}>
        <div className="h-screen flex flex-col dark:bg-gray-950 bg-white dark:text-white text-gray-900">
          <div className="px-[2.5vw] py-[1.5vh] border-b dark:border-gray-800 border-gray-200">
            <h1 style={{ fontSize: vw(2.8) }} className="font-bold tracking-tight">{schedule.calendarName}</h1>
            <p style={{ fontSize: vw(1) }} className="dark:text-gray-500 text-gray-400 mt-1">{MONTH_NAMES[month - 1]} {year}</p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p style={{ fontSize: vw(1.6) }} className="dark:text-gray-600 text-gray-400">No upcoming duties scheduled</p>
          </div>
          <ThemeToggle isDark={isDark} toggle={toggle} />
        </div>
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
    <div data-testid="kiosk-root" className={`relative ${isDark ? 'dark' : ''}`}>
    <div className="h-screen overflow-hidden flex flex-col dark:bg-gray-950 bg-white dark:text-white text-gray-900">

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
              const isToday = day !== null && `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` === todayKey
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
    </div>
  )
}

export default ScheduleKioskPage
