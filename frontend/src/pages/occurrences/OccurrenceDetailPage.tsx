import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useOccurrence,
  useUpdateOccurrence,
  useCreateRegistration,
  useCancelRegistration,
  useCreateCheckIn,
} from '../../hooks/useOccurrences'
import {
  useWorshipPlan,
  useCreateWorshipPlan,
  useCreateWorshipPlanItem,
  useDeleteWorshipPlanItem,
  useReorderWorshipPlanItems,
} from '../../hooks/useWorshipPlans'
import { useSongs } from '../../hooks/useSongs'
import { useMembers } from '../../hooks/useMembers'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import type { WorshipPlanItem } from '../../lib/api'

// Registration form schema
const registrationSchema = z.object({
  type: z.enum(['member', 'guest']),
  memberId: z.string().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional().or(z.literal('')),
  guestPhone: z.string().optional(),
  partySize: z.coerce.number().int().positive().default(1),
})

type RegistrationFormData = z.infer<typeof registrationSchema>

// Check-in form schema
const checkInSchema = z.object({
  type: z.enum(['member', 'guest']),
  memberId: z.string().optional(),
  guestName: z.string().optional(),
})

type CheckInFormData = z.infer<typeof checkInSchema>

// Worship item form schema
const worshipItemSchema = z.object({
  itemType: z.enum(['song', 'scripture', 'announcement', 'sermon', 'prayer', 'other']),
  title: z.string().min(1, 'Title is required'),
  songId: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
})

type WorshipItemFormData = z.infer<typeof worshipItemSchema>

