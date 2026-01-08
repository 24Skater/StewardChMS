import { Link, useParams, useNavigate } from 'react-router-dom'
import { useEvent, useDeleteEvent, useGenerateOccurrences } from '../../hooks/useEvents'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { useState } from 'react'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading, error } = useEvent(id)
  const deleteMutation = useDeleteEvent()
  const generateMutation = useGenerateOccurrences()
  const [generating, setGenerating] = useState(false)

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRecurrenceRule = (rule: string | null) => {
    if (!rule) return '-'
    try {
      const parsed = JSON.parse(rule)
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayName = days[parsed.dayOfWeek] || 'Unknown'

      if (parsed.frequency === 'weekly') {
        return `Every ${dayName}`
      } else if (parsed.frequency === 'monthly') {
        const ordinals = ['1st', '2nd', '3rd', '4th', '5th']
        const weekOrd = ordinals[parsed.weekOfMonth - 1] || `${parsed.weekOfMonth}th`
        return `${weekOrd} ${dayName} of each month`
      }
      return rule
    } catch {
      return rule
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!window.confirm('Are you sure you want to delete this event? This will also delete all occurrences.')) {
      return
    }

    try {
      await deleteMutation.mutateAsync(id)
      navigate('/events')
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const handleGenerateOccurrences = async () => {
    if (!id) return
    setGenerating(true)
    try {
      const result = await generateMutation.mutateAsync({ eventId: id, daysAhead: 90 })
      alert(`Generated ${result.created} occurrences (${result.skipped} skipped as duplicates)`)
    } catch (error) {
      console.error('Failed to generate occurrences:', error)
      alert('Failed to generate occurrences')
    } finally {
      setGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-8 text-gray-500">Loading event...</div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 text-red-600 p-4 rounded">
          Event not found or error loading event
        </div>
        <Link to="/events" className="mt-4 inline-block">
          <Button variant="outline">Back to Events</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/events" className="text-gray-500 hover:text-gray-700">
              Events
            </Link>
            <span className="text-gray-400">/</span>
            <span>{event.title}</span>
          </div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <div className="flex gap-2 mt-2">
            {event.category && <Badge variant="secondary">{event.category}</Badge>}
            <Badge variant="outline">{event.isRecurring ? 'Recurring' : 'One-time'}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/events/${id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {/* Event Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1">{event.description}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Location</label>
              <p className="mt-1">{event.location || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Start Date/Time</label>
              <p className="mt-1">{formatDate(event.startDatetime)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">End Date/Time</label>
              <p className="mt-1">{formatDate(event.endDatetime)}</p>
            </div>
          </CardContent>
        </Card>

        {event.isRecurring && (
          <Card>
            <CardHeader>
              <CardTitle>Recurrence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Pattern</label>
                <p className="mt-1">{formatRecurrenceRule(event.recurrenceRule)}</p>
              </div>
              <Button onClick={handleGenerateOccurrences} disabled={generating}>
                {generating ? 'Generating...' : 'Generate Occurrences (Next 90 Days)'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Occurrences */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Occurrences</CardTitle>
          {!event.isRecurring && (
            <Button onClick={handleGenerateOccurrences} size="sm" disabled={generating}>
              {generating ? 'Generating...' : 'Create Occurrence'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {event.occurrences && event.occurrences.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.occurrences.map((occ) => (
                  <TableRow key={occ.id}>
                    <TableCell>{formatDate(occ.startsAt)}</TableCell>
                    <TableCell>{formatDate(occ.endsAt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={occ.status === 'scheduled' ? 'default' : 'destructive'}
                      >
                        {occ.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {occ.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/occurrences/${occ.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No occurrences yet. {event.isRecurring ? 'Click "Generate Occurrences" to create them.' : 'Click "Create Occurrence" to add one.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

