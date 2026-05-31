import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useMinistryCalendar,
  usePeriods,
  useCreatePeriod,
  useUpdateRotation,
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const calendarId = id || ''

  const { data: calendar, isLoading: calLoading, error: calError } = useMinistryCalendar(calendarId)
  const { data: periods, isLoading: periodsLoading } = usePeriods(calendarId)
  const createPeriodMutation = useCreatePeriod()
  const updateRotationMutation = useUpdateRotation()
  const { data: membersData } = useMembers({ limit: 500 })

  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false)
  const [newPeriodYear, setNewPeriodYear] = useState(new Date().getFullYear())
  const [newPeriodMonth, setNewPeriodMonth] = useState(new Date().getMonth() + 1)

  // Rotation editing
  const [editingRotation, setEditingRotation] = useState(false)
  const [rotationIds, setRotationIds] = useState<string[]>([])

  const handleStartEditRotation = () => {
    const current = calendar?.rotationMembers.map((rm) => rm.memberId) || []
    setRotationIds(current)
    setEditingRotation(true)
  }

  const handleRotationMemberChange = (index: number, memberId: string) => {
    const updated = [...rotationIds]
    updated[index] = memberId
    setRotationIds(updated)
  }

  const handleAddRotationSlot = () => {
    setRotationIds([...rotationIds, ''])
  }

  const handleRemoveRotationSlot = (index: number) => {
    setRotationIds(rotationIds.filter((_, i) => i !== index))
  }

  const handleSaveRotation = async () => {
    const filtered = rotationIds.filter(Boolean)
    await updateRotationMutation.mutateAsync({ id: calendarId, memberIds: filtered })
    setEditingRotation(false)
  }

  const handleCreatePeriod = async () => {
    await createPeriodMutation.mutateAsync({
      calendarId,
      data: { year: newPeriodYear, month: newPeriodMonth, autoGenerate: true },
    })
    setIsCreatingPeriod(false)
  }

  if (calLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--st-muted)]">Loading calendar...</div>
      </div>
    )
  }

  if (calError || !calendar) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">Error loading calendar</div>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]
  const allMembers = membersData?.members || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/schedules" className="text-[var(--st-muted)] hover:text-[var(--st-primary)] text-sm">
              Schedules
            </Link>
            <span className="text-[var(--st-muted)]">/</span>
            <h1 className="text-3xl font-bold text-[var(--st-fg)]">{calendar.name}</h1>
          </div>
          <p className="mt-1 text-[var(--st-muted)]">
            {calendar.ministry?.name} — {DAY_NAMES[calendar.serviceDayOfWeek]}s
          </p>
        </div>
        <Link to={`/schedules/${calendarId}/edit`}>
          <Button variant="outline" className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]">
            Edit
          </Button>
        </Link>
      </div>

      {/* Calendar Info */}
      <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
        <CardHeader>
          <CardTitle className="text-[var(--st-fg)]">Calendar Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-[var(--st-muted)]">Service Day</p>
            <p className="text-[var(--st-fg)]">{DAY_NAMES[calendar.serviceDayOfWeek]}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--st-muted)]">Reminder Days</p>
            <p className="text-[var(--st-fg)]">{calendar.reminderDaysBeforeSlot} days before</p>
          </div>
          <div>
            <p className="text-sm text-[var(--st-muted)]">Description</p>
            <p className="text-[var(--st-fg)]">{calendar.description || '—'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Rotation */}
      <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[var(--st-fg)]">Rotation Members</CardTitle>
            {!editingRotation && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEditRotation}
                className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
              >
                Manage Rotation
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingRotation ? (
            <div className="space-y-3">
              {rotationIds.map((memberId, idx) => (
                <div key={`${idx}-${memberId}`} className="flex items-center gap-2">
                  <span className="w-6 text-sm text-[var(--st-muted)]">{idx + 1}.</span>
                  <Select
                    value={memberId}
                    onValueChange={(v) => handleRotationMemberChange(idx, v)}
                  >
                    <SelectTrigger className="flex-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                      {allMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName} {m.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRotationSlot(idx)}
                    className="text-red-500 hover:text-red-400"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddRotationSlot}
                  className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                >
                  Add Member
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveRotation}
                  disabled={updateRotationMutation.isPending}
                  className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]"
                >
                  {updateRotationMutation.isPending ? 'Saving...' : 'Save Rotation'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingRotation(false)}
                  className="text-[var(--st-muted)] hover:text-[var(--st-fg)]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : calendar.rotationMembers.length === 0 ? (
            <p className="text-[var(--st-muted)]">No rotation members. Click "Manage Rotation" to add members.</p>
          ) : (
            <ol className="list-decimal list-inside space-y-1">
              {calendar.rotationMembers
                .slice()
                .sort((a, b) => a.rotationOrder - b.rotationOrder)
                .map((rm) => (
                  <li key={rm.id} className="text-[var(--st-fg)]">
                    {rm.member.firstName} {rm.member.lastName}
                  </li>
                ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Periods */}
      <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[var(--st-fg)]">Schedule Periods</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreatingPeriod(!isCreatingPeriod)}
              className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
            >
              New Period
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New period form */}
          {isCreatingPeriod && (
            <div className="flex items-end gap-3 rounded-lg border border-[var(--st-border)] p-4">
              <div>
                <label className="text-sm text-[var(--st-muted)]">Year</label>
                <Select value={String(newPeriodYear)} onValueChange={(v) => setNewPeriodYear(parseInt(v, 10))}>
                  <SelectTrigger className="mt-1 w-28 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-[var(--st-muted)]">Month</label>
                <Select value={String(newPeriodMonth)} onValueChange={(v) => setNewPeriodMonth(parseInt(v, 10))}>
                  <SelectTrigger className="mt-1 w-36 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreatePeriod}
                disabled={createPeriodMutation.isPending}
                className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]"
              >
                {createPeriodMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsCreatingPeriod(false)}
                className="text-[var(--st-muted)] hover:text-[var(--st-fg)]"
              >
                Cancel
              </Button>
            </div>
          )}

          {periodsLoading ? (
            <div className="text-[var(--st-muted)]">Loading periods...</div>
          ) : !periods || periods.length === 0 ? (
            <div className="text-[var(--st-muted)]">No periods yet. Create your first period above.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)] hover:bg-transparent">
                  <TableHead className="text-[var(--st-muted)]">Period</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Status</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Slots</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods
                  .slice()
                  .sort((a, b) => b.year - a.year || b.month - a.month)
                  .map((period) => (
                    <TableRow
                      key={period.id}
                      className="border-[var(--st-border)] cursor-pointer hover:bg-[var(--st-surface-hover)]"
                      onClick={() => navigate(`/schedules/${calendarId}/periods/${period.id}`)}
                    >
                      <TableCell className="font-medium text-[var(--st-fg)]">
                        {MONTH_NAMES[period.month - 1]} {period.year}
                      </TableCell>
                      <TableCell>
                        {period.status === 'published' ? (
                          <Badge variant="success">Published</Badge>
                        ) : (
                          <Badge variant="warning">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-[var(--st-muted)]">
                        {period.slotCount} slots
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ScheduleDetailPage
