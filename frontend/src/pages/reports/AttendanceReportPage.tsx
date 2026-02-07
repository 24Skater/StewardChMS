import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAttendanceSummary } from '../../hooks/useReports'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { downloadCSV, formatDate } from '../../lib/csv'
import { Download, ArrowLeft } from 'lucide-react'

function getDefaultDateRange() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    dateFrom: startOfMonth.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
  }
}

export default function AttendanceReportPage() {
  const defaults = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom)
  const [dateTo, setDateTo] = useState(defaults.dateTo)

  const { data, isLoading, error } = useAttendanceSummary(dateFrom, dateTo)

  const handleExportCSV = () => {
    if (!data) return

    const headers = ['Event', 'Date', 'Check-ins']
    const rows = data.occurrences.map(occ => [
      occ.eventTitle,
      formatDate(occ.startsAt),
      String(occ.checkIns),
    ])

    downloadCSV(`attendance-summary-${dateFrom}-to-${dateTo}.csv`, headers, rows)
  }

  return (
    <div className="space-y-6">
      <Link to="/reports" className="inline-flex items-center text-[var(--st-link)] hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Reports
      </Link>

      <h1 className="text-2xl font-bold text-[var(--st-fg)]">Attendance Summary</h1>

      {/* Date Range Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[var(--st-surfaceMuted)] rounded-lg border border-[var(--st-border)]">
        <div>
          <Label className="text-[var(--st-mutedFg)]">From Date</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
          />
        </div>
        <div>
          <Label className="text-[var(--st-mutedFg)]">To Date</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
          />
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              const d = getDefaultDateRange()
              setDateFrom(d.dateFrom)
              setDateTo(d.dateTo)
            }}
            className="border-[var(--st-border)] text-[var(--st-mutedFg)]"
          >
            This Month
          </Button>
        </div>
        <div className="flex items-end">
          <Button onClick={handleExportCSV} disabled={!data} className="bg-[var(--st-primary)] text-white">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-[var(--st-muted)]">Loading...</div>}
      {error && <div className="text-center py-8 text-[var(--st-danger)]">Error loading report</div>}

      {data && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
              <div className="text-sm text-[var(--st-muted)]">Total Check-ins</div>
              <div className="text-3xl font-bold text-blue-500">{data.totalCheckIns}</div>
            </div>
            <div className="p-4 bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
              <div className="text-sm text-[var(--st-muted)]">Event Occurrences</div>
              <div className="text-3xl font-bold text-[var(--st-fg)]">{data.occurrenceCount}</div>
            </div>
          </div>

          {/* Top Events */}
          {data.topEvents.length > 0 && (
            <div className="p-4 bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
              <h3 className="font-semibold text-[var(--st-fg)] mb-4">Top Events by Attendance</h3>
              <div className="space-y-2">
                {data.topEvents.slice(0, 5).map((event, idx) => (
                  <div key={event.eventId} className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="text-[var(--st-muted)]">{idx + 1}.</span>
                      <span className="text-[var(--st-fg)]">{event.title}</span>
                    </span>
                    <span className="font-semibold text-[var(--st-fg)]">{event.checkIns} check-ins</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Occurrences Table */}
          <div className="border border-[var(--st-border)] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)]">
                  <TableHead className="text-[var(--st-muted)]">Event</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Date</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Check-ins</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.occurrences.length === 0 ? (
                  <TableRow className="border-[var(--st-border)]">
                    <TableCell colSpan={3} className="text-center py-8 text-[var(--st-muted)]">
                      No events found in this date range
                    </TableCell>
                  </TableRow>
                ) : (
                  data.occurrences.map((occ) => (
                    <TableRow key={occ.occurrenceId} className="border-[var(--st-border)]">
                      <TableCell className="font-medium text-[var(--st-fg)]">{occ.eventTitle}</TableCell>
                      <TableCell className="text-[var(--st-muted)]">{formatDate(occ.startsAt)}</TableCell>
                      <TableCell className="text-right text-[var(--st-fg)]">{occ.checkIns}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
