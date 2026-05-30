import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  useCalendar, usePeriods, useCreatePeriod, useDeletePeriod,
  useUpdateRotation, useRegenerateToken,
} from '@/hooks/useSchedules'
import { useMembers } from '@/hooks/useMembers'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const calendarId = id!

  const { data: calendar, isLoading: calLoading } = useCalendar(calendarId)
  const { data: periods, isLoading: periodsLoading } = usePeriods(calendarId)
  const createPeriod = useCreatePeriod()
  const deletePeriod = useDeletePeriod()
  const updateRotation = useUpdateRotation()
  const regenerateToken = useRegenerateToken()
  const { data: membersData } = useMembers({ limit: 100 })

  const [newPeriodOpen, setNewPeriodOpen] = useState(false)
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear())
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1)
  const [autoGenerate, setAutoGenerate] = useState(true)

  const [rotationOpen, setRotationOpen] = useState(false)
  const [rotationIds, setRotationIds] = useState<string[]>([])
  const [selectedMember, setSelectedMember] = useState('')

  const handleOpenRotation = () => {
    setRotationIds(calendar?.rotationMembers?.map(rm => rm.memberId) ?? [])
    setRotationOpen(true)
  }

  const handleAddToRotation = () => {
    if (selectedMember && !rotationIds.includes(selectedMember)) {
      setRotationIds([...rotationIds, selectedMember])
      setSelectedMember('')
    }
  }

  const handleSaveRotation = async () => {
    await updateRotation.mutateAsync({ id: calendarId, memberIds: rotationIds })
    setRotationOpen(false)
  }

  const handleCreatePeriod = async () => {
    await createPeriod.mutateAsync({ calendarId, year: periodYear, month: periodMonth, autoGenerate })
    setNewPeriodOpen(false)
  }

  const handleDeletePeriod = async (periodId: string) => {
    if (!confirm('Delete this draft period?')) return
    await deletePeriod.mutateAsync({ calendarId, id: periodId })
  }

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerate share token? All existing TV/kiosk links will stop working immediately.')) return
    await regenerateToken.mutateAsync(calendarId)
  }

  if (calLoading) return <p className="text-[var(--st-muted)]">Loading...</p>
  if (!calendar) return <p className="text-[var(--st-danger)]">Calendar not found.</p>

  const members = membersData?.members ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--st-muted)]">
            <Link to="/schedules" className="hover:underline">Schedules</Link>
            {' / '}
            {calendar.name}
          </p>
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">{calendar.name}</h1>
          <p className="text-sm text-[var(--st-muted)]">
            {calendar.ministry.name} · {DAYS[calendar.serviceDayOfWeek]}s · {calendar.reminderDaysBeforeSlot} day reminder
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/schedules/${calendarId}/edit`}>
            <Button variant="outline" className="border-[var(--st-border)] text-[var(--st-mutedFg)]">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Rotation list */}
      <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-[var(--st-fg)]">Rotation List</CardTitle>
            <CardDescription className="text-[var(--st-muted)]">
              {calendar.rotationMembers?.length ?? 0} members in rotation
            </CardDescription>
          </div>
          <Dialog open={rotationOpen} onOpenChange={setRotationOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenRotation} variant="outline" className="border-[var(--st-border)] text-[var(--st-mutedFg)]">
                Edit Rotation
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[var(--st-surface)] border-[var(--st-border)] max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[var(--st-fg)]">Edit Rotation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger className="flex-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                      <SelectValue placeholder="Add member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members.filter(m => !rotationIds.includes(m.id)).map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddToRotation} className="bg-[var(--st-primary)] hover:opacity-90 text-white">Add</Button>
                </div>
                <div className="space-y-1">
                  {rotationIds.map((memberId, idx) => {
                    const member = members.find(m => m.id === memberId)
                    const rm = calendar.rotationMembers?.find(r => r.memberId === memberId)
                    return (
                      <div key={memberId} className="flex items-center justify-between py-1 px-2 rounded bg-[var(--st-surface-hover)]">
                        <span className="text-sm text-[var(--st-fg)]">
                          {idx + 1}. {member?.firstName ?? rm?.member.firstName} {member?.lastName ?? rm?.member.lastName}
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-xs h-6"
                          onClick={() => setRotationIds(rotationIds.filter(id => id !== memberId))}
                        >
                          Remove
                        </Button>
                      </div>
                    )
                  })}
                  {rotationIds.length === 0 && (
                    <p className="text-sm text-[var(--st-muted)]">No members in rotation yet.</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setRotationOpen(false)} className="border-[var(--st-border)] text-[var(--st-mutedFg)]">Cancel</Button>
                  <Button onClick={handleSaveRotation} disabled={updateRotation.isPending} className="bg-[var(--st-primary)] hover:opacity-90 text-white">Save</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {(calendar.rotationMembers?.length ?? 0) === 0 ? (
            <p className="text-sm text-[var(--st-muted)]">No rotation members. Click "Edit Rotation" to add members.</p>
          ) : (
            <div className="space-y-1">
              {calendar.rotationMembers?.map((rm, i) => (
                <div key={rm.id} className="text-sm text-[var(--st-fg)]">
                  {i + 1}. {rm.member.firstName} {rm.member.lastName}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kiosk share token */}
      {calendar.shareToken && (
        <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[var(--st-fg)]">TV / Kiosk Link</CardTitle>
              <CardDescription className="text-[var(--st-muted)]">Share this link for a public display</CardDescription>
            </div>
            <Button onClick={handleRegenerateToken} variant="outline" className="border-[var(--st-border)] text-[var(--st-mutedFg)] text-xs">
              Regenerate Token
            </Button>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <a
              href={`/kiosk/${calendar.shareToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--st-primary)] underline underline-offset-2 break-all hover:opacity-75 transition-opacity"
            >
              {window.location.origin}/kiosk/{calendar.shareToken}
            </a>
          </CardContent>
        </Card>
      )}

      {/* Periods */}
      <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-[var(--st-fg)]">Schedule Periods</CardTitle>
            <CardDescription className="text-[var(--st-muted)]">Monthly duty rosters</CardDescription>
          </div>
          <Dialog open={newPeriodOpen} onOpenChange={setNewPeriodOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[var(--st-primary)] hover:opacity-90 text-white">+ New Period</Button>
            </DialogTrigger>
            <DialogContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
              <DialogHeader>
                <DialogTitle className="text-[var(--st-fg)]">Create Schedule Period</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[var(--st-mutedFg)]">Year</Label>
                    <Input
                      type="number"
                      value={periodYear}
                      onChange={e => setPeriodYear(Number(e.target.value))}
                      className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                    />
                  </div>
                  <div>
                    <Label className="text-[var(--st-mutedFg)]">Month</Label>
                    <Select value={String(periodMonth)} onValueChange={v => setPeriodMonth(Number(v))}>
                      <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoGenerate"
                    checked={autoGenerate}
                    onChange={e => setAutoGenerate(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="autoGenerate" className="text-[var(--st-mutedFg)]">
                    Auto-generate slots from rotation
                  </Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setNewPeriodOpen(false)} className="border-[var(--st-border)] text-[var(--st-mutedFg)]">Cancel</Button>
                  <Button onClick={handleCreatePeriod} disabled={createPeriod.isPending} className="bg-[var(--st-primary)] hover:opacity-90 text-white">
                    {createPeriod.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {periodsLoading ? (
            <p className="text-[var(--st-muted)]">Loading...</p>
          ) : !periods || periods.length === 0 ? (
            <p className="text-sm text-[var(--st-muted)]">No periods yet. Create one to start scheduling.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)]">
                  <TableHead className="text-[var(--st-muted)]">Period</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Status</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Slots</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map(p => (
                  <TableRow key={p.id} className="border-[var(--st-border)]">
                    <TableCell className="text-[var(--st-fg)] font-medium">
                      {MONTHS[p.month - 1]} {p.year}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${p.status === 'PUBLISHED' ? 'bg-[var(--st-success)]/20 text-[var(--st-success)]' : 'bg-[var(--st-warning)]/20 text-[var(--st-warning)]'}`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-[var(--st-muted)]">{p._count?.slots ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/schedules/${calendarId}/periods/${p.id}`)}
                          className="border-[var(--st-border)] text-[var(--st-mutedFg)] text-xs"
                        >
                          Open
                        </Button>
                        {p.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePeriod(p.id)}
                            disabled={deletePeriod.isPending}
                            className="text-xs"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
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
