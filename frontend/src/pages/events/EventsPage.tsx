import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEvents } from '../../hooks/useEvents'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { DatePicker } from '../../components/ui/date-picker'

export default function EventsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useEvents({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    category: category || undefined,
    page,
    limit: 20,
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        <Link to="/events/new">
          <Button>Create Event</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">From Date</label>
              <DatePicker
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="Select start date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To Date</label>
              <DatePicker
                value={dateTo}
                onChange={setDateTo}
                placeholder="Select end date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Input
                placeholder="Filter by category..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                  setCategory('')
                  setPage(1)
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
          Error loading events: {error.message}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8 text-gray-500">Loading events...</div>
      )}

      {/* Events table */}
      {data && (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No events found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/events/${event.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {event.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {event.category && (
                          <Badge variant="secondary">{event.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{event.location || '-'}</TableCell>
                      <TableCell>{formatDate(event.startDatetime)}</TableCell>
                      <TableCell>
                        {event.isRecurring ? (
                          <Badge variant="outline">Recurring</Badge>
                        ) : (
                          <Badge variant="outline">One-time</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/events/${event.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

