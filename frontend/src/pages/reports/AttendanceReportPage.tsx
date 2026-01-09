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
    <div className="p-6 max-w-6xl mx-auto">
      <Link to="/reports" className="inline-flex items-center text-blue-600 hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Reports
      </Link>

      <h1 className="text-2xl font-bold mb-6">Attendance Summary</h1>

      {/* Date Range Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <Label>From Date</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <Label>To Date</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
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
          >
            This Month
          </Button>
        </div>
        <div className="flex items-end">
          <Button onClick={handleExportCSV} disabled={!data}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-8">Loading...</div>}
      {error && <div className="text-center py-8 text-red-600">Error loading report</div>}

      {data && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white border rounded-lg">
              <div className="text-sm text-gray-500">Total Check-ins</div>
              <div className="text-3xl font-bold text-blue-600">{data.totalCheckIns}</div>
            </div>
            <div className="p-4 bg-white border rounded-lg">
              <div className="text-sm text-gray-500">Event Occurrences</div>
              <div className="text-3xl font-bold">{data.occurrenceCount}</div>
            </div>
          </div>

          {/* Top Events */}
          {data.topEvents.length > 0 && (
            <div className="p-4 bg-white border rounded-lg">
              <h3 className="font-semibold mb-4">Top Events by Attendance</h3>
              <div className="space-y-2">
                {data.topEvents.slice(0, 5).map((event, idx) => (
                  <div key={event.eventId} className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="text-gray-400">{idx + 1}.</span>
                      <span>{event.title}</span>
                    </span>
                    <span className="font-semibold">{event.checkIns} check-ins</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Occurrences Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Check-ins</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.occurrences.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      No events found in this date range
                    </TableCell>
                  </TableRow>
                ) : (
                  data.occurrences.map((occ) => (
                    <TableRow key={occ.occurrenceId}>
                      <TableCell className="font-medium">{occ.eventTitle}</TableCell>
                      <TableCell>{formatDate(occ.startsAt)}</TableCell>
                      <TableCell className="text-right">{occ.checkIns}</TableCell>
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

