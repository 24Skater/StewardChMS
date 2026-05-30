import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCalendar, useCreateCalendar, useUpdateCalendar } from '@/hooks/useSchedules'
import { useMinistries } from '@/hooks/useMinistries'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  ministryId: z.string().min(1, 'Ministry is required'),
  serviceDayOfWeek: z.coerce.number().int().min(0).max(6),
  reminderDaysBeforeSlot: z.coerce.number().int().min(0).max(30),
})

type FormData = z.infer<typeof schema>

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function ScheduleFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: calendar, isLoading: calendarLoading } = useCalendar(id ?? '')
  const { data: ministries } = useMinistries()
  const createCalendar = useCreateCalendar()
  const updateCalendar = useUpdateCalendar()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      ministryId: '',
      serviceDayOfWeek: 0,
      reminderDaysBeforeSlot: 2,
    },
  })

  useEffect(() => {
    if (calendar) {
      form.reset({
        name: calendar.name,
        description: calendar.description ?? '',
        ministryId: calendar.ministryId,
        serviceDayOfWeek: calendar.serviceDayOfWeek,
        reminderDaysBeforeSlot: calendar.reminderDaysBeforeSlot,
      })
    }
  }, [calendar, form])

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit && id) {
        await updateCalendar.mutateAsync({ id, ...data })
        navigate(`/schedules/${id}`)
      } else {
        const created = await createCalendar.mutateAsync(data)
        navigate(`/schedules/${created.id}`)
      }
    } catch {
      // error handled by mutation
    }
  }

  if (isEdit && calendarLoading) {
    return <p className="text-[var(--st-muted)]">Loading...</p>
  }

  const isPending = createCalendar.isPending || updateCalendar.isPending

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">
          {isEdit ? 'Edit Calendar' : 'New Ministry Calendar'}
        </h1>
        <p className="text-sm text-[var(--st-muted)]">
          {isEdit ? 'Update calendar settings' : 'Create a new duty roster calendar'}
        </p>
      </div>

      <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
        <CardHeader>
          <CardTitle className="text-[var(--st-fg)] text-base">Calendar Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label className="text-[var(--st-mutedFg)]">Name *</Label>
              <Input
                {...form.register('name')}
                className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                placeholder="e.g. Ushers Schedule"
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-sm text-[var(--st-danger)]">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label className="text-[var(--st-mutedFg)]">Description</Label>
              <Textarea
                {...form.register('description')}
                className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                rows={2}
                placeholder="Optional description"
              />
            </div>

            <div>
              <Label className="text-[var(--st-mutedFg)]">Ministry *</Label>
              <Select
                value={form.watch('ministryId')}
                onValueChange={v => form.setValue('ministryId', v)}
              >
                <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                  <SelectValue placeholder="Select ministry" />
                </SelectTrigger>
                <SelectContent>
                  {ministries?.filter(m => m.isActive).map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.ministryId && (
                <p className="mt-1 text-sm text-[var(--st-danger)]">{form.formState.errors.ministryId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[var(--st-mutedFg)]">Service Day</Label>
                <Select
                  value={String(form.watch('serviceDayOfWeek'))}
                  onValueChange={v => form.setValue('serviceDayOfWeek', Number(v))}
                >
                  <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[var(--st-mutedFg)]">Reminder (days before)</Label>
                <Input
                  type="number"
                  {...form.register('reminderDaysBeforeSlot')}
                  className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                  min={0}
                  max={30}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isEdit ? `/schedules/${id}` : '/schedules')}
                className="border-[var(--st-border)] text-[var(--st-mutedFg)]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[var(--st-primary)] hover:opacity-90 text-white"
              >
                {isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ScheduleFormPage
