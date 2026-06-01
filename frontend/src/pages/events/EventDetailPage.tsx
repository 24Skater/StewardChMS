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
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--st-muted)]">Loading event...</div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg border border-red-500/50">
          Event not found or error loading event
        </div>
        <Link to="/events">
          <Button variant="outline" className="border-[var(--st-border)] text-[var(--st-fg)]">
            Back to Events
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/events" className="text-[var(--st-muted)] hover:text-[var(--st-fg)]">
              Events
            </Link>
            <span className="text-[var(--st-muted)]">/</span>
            <span className="text-[var(--st-fg)]">{event.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--st-fg)]">{event.title}</h1>
          <div className="flex gap-2 mt-2">
            {event.category && <Badge variant="secondary">{event.category}</Badge>}
            <Badge variant="outline">{event.isRecurring ? 'Recurring' : 'One-time'}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/events/${id}/edit`}>
            <Button variant="outline" className="border-[var(--st-border)] text-[var(--st-fg)]">
              Edit
            </Button>
          </Link>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Event Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
          <CardHeader>
            <CardTitle className="text-[var(--st-fg)]">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.description && (
              <div>
                <label className="text-sm font-medium text-[var(--st-muted)]">Description</label>
                <p className="mt-1 text-[var(--st-fg)]">{event.description}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-[var(--st-muted)]">Location</label>
              <p className="mt-1 text-[var(--st-fg)]">{event.location || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--st-muted)]">Start Date/Time</label>
              <p className="mt-1 text-[var(--st-fg)]">{formatDate(event.startDatetime)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--st-muted)]">End Date/Time</label>
              <p className="mt-1 text-[var(--st-fg)]">{formatDate(event.endDatetime)}</p>
            </div>
          </CardContent>
        </Card>

        {event.isRecurring && (
          <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
            <CardHeader>
              <CardTitle className="text-[var(--st-fg)]">Recurrence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--st-muted)]">Pattern</label>
                <p className="mt-1 text-[var(--st-fg)]">{formatRecurrenceRule(event.recurrenceRule)}</p>
              </div>
              <Button 
                onClick={handleGenerateOccurrences} 
                disabled={generating}
                className="bg-[var(--st-primary)] text-[var(--st-primaryFg)] hover:bg-[var(--st-primary-hover)]"
              >
                {generating ? 'Generating...' : 'Generate Occurrences (Next 90 Days)'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Occurrences */}
      <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[var(--st-fg)]">Occurrences</CardTitle>
          {!event.isRecurring && (
            <Button 
              onClick={handleGenerateOccurrences} 
              size="sm" 
              disabled={generating}
              className="bg-[var(--st-primary)] text-[var(--st-primaryFg)] hover:bg-[var(--st-primary-hover)]"
            >
              {generating ? 'Generating...' : 'Create Occurrence'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {event.occurrences && event.occurrences.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)]">
                  <TableHead className="text-[var(--st-muted)]">Date/Time</TableHead>
                  <TableHead className="text-[var(--st-muted)]">End Time</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Status</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Notes</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.occurrences.map((occ) => (
                  <TableRow key={occ.id} className="border-[var(--st-border)]">
                    <TableCell className="text-[var(--st-fg)]">{formatDate(occ.startsAt)}</TableCell>
                    <TableCell className="text-[var(--st-fg)]">{formatDate(occ.endsAt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={occ.status === 'scheduled' ? 'default' : 'destructive'}
                      >
                        {occ.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-[var(--st-fg)]">
                      {occ.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/occurrences/${occ.id}`}>
                        <Button variant="ghost" size="sm" className="text-[var(--st-muted)] hover:text-[var(--st-fg)]">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-[var(--st-muted)] text-center py-8">
              No occurrences yet. {event.isRecurring ? 'Click "Generate Occurrences" to create them.' : 'Click "Create Occurrence" to add one.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
