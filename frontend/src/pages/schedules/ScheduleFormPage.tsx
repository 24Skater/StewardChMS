import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMinistryCalendar, useCreateCalendar, useUpdateCalendar } from '@/hooks/useSchedules'
import { useMinistries } from '@/hooks/useMinistries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const calendarSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  ministryId: z.string().min(1, 'Ministry is required'),
  reminderDaysBeforeSlot: z.coerce.number().int().min(0).max(30).default(3),
  serviceDayOfWeek: z.coerce.number().int().min(0).max(6).default(0),
})

type CalendarFormData = z.infer<typeof calendarSchema>

const DAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

function ScheduleFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: calendar, isLoading: calendarLoading } = useMinistryCalendar(id || '')
  const { data: ministries, isLoading: ministriesLoading } = useMinistries()
  const createMutation = useCreateCalendar()
  const updateMutation = useUpdateCalendar()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CalendarFormData>({
    resolver: zodResolver(calendarSchema),
    defaultValues: {
      name: '',
      description: '',
      ministryId: '',
      reminderDaysBeforeSlot: 3,
      serviceDayOfWeek: 0,
    },
  })

  useEffect(() => {
    if (calendar) {
      reset({
        name: calendar.name,
        description: calendar.description || '',
        ministryId: calendar.ministryId,
        reminderDaysBeforeSlot: calendar.reminderDaysBeforeSlot,
        serviceDayOfWeek: calendar.serviceDayOfWeek,
      })
    }
  }, [calendar, reset])

  const onSubmit = async (data: CalendarFormData) => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({
          id,
          data: {
            name: data.name,
            description: data.description || undefined,
            reminderDaysBeforeSlot: data.reminderDaysBeforeSlot,
            serviceDayOfWeek: data.serviceDayOfWeek,
          },
        })
        navigate(`/schedules/${id}`)
      } else {
        const created = await createMutation.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          ministryId: data.ministryId,
          reminderDaysBeforeSlot: data.reminderDaysBeforeSlot,
          serviceDayOfWeek: data.serviceDayOfWeek,
        })
        navigate(`/schedules/${created.id}`)
      }
    } catch {
      // Error shown via mutation.isError
    }
  }

  if (isEdit && calendarLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--st-muted)]">Loading calendar...</div>
      </div>
    )
  }

  const isSaving = isSubmitting || createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.error || updateMutation.error

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">
          {isEdit ? 'Edit Calendar' : 'New Ministry Calendar'}
        </h1>
        <p className="mt-1 text-[var(--st-muted)]">
          {isEdit ? 'Update calendar settings' : 'Set up a new rotation calendar for a ministry'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
          <CardHeader>
            <CardTitle className="text-[var(--st-fg)]">Calendar Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error Alert */}
            {mutationError && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                <p className="text-sm text-red-500">
                  {mutationError.message || 'An error occurred. Please try again.'}
                </p>
              </div>
            )}

            {/* Name */}
            <div>
              <Label htmlFor="name" className="text-[var(--st-fg)]">Calendar Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g. Sunday Greeters"
                className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-[var(--st-fg)]">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                rows={3}
                placeholder="Optional description..."
                className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
              />
            </div>

            {/* Ministry — only editable on create */}
            <div>
              <Label htmlFor="ministryId" className="text-[var(--st-fg)]">Ministry *</Label>
              {isEdit ? (
                <p className="mt-1 text-[var(--st-muted)]">{calendar?.ministry?.name || '—'}</p>
              ) : (
                <Select
                  value={watch('ministryId')}
                  onValueChange={(v) => setValue('ministryId', v)}
                  disabled={ministriesLoading}
                >
                  <SelectTrigger className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                    <SelectValue placeholder={ministriesLoading ? 'Loading...' : 'Select a ministry'} />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                    {ministries?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.ministryId && (
                <p className="mt-1 text-sm text-red-500">{errors.ministryId.message}</p>
              )}
            </div>

            {/* Service Day and Reminder Days */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="serviceDayOfWeek" className="text-[var(--st-fg)]">Service Day of Week</Label>
                <Select
                  value={String(watch('serviceDayOfWeek'))}
                  onValueChange={(v) => setValue('serviceDayOfWeek', parseInt(v, 10))}
                >
                  <SelectTrigger className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                    {DAY_OPTIONS.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reminderDaysBeforeSlot" className="text-[var(--st-fg)]">Reminder Days Before Slot</Label>
                <Input
                  id="reminderDaysBeforeSlot"
                  type="number"
                  min={0}
                  max={30}
                  {...register('reminderDaysBeforeSlot')}
                  className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
                />
                {errors.reminderDaysBeforeSlot && (
                  <p className="mt-1 text-sm text-red-500">{errors.reminderDaysBeforeSlot.message}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[var(--st-primary)] text-[var(--st-primaryFg)] hover:bg-[var(--st-primary-hover)]"
              >
                {isSaving ? 'Saving...' : isEdit ? 'Update Calendar' : 'Create Calendar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isEdit && id ? `/schedules/${id}` : '/schedules')}
                className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

export default ScheduleFormPage
