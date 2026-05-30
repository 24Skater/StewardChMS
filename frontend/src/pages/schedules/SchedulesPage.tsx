import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCalendars, useDeleteCalendar } from '@/hooks/useSchedules'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function SchedulesPage() {
  const { data: calendars, isLoading } = useCalendars()
  const deleteCalendar = useDeleteCalendar()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete calendar "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await deleteCalendar.mutateAsync(id)
    } catch {
      // error handled
    } finally {
      setDeletingId(null)
    }
  }

  // Group by ministry
  const byMinistry = (calendars ?? []).reduce<Record<string, typeof calendars>>((acc, cal) => {
    const key = cal.ministry.name
    if (!acc[key]) acc[key] = []
    acc[key]!.push(cal)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">Ministry Schedules</h1>
          <p className="text-sm text-[var(--st-muted)]">Manage duty rosters for each ministry</p>
        </div>
        <Link to="/schedules/new">
          <Button className="bg-[var(--st-primary)] hover:opacity-90 text-white">
            + New Calendar
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-[var(--st-muted)]">Loading...</p>
      ) : !calendars || calendars.length === 0 ? (
        <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
          <CardContent className="py-12 text-center">
            <p className="text-[var(--st-muted)] mb-4">No ministry calendars yet.</p>
            <Link to="/schedules/new">
              <Button className="bg-[var(--st-primary)] hover:opacity-90 text-white">
                Create your first calendar
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        Object.entries(byMinistry).map(([ministryName, cals]) => (
          <Card key={ministryName} className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
            <CardHeader>
              <CardTitle className="text-[var(--st-fg)]">{ministryName}</CardTitle>
              <CardDescription className="text-[var(--st-muted)]">{cals?.length} calendar(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--st-border)]">
                    <TableHead className="text-[var(--st-muted)]">Calendar</TableHead>
                    <TableHead className="text-[var(--st-muted)]">Service Day</TableHead>
                    <TableHead className="text-[var(--st-muted)]">Rotation</TableHead>
                    <TableHead className="text-[var(--st-muted)]">Periods</TableHead>
                    <TableHead className="text-[var(--st-muted)]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cals?.map(cal => (
                    <TableRow key={cal.id} className="border-[var(--st-border)]">
                      <TableCell>
                        <Link to={`/schedules/${cal.id}`} className="text-[var(--st-primary)] font-medium hover:underline">
                          {cal.name}
                        </Link>
                        {cal.description && (
                          <p className="text-xs text-[var(--st-muted)] mt-0.5">{cal.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-[var(--st-muted)]">{DAYS[cal.serviceDayOfWeek]}</TableCell>
                      <TableCell className="text-[var(--st-muted)]">{cal._count?.rotationMembers ?? 0} members</TableCell>
                      <TableCell className="text-[var(--st-muted)]">{cal._count?.periods ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link to={`/schedules/${cal.id}`}>
                            <Button size="sm" variant="outline" className="border-[var(--st-border)] text-[var(--st-mutedFg)] text-xs">
                              View
                            </Button>
                          </Link>
                          <Link to={`/schedules/${cal.id}/edit`}>
                            <Button size="sm" variant="outline" className="border-[var(--st-border)] text-[var(--st-mutedFg)] text-xs">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(cal.id, cal.name)}
                            disabled={deletingId === cal.id}
                            className="text-xs"
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

export default SchedulesPage