export default function OccurrenceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: occurrence, isLoading, error } = useOccurrence(id)
  const { data: worshipPlanData, error: worshipError } = useWorshipPlan(id)
  const { data: songsData } = useSongs({ limit: 100 })
  const { data: membersData } = useMembers({ limit: 100, status: 'active' })

  const updateOccurrenceMutation = useUpdateOccurrence()
  const createRegistrationMutation = useCreateRegistration()
  const cancelRegistrationMutation = useCancelRegistration()
  const createCheckInMutation = useCreateCheckIn()
  const createWorshipPlanMutation = useCreateWorshipPlan()
  const createWorshipPlanItemMutation = useCreateWorshipPlanItem()
  const deleteWorshipPlanItemMutation = useDeleteWorshipPlanItem()
  const reorderWorshipPlanItemsMutation = useReorderWorshipPlanItems()

  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [showCheckInForm, setShowCheckInForm] = useState(false)
  const [showWorshipItemForm, setShowWorshipItemForm] = useState(false)

  // Forms
  const registrationForm = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { type: 'member', partySize: 1 },
  })

  const checkInForm = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: { type: 'member' },
  })

  const worshipItemForm = useForm<WorshipItemFormData>({
    resolver: zodResolver(worshipItemSchema),
    defaultValues: { itemType: 'song' },
  })

  const registrationType = registrationForm.watch('type')
  const checkInType = checkInForm.watch('type')
  const worshipItemType = worshipItemForm.watch('itemType')

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleCancelOccurrence = async () => {
    if (!id) return
    if (!window.confirm('Are you sure you want to cancel this occurrence?')) return

    try {
      await updateOccurrenceMutation.mutateAsync({
        id,
        data: { status: 'canceled' },
      })
    } catch (error) {
      console.error('Failed to cancel occurrence:', error)
    }
  }

  const handleRegistration = async (data: RegistrationFormData) => {
    if (!id) return

    try {
      await createRegistrationMutation.mutateAsync({
        occurrenceId: id,
        data: {
          memberId: data.type === 'member' ? data.memberId : null,
          guestName: data.type === 'guest' ? data.guestName : null,
          guestEmail: data.type === 'guest' ? data.guestEmail || null : null,
          guestPhone: data.type === 'guest' ? data.guestPhone || null : null,
          partySize: data.partySize,
        },
      })
      setShowRegistrationForm(false)
      registrationForm.reset()
    } catch (error) {
      console.error('Failed to create registration:', error)
    }
  }

  const handleCancelRegistration = async (registrationId: string) => {
    if (!id) return
    try {
      await cancelRegistrationMutation.mutateAsync({
        id: registrationId,
        occurrenceId: id,
      })
    } catch (error) {
      console.error('Failed to cancel registration:', error)
    }
  }

  const handleCheckIn = async (data: CheckInFormData) => {
    if (!id) return

    try {
      await createCheckInMutation.mutateAsync({
        occurrenceId: id,
        data: {
          memberId: data.type === 'member' ? data.memberId : null,
          guestName: data.type === 'guest' ? data.guestName : null,
          method: 'manual',
        },
      })
      setShowCheckInForm(false)
      checkInForm.reset()
    } catch (error) {
      console.error('Failed to create check-in:', error)
    }
  }

  const handleCreateWorshipPlan = async () => {
    if (!id) return
    try {
      await createWorshipPlanMutation.mutateAsync({
        occurrenceId: id,
        data: {},
      })
    } catch (error) {
      console.error('Failed to create worship plan:', error)
    }
  }

  const handleAddWorshipItem = async (data: WorshipItemFormData) => {
    if (!id || !worshipPlanData) return

    const items = worshipPlanData.items || []
    const maxSortOrder = items.length > 0 ? Math.max(...items.map(i => i.sortOrder)) : -1

    try {
      await createWorshipPlanItemMutation.mutateAsync({
        planId: worshipPlanData.id,
        occurrenceId: id,
        data: {
          sortOrder: maxSortOrder + 1,
          itemType: data.itemType,
          title: data.title,
          songId: data.itemType === 'song' ? data.songId || null : null,
          durationMinutes: data.durationMinutes || null,
        },
      })
      setShowWorshipItemForm(false)
      worshipItemForm.reset()
    } catch (error) {
      console.error('Failed to add worship item:', error)
    }
  }

  const handleDeleteWorshipItem = async (itemId: string) => {
    if (!id) return
    try {
      await deleteWorshipPlanItemMutation.mutateAsync({
        itemId,
        occurrenceId: id,
      })
    } catch (error) {
      console.error('Failed to delete worship item:', error)
    }
  }

  const handleMoveItem = async (item: WorshipPlanItem, direction: 'up' | 'down') => {
    if (!id || !worshipPlanData) return

    const items = [...worshipPlanData.items].sort((a, b) => a.sortOrder - b.sortOrder)
    const currentIndex = items.findIndex(i => i.id === item.id)
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= items.length) return

    // Swap positions
    const newItems = items.map((i, idx) => ({
      id: i.id,
      sortOrder: idx === currentIndex ? newIndex : idx === newIndex ? currentIndex : idx,
    }))

    try {
      await reorderWorshipPlanItemsMutation.mutateAsync({
        planId: worshipPlanData.id,
        items: newItems,
        occurrenceId: id,
      })
    } catch (error) {
      console.error('Failed to reorder items:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-8 text-[var(--st-muted)]">Loading occurrence...</div>
      </div>
    )
  }

  if (error || !occurrence) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-[var(--st-color-danger)]/10 text-[var(--st-color-danger)] p-4 rounded border border-[var(--st-color-danger)]/30">
          Occurrence not found or error loading
        </div>
        <Link to="/events" className="mt-4 inline-block">
          <Button variant="outline" className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]">Back to Events</Button>
        </Link>
      </div>
    )
  }

  const worshipPlan = worshipError ? null : worshipPlanData

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/events" className="text-[var(--st-muted)] hover:text-[var(--st-fg)]">
              Events
            </Link>
            <span className="text-[var(--st-muted)]">/</span>
            {occurrence.event && (
              <>
                <Link
                  to={`/events/${occurrence.event.id}`}
                  className="text-[var(--st-muted)] hover:text-[var(--st-fg)]"
                >
                  {occurrence.event.title}
                </Link>
                <span className="text-[var(--st-muted)]">/</span>
              </>
            )}
            <span className="text-[var(--st-fg)]">Occurrence</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--st-fg)]">
            {occurrence.event?.title || 'Event Occurrence'}
          </h1>
          <p className="text-lg text-[var(--st-muted)] mt-1">{formatDate(occurrence.startsAt)}</p>
          <Badge
            variant={occurrence.status === 'scheduled' ? 'default' : 'destructive'}
            className="mt-2"
          >
            {occurrence.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {occurrence.status === 'scheduled' && (
            <Button variant="destructive" onClick={handleCancelOccurrence} className="bg-[var(--st-color-danger)]">
              Cancel Occurrence
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Registrations + Check-ins */}
        <div className="space-y-6">
          {/* Registrations */}
          <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[var(--st-fg)]">Registrations</CardTitle>
              <Button size="sm" onClick={() => setShowRegistrationForm(true)} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
                Add Registration
              </Button>
            </CardHeader>
            <CardContent>
              {showRegistrationForm && (
                <form
                  onSubmit={registrationForm.handleSubmit(handleRegistration)}
                  className="mb-4 p-4 border border-[var(--st-border)] rounded space-y-4 bg-[var(--st-surface-muted)]"
                >
                  <div className="space-y-2">
                    <Label className="text-[var(--st-fg)]">Type</Label>
                    <Select
                      value={registrationType}
                      onValueChange={(v) =>
                        registrationForm.setValue('type', v as 'member' | 'guest')
                      }
                    >
                      <SelectTrigger className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
                        <SelectItem value="member" className="text-[var(--st-fg)]">Member</SelectItem>
                        <SelectItem value="guest" className="text-[var(--st-fg)]">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {registrationType === 'member' ? (
                    <div className="space-y-2">
                      <Label className="text-[var(--st-fg)]">Member</Label>
                      <Select
                        value={registrationForm.watch('memberId')}
                        onValueChange={(v) => registrationForm.setValue('memberId', v)}
                      >
                        <SelectTrigger className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
                          {membersData?.members.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-[var(--st-fg)]">
                              {m.firstName} {m.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[var(--st-fg)]">Guest Name</Label>
                        <Input {...registrationForm.register('guestName')} className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[var(--st-fg)]">Email</Label>
                        <Input type="email" {...registrationForm.register('guestEmail')} className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[var(--st-fg)]">Phone</Label>
                        <Input {...registrationForm.register('guestPhone')} className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[var(--st-fg)]">Party Size</Label>
                    <Input type="number" min={1} {...registrationForm.register('partySize')} className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">Save</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowRegistrationForm(false)}
                      className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {occurrence.registrations && occurrence.registrations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[var(--st-border)]">
                      <TableHead className="text-[var(--st-muted)]">Name</TableHead>
                      <TableHead className="text-[var(--st-muted)]">Party</TableHead>
                      <TableHead className="text-[var(--st-muted)]">Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {occurrence.registrations.map((reg) => (
                      <TableRow key={reg.id} className="border-[var(--st-border)]">
                        <TableCell className="text-[var(--st-fg)]">
                          {reg.member
                            ? `${reg.member.firstName} ${reg.member.lastName}`
                            : reg.guestName || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-[var(--st-fg)]">{reg.partySize}</TableCell>
                        <TableCell>
                          <Badge variant={reg.status === 'registered' ? 'default' : 'secondary'}>
                            {reg.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {reg.status === 'registered' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelRegistration(reg.id)}
                              className="text-[var(--st-muted)] hover:text-[var(--st-fg)]"
                            >
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-[var(--st-muted)] text-center py-4">No registrations yet</p>
              )}
            </CardContent>
          </Card>

          {/* Check-ins */}
          <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[var(--st-fg)]">Check-ins</CardTitle>
              <Button size="sm" onClick={() => setShowCheckInForm(true)} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
                Add Check-in
              </Button>
            </CardHeader>
            <CardContent>
              {showCheckInForm && (
                <form
                  onSubmit={checkInForm.handleSubmit(handleCheckIn)}
                  className="mb-4 p-4 border border-[var(--st-border)] rounded space-y-4 bg-[var(--st-surface-muted)]"
                >
                  <div className="space-y-2">
                    <Label className="text-[var(--st-fg)]">Type</Label>
                    <Select
                      value={checkInType}
                      onValueChange={(v) =>
                        checkInForm.setValue('type', v as 'member' | 'guest')
                      }
                    >
                      <SelectTrigger className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
                        <SelectItem value="member" className="text-[var(--st-fg)]">Member</SelectItem>
                        <SelectItem value="guest" className="text-[var(--st-fg)]">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {checkInType === 'member' ? (
                    <div className="space-y-2">
                      <Label className="text-[var(--st-fg)]">Member</Label>
                      <Select
                        value={checkInForm.watch('memberId')}
                        onValueChange={(v) => checkInForm.setValue('memberId', v)}
                      >
                        <SelectTrigger className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
                          {membersData?.members.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-[var(--st-fg)]">
                              {m.firstName} {m.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-[var(--st-fg)]">Guest Name</Label>
                      <Input {...checkInForm.register('guestName')} className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">Check In</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCheckInForm(false)}
                      className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {occurrence.checkIns && occurrence.checkIns.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[var(--st-border)]">
                      <TableHead className="text-[var(--st-muted)]">Name</TableHead>
                      <TableHead className="text-[var(--st-muted)]">Time</TableHead>
                      <TableHead className="text-[var(--st-muted)]">Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {occurrence.checkIns.map((ci) => (
                      <TableRow key={ci.id} className="border-[var(--st-border)]">
                        <TableCell className="text-[var(--st-fg)]">
                          {ci.member
                            ? `${ci.member.firstName} ${ci.member.lastName}`
                            : ci.guestName || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-[var(--st-fg)]">
                          {new Date(ci.checkedInAt).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="text-[var(--st-fg)]">{ci.method}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-[var(--st-muted)] text-center py-4">No check-ins yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Worship Plan */}
        <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[var(--st-fg)]">Worship Plan</CardTitle>
            {worshipPlan && (
              <Button size="sm" onClick={() => setShowWorshipItemForm(true)} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
                Add Item
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!worshipPlan ? (
              <div className="text-center py-8">
                <p className="text-[var(--st-muted)] mb-4">No worship plan created yet</p>
                <Button onClick={handleCreateWorshipPlan} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">Create Worship Plan</Button>
              </div>
            ) : (
              <>
                {showWorshipItemForm && (
                  <form
                    onSubmit={worshipItemForm.handleSubmit(handleAddWorshipItem)}
                    className="mb-4 p-4 border border-[var(--st-border)] rounded space-y-4 bg-[var(--st-surface-muted)]"
                  >
                    <div className="space-y-2">
                      <Label className="text-[var(--st-fg)]">Type</Label>
                      <Select
                        value={worshipItemType}
                        onValueChange={(v) =>
                          worshipItemForm.setValue('itemType', v as WorshipItemFormData['itemType'])
                        }
                      >
                        <SelectTrigger className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
                          <SelectItem value="song" className="text-[var(--st-fg)]">Song</SelectItem>
                          <SelectItem value="scripture" className="text-[var(--st-fg)]">Scripture</SelectItem>
                          <SelectItem value="announcement" className="text-[var(--st-fg)]">Announcement</SelectItem>
                          <SelectItem value="sermon" className="text-[var(--st-fg)]">Sermon</SelectItem>
                          <SelectItem value="prayer" className="text-[var(--st-fg)]">Prayer</SelectItem>
                          <SelectItem value="other" className="text-[var(--st-fg)]">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[var(--st-fg)]">Title</Label>
                      <Input {...worshipItemForm.register('title')} className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
                    </div>

                    {worshipItemType === 'song' && (
                      <div className="space-y-2">
                        <Label className="text-[var(--st-fg)]">Song (optional)</Label>
                        <Select
                          value={worshipItemForm.watch('songId')}
                          onValueChange={(v) => worshipItemForm.setValue('songId', v)}
                        >
                          <SelectTrigger className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                            <SelectValue placeholder="Select song" />
                          </SelectTrigger>
                          <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
                            {songsData?.songs.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-[var(--st-fg)]">
                                {s.title} {s.artist && `- ${s.artist}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-[var(--st-fg)]">Duration (minutes)</Label>
                      <Input type="number" min={1} {...worshipItemForm.register('durationMinutes')} className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">Add Item</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowWorshipItemForm(false)}
                        className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {worshipPlan.items && worshipPlan.items.length > 0 ? (
                  <div className="space-y-2">
                    {worshipPlan.items
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item, idx) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-3 border border-[var(--st-border)] rounded bg-[var(--st-surface-muted)]"
                        >
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-[var(--st-muted)] hover:text-[var(--st-fg)]"
                              onClick={() => handleMoveItem(item, 'up')}
                              disabled={idx === 0}
                            >
                              ▲
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-[var(--st-muted)] hover:text-[var(--st-fg)]"
                              onClick={() => handleMoveItem(item, 'down')}
                              disabled={idx === worshipPlan.items.length - 1}
                            >
                              ▼
                            </Button>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-[var(--st-border)]">{item.itemType}</Badge>
                              <span className="font-medium text-[var(--st-fg)]">{item.title}</span>
                            </div>
                            {item.song && (
                              <p className="text-sm text-[var(--st-muted)]">
                                {item.song.title}
                                {item.song.defaultKey && ` (${item.song.defaultKey})`}
                              </p>
                            )}
                            {item.durationMinutes && (
                              <p className="text-sm text-[var(--st-muted)]">{item.durationMinutes} min</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWorshipItem(item.id)}
                            className="text-[var(--st-muted)] hover:text-[var(--st-color-danger)]"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-[var(--st-muted)] text-center py-4">No items in worship plan</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

