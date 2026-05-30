import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePeriod, usePublishPeriod, useAssignSlot, useUnassignSlot } from '@/hooks/useSchedules'
import { useMembers } from '@/hooks/useMembers'
import type { ScheduleSlot } from '@/lib/api/schedules'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Build a 6-row × 7-col grid for a given year/month
function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

// Map slot ISO date → slot (by day-of-month)
function slotsByDay(slots: ScheduleSlot[], year: number, month: number): Record<number, ScheduleSlot[]> {
  const map: Record<number, ScheduleSlot[]> = {}
  for (const slot of slots) {
    const d = new Date(slot.slotDate)
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      const day = d.getDate()
      if (!map[day]) map[day] = []
      map[day].push(slot)
    }
  }
  return map
}

function SchedulePeriodPage() {
  const { id: calendarId, periodId } = useParams<{ id: string; periodId: string }>()
  const { data: period, isLoading } = usePeriod(calendarId!, periodId!)
  const publishPeriod = usePublishPeriod()
  const assignSlot = useAssignSlot()
  const unassignSlot = useUnassignSlot()
  const { data: membersData } = useMembers({ limit: 200 })

  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [openSlotId, setOpenSlotId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState('')
  const [conflictWarnings, setConflictWarnings] = useState<Record<string, number>>({})

  const members = membersData?.members ?? []
  const isPublished = period?.status === 'PUBLISHED'

  const handlePublish = async () => {
    if (!confirm('Publish this period? All assigned members will be notified.')) return
    await publishPeriod.mutateAsync({ calendarId: calendarId!, id: periodId! })
  }

  const handleAssign = async (slotId: string) => {
    if (!selectedMember) return
    const result = await assignSlot.mutateAsync({
      id: slotId, calendarId: calendarId!, periodId: periodId!, memberId: selectedMember,
    })
    if (result.conflicts.length > 0) {
      setConflictWarnings(prev => ({ ...prev, [slotId]: result.conflicts.length }))
    } else {
      setConflictWarnings(prev => { const n = { ...prev }; delete n[slotId]; return n })
    }
    setOpenSlotId(null)
    setSelectedMember('')
  }

  const handleUnassign = async (slotId: string) => {
    await unassignSlot.mutateAsync({ id: slotId, calendarId: calendarId!, periodId: periodId! })
    setConflictWarnings(prev => { const n = { ...prev }; delete n[slotId]; return n })
  }

  const openAssign = (slot: ScheduleSlot) => {
    setOpenSlotId(slot.id)
    setSelectedMember(slot.assignment?.memberId ?? '')
  }

  if (isLoading) return <p className="text-[var(--st-muted)]">Loading...</p>
  if (!period) return <p className="text-[var(--st-danger)]">Period not found.</p>

  const title = `${MONTHS[period.month - 1]} ${period.year}`
  const grid = buildCalendarGrid(period.year, period.month)
  const daySlots = slotsByDay(period.slots, period.year, period.month)
  const today = new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--st-muted)]">
            <Link to="/schedules" className="hover:underline">Schedules</Link>
            {' / '}
            <Link to={`/schedules/${calendarId}`} className="hover:underline">Calendar</Link>
            {' / '}
            {title}
          </p>
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">{title}</h1>
          <span className={`inline-block mt-1 px-2 py-1 rounded text-xs ${isPublished ? 'bg-[var(--st-success)]/20 text-[var(--st-success)]' : 'bg-[var(--st-warning)]/20 text-[var(--st-warning)]'}`}>
            {period.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-[var(--st-border)] overflow-hidden text-sm">
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1.5 transition-colors ${view === 'calendar' ? 'bg-[var(--st-primary)] text-white' : 'text-[var(--st-muted)] hover:bg-[var(--st-surface-hover)]'}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 transition-colors ${view === 'list' ? 'bg-[var(--st-primary)] text-white' : 'text-[var(--st-muted)] hover:bg-[var(--st-surface-hover)]'}`}
            >
              List
            </button>
          </div>
          {!isPublished && (
            <Button
              onClick={handlePublish}
              disabled={publishPeriod.isPending}
              className="bg-[var(--st-primary)] hover:opacity-90 text-white"
            >
              {publishPeriod.isPending ? 'Publishing...' : 'Publish & Notify'}
            </Button>
          )}
        </div>
      </div>

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && (
        <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
          <CardHeader>
            <CardTitle className="text-[var(--st-fg)]">{title}</CardTitle>
            <CardDescription className="text-[var(--st-muted)]">
              {period.slots.length} slot(s) · {isPublished ? 'Read-only' : 'Click a slot to assign'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-[var(--st-border)]">
              {WEEKDAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-[var(--st-muted)] uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar rows */}
            {grid.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 border-b border-[var(--st-border)] last:border-b-0">
                {row.map((day, ci) => {
                  const isToday = day !== null
                    && today.getFullYear() === period.year
                    && today.getMonth() + 1 === period.month
                    && today.getDate() === day

                  const slots = day !== null ? (daySlots[day] ?? []) : []

                  return (
                    <div
                      key={ci}
                      className={`min-h-[88px] p-1.5 border-r border-[var(--st-border)] last:border-r-0 ${day === null ? 'bg-[var(--st-surface)]/20' : ''}`}
                    >
                      {day !== null && (
                        <>
                          {/* Day number */}
                          <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[var(--st-primary)] text-white' : 'text-[var(--st-muted)]'}`}>
                            {day}
                          </div>

                          {/* Slot chips */}
                          <div className="space-y-1">
                            {slots.map(slot => {
                              const conflictCount = conflictWarnings[slot.id] ?? 0
                              const isOpen = openSlotId === slot.id

                              return (
                                <div key={slot.id}>
                                  <button
                                    onClick={() => !isPublished && openAssign(slot)}
                                    className={`w-full text-left rounded px-1.5 py-1 text-xs leading-tight transition-colors ${
                                      slot.assignment
                                        ? 'bg-[var(--st-primary)]/15 text-[var(--st-primary)] hover:bg-[var(--st-primary)]/25'
                                        : 'bg-[var(--st-warning)]/15 text-[var(--st-warning)] hover:bg-[var(--st-warning)]/25'
                                    } ${isPublished ? 'cursor-default' : 'cursor-pointer'}`}
                                  >
                                    {slot.label && <div className="font-medium truncate">{slot.label}</div>}
                                    <div className="truncate">
                                      {slot.assignment
                                        ? `${slot.assignment.member.firstName} ${slot.assignment.member.lastName}`
                                        : 'Unassigned'}
                                    </div>
                                    {conflictCount > 0 && (
                                      <div className="text-[var(--st-warning)] font-medium">⚠ {conflictCount} conflict</div>
                                    )}
                                  </button>

                                  {/* Inline assignment picker */}
                                  {isOpen && !isPublished && (
                                    <div className="mt-1 p-1.5 rounded border border-[var(--st-border)] bg-[var(--st-surface)] space-y-1 z-10 relative">
                                      <Select value={selectedMember} onValueChange={setSelectedMember}>
                                        <SelectTrigger className="h-7 text-xs bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                                          <SelectValue placeholder="Pick member..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {members.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          onClick={() => handleAssign(slot.id)}
                                          disabled={!selectedMember || assignSlot.isPending}
                                          className="h-6 text-xs flex-1 bg-[var(--st-primary)] hover:opacity-90 text-white px-2"
                                        >
                                          Save
                                        </Button>
                                        {slot.assignment && (
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => { handleUnassign(slot.id); setOpenSlotId(null) }}
                                            disabled={unassignSlot.isPending}
                                            className="h-6 text-xs px-2"
                                          >
                                            Clear
                                          </Button>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => { setOpenSlotId(null); setSelectedMember('') }}
                                          className="h-6 text-xs px-2 border-[var(--st-border)] text-[var(--st-mutedFg)]"
                                        >
                                          ✕
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Published unassign */}
                                  {isPublished && slot.assignment && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUnassign(slot.id)}
                                      disabled={unassignSlot.isPending}
                                      className="mt-1 h-5 text-xs w-full border-[var(--st-border)] text-[var(--st-mutedFg)]"
                                    >
                                      Unassign
                                    </Button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
          <CardHeader>
            <CardTitle className="text-[var(--st-fg)]">Slots</CardTitle>
            <CardDescription className="text-[var(--st-muted)]">
              {period.slots.length} slot(s) · {isPublished ? 'Read-only (published)' : 'Click a slot to assign a member'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {period.slots.length === 0 ? (
              <p className="text-sm text-[var(--st-muted)]">No slots in this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--st-border)]">
                    <TableHead className="text-[var(--st-muted)]">Date</TableHead>
                    <TableHead className="text-[var(--st-muted)]">Label</TableHead>
                    <TableHead className="text-[var(--st-muted)]">Assigned</TableHead>
                    <TableHead className="text-[var(--st-muted)]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {period.slots.map(slot => {
                    const conflictCount = conflictWarnings[slot.id] ?? 0
                    const isOpen = openSlotId === slot.id
                    return (
                      <TableRow key={slot.id} className="border-[var(--st-border)]">
                        <TableCell className="text-[var(--st-fg)]">
                          {new Date(slot.slotDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-[var(--st-muted)]">{slot.label ?? '—'}</TableCell>
                        <TableCell>
                          {slot.assignment ? (
                            <span className="flex items-center gap-2">
                              <span className="text-[var(--st-fg)]">
                                {slot.assignment.member.firstName} {slot.assignment.member.lastName}
                              </span>
                              {conflictCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-[var(--st-warning)]/20 text-[var(--st-warning)]">
                                  ⚠ {conflictCount} conflict
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[var(--st-muted)] italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isPublished ? (
                            slot.assignment && (
                              <Button size="sm" variant="outline" onClick={() => handleUnassign(slot.id)} disabled={unassignSlot.isPending} className="border-[var(--st-border)] text-[var(--st-mutedFg)] text-xs">
                                Unassign
                              </Button>
                            )
                          ) : (
                            <div className="flex items-center gap-2">
                              {isOpen ? (
                                <>
                                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                                    <SelectTrigger className="w-44 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)] h-8 text-xs">
                                      <SelectValue placeholder="Pick member..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {members.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button size="sm" onClick={() => handleAssign(slot.id)} disabled={!selectedMember || assignSlot.isPending} className="bg-[var(--st-primary)] hover:opacity-90 text-white text-xs h-8">Assign</Button>
                                  <Button size="sm" variant="outline" onClick={() => { setOpenSlotId(null); setSelectedMember('') }} className="border-[var(--st-border)] text-[var(--st-mutedFg)] text-xs h-8">Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => openAssign(slot)} className="border-[var(--st-border)] text-[var(--st-mutedFg)] text-xs">
                                    {slot.assignment ? 'Reassign' : 'Assign'}
                                  </Button>
                                  {slot.assignment && (
                                    <Button size="sm" variant="destructive" onClick={() => handleUnassign(slot.id)} disabled={unassignSlot.isPending} className="text-xs">Unassign</Button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SchedulePeriodPage
