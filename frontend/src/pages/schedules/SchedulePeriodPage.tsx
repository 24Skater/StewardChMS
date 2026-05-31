import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  usePeriod,
  useAssignSlot,
  useUnassignSlot,
  usePublishPeriod,
} from '@/hooks/useSchedules'
import { useMembers } from '@/hooks/useMembers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ScheduleSlotWithAssignment } from '@/lib/api/schedules'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatSlotDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

interface SlotRowProps {
  slot: ScheduleSlotWithAssignment
  isPublished: boolean
  memberOptions: { id: string; label: string }[]
  hasConflict?: boolean
  onAssign: (slotId: string, memberId: string) => void
  onUnassign: (slotId: string) => void
  isPending: boolean
}

function SlotRow({ slot, isPublished, memberOptions, hasConflict, onAssign, onUnassign, isPending }: SlotRowProps) {
  const assignedName = slot.assignment
    ? `${slot.assignment.member.firstName} ${slot.assignment.member.lastName}`
    : null

  return (
    <TableRow className="border-[var(--st-border)]">
      <TableCell className="text-[var(--st-fg)]">{formatSlotDate(slot.slotDate)}</TableCell>
      <TableCell className="text-[var(--st-muted)]">{slot.label || '—'}</TableCell>
      <TableCell>
        {isPublished ? (
          <div className="flex items-center gap-2">
            <span className={assignedName ? 'text-[var(--st-fg)]' : 'text-[var(--st-muted)] italic'}>
              {assignedName || 'Unassigned'}
            </span>
            {hasConflict && (
              <Badge variant="warning">Conflict</Badge>
            )}
            {assignedName && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => onUnassign(slot.id)}
                className="text-red-500 hover:text-red-400 ml-2"
              >
                Unassign
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Select
              value={slot.assignment?.memberId || ''}
              onValueChange={(memberId) => onAssign(slot.id, memberId)}
              disabled={isPending}
            >
              <SelectTrigger className="w-48 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                {memberOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasConflict && (
              <Badge variant="warning">Conflict</Badge>
            )}
            {slot.assignment && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => onUnassign(slot.id)}
                className="text-red-500 hover:text-red-400"
              >
                Clear
              </Button>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

function SchedulePeriodPage() {
  const { id: calendarId, periodId } = useParams<{ id: string; periodId: string }>()

  const {
    data: period,
    isLoading,
    error,
  } = usePeriod(calendarId || '', periodId || '')

  const { data: membersData } = useMembers({ limit: 500 })
  const assignMutation = useAssignSlot()
  const unassignMutation = useUnassignSlot()
  const publishMutation = usePublishPeriod()

  // Track slot IDs with conflicts from the most recent assign response
  const [conflictSlotIds, setConflictSlotIds] = useState<Set<string>>(new Set())
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)

  const memberOptions = (membersData?.members || []).map((m) => ({
    id: m.id,
    label: `${m.firstName} ${m.lastName}`,
  }))

  const handleAssign = async (slotId: string, memberId: string) => {
    const result = await assignMutation.mutateAsync({ id: slotId, data: { memberId } })
    if (result.conflicts.length > 0) {
      setConflictSlotIds((prev) => new Set([...prev, slotId]))
    } else {
      setConflictSlotIds((prev) => {
        const next = new Set(prev)
        next.delete(slotId)
        return next
      })
    }
  }

  const handleUnassign = async (slotId: string) => {
    await unassignMutation.mutateAsync(slotId)
    setConflictSlotIds((prev) => {
      const next = new Set(prev)
      next.delete(slotId)
      return next
    })
  }

  const handlePublish = () => {
    if (!calendarId || !periodId) return
    setShowPublishConfirm(true)
  }

  const handleConfirmPublish = async () => {
    if (!calendarId || !periodId) return
    await publishMutation.mutateAsync({ calendarId, periodId })
    setShowPublishConfirm(false)
  }

  const isPending =
    assignMutation.isPending || unassignMutation.isPending || publishMutation.isPending

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--st-muted)]">Loading period...</div>
      </div>
    )
  }

  if (error || !period) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">Error loading period</div>
      </div>
    )
  }

  const isPublished = period.status === 'published'
  const sortedSlots = [...period.slots].sort((a, b) => {
    const dateCompare = a.slotDate.localeCompare(b.slotDate)
    if (dateCompare !== 0) return dateCompare
    return (a.label || '').localeCompare(b.label || '')
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/schedules" className="text-[var(--st-muted)] hover:text-[var(--st-primary)]">
              Schedules
            </Link>
            <span className="text-[var(--st-muted)]">/</span>
            <Link
              to={`/schedules/${calendarId}`}
              className="text-[var(--st-muted)] hover:text-[var(--st-primary)]"
            >
              Calendar
            </Link>
            <span className="text-[var(--st-muted)]">/</span>
            <span className="text-[var(--st-fg)]">
              {MONTH_NAMES[period.month - 1]} {period.year}
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-bold text-[var(--st-fg)]">
            {MONTH_NAMES[period.month - 1]} {period.year}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            {isPublished ? (
              <Badge variant="success">Published</Badge>
            ) : (
              <Badge variant="warning">Draft</Badge>
            )}
            <span className="text-[var(--st-muted)] text-sm">{period.slotCount} slots</span>
          </div>
        </div>
        {!isPublished && (
          <Button
            onClick={handlePublish}
            disabled={isPending}
            className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]"
          >
            {publishMutation.isPending ? 'Publishing...' : 'Publish Period'}
          </Button>
        )}
      </div>

      {/* Slots table */}
      <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
        <CardHeader>
          <CardTitle className="text-[var(--st-fg)]">
            {isPublished ? 'Schedule' : 'Draft Schedule — Assign Members'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedSlots.length === 0 ? (
            <p className="text-[var(--st-muted)]">No slots in this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)] hover:bg-transparent">
                  <TableHead className="text-[var(--st-muted)]">Date</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Label</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Assigned Member</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSlots.map((slot) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    isPublished={isPublished}
                    memberOptions={memberOptions}
                    hasConflict={conflictSlotIds.has(slot.id)}
                    onAssign={handleAssign}
                    onUnassign={handleUnassign}
                    isPending={isPending}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Mutation errors */}
      {(assignMutation.isError || unassignMutation.isError || publishMutation.isError) && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
          <p className="text-sm text-red-500">
            {assignMutation.error?.message ||
              unassignMutation.error?.message ||
              publishMutation.error?.message ||
              'An error occurred'}
          </p>
        </div>
      )}

      {/* Publish confirmation dialog */}
      <AlertDialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this period?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make the schedule visible and notify members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPublish}
              className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]"
            >
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SchedulePeriodPage
