import { Link, useNavigate } from 'react-router-dom'
import { useMinistryCalendars } from '@/hooks/useSchedules'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function SchedulesPage() {
  const navigate = useNavigate()
  const { data: calendars, isLoading, error } = useMinistryCalendars()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--st-fg)]">Ministry Schedules</h1>
          <p className="mt-1 text-[var(--st-muted)]">Manage rotation schedules for ministries</p>
        </div>
        <Link to="/schedules/new">
          <Button className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]">
            New Calendar
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)]/50">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--st-muted)]">Loading calendars...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">Error loading calendars</div>
        ) : !calendars || calendars.length === 0 ? (
          <div className="p-8 text-center text-[var(--st-muted)]">
            No calendars found. Create your first ministry calendar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--st-border)] hover:bg-transparent">
                <TableHead className="text-[var(--st-muted)]">Name</TableHead>
                <TableHead className="text-[var(--st-muted)]">Ministry</TableHead>
                <TableHead className="text-[var(--st-muted)]">Service Day</TableHead>
                <TableHead className="text-[var(--st-muted)]">Reminder Days</TableHead>
                <TableHead className="text-[var(--st-muted)]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calendars.map((calendar) => (
                <TableRow
                  key={calendar.id}
                  className="border-[var(--st-border)] cursor-pointer hover:bg-[var(--st-surface-hover)]"
                  onClick={() => navigate(`/schedules/${calendar.id}`)}
                >
                  <TableCell className="font-medium text-[var(--st-fg)]">
                    {calendar.name}
                  </TableCell>
                  <TableCell className="text-[var(--st-muted)]">
                    {calendar.ministry?.name || '—'}
                  </TableCell>
                  <TableCell className="text-[var(--st-muted)]">
                    {DAY_NAMES[calendar.serviceDayOfWeek] ?? '—'}
                  </TableCell>
                  <TableCell className="text-[var(--st-muted)]">
                    {calendar.reminderDaysBeforeSlot} days
                  </TableCell>
                  <TableCell>
                    {calendar.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

export default SchedulesPage
