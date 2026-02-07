import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEvent, useCreateEvent, useUpdateEvent } from '../../hooks/useEvents'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { DateTimePicker } from '../../components/ui/date-time-picker'
import { Input } from '../../components/ui/input'
import { useEffect } from 'react'

const eventFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  isRecurring: z.boolean(),
  recurrenceFrequency: z.enum(['weekly', 'monthly', 'none']),
  recurrenceDayOfWeek: z.string().optional(),
  recurrenceWeekOfMonth: z.string().optional(),
  startDatetime: z.string().optional().nullable(),
  endDatetime: z.string().optional().nullable(),
})

type EventFormData = z.infer<typeof eventFormSchema>

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

const WEEKS_OF_MONTH = [
  { value: '1', label: '1st' },
  { value: '2', label: '2nd' },
  { value: '3', label: '3rd' },
  { value: '4', label: '4th' },
  { value: '5', label: '5th' },
]

const CATEGORIES = [
  'Church-wide',
  'Youth',
  'Children',
  'Adults',
  'Outreach',
  'Worship',
  'Small Groups',
  'Other',
]

export default function EventFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const { data: existingEvent, isLoading: isLoadingEvent } = useEvent(id)
  const createMutation = useCreateEvent()
  const updateMutation = useUpdateEvent()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      category: '',
      isRecurring: false,
      recurrenceFrequency: 'none',
      recurrenceDayOfWeek: '0',
      recurrenceWeekOfMonth: '1',
      startDatetime: '',
      endDatetime: '',
    },
  })

  const isRecurring = watch('isRecurring')
  const recurrenceFrequency = watch('recurrenceFrequency')

  // Load existing event data
  useEffect(() => {
    if (existingEvent) {
      let recurrenceFrequency: 'weekly' | 'monthly' | 'none' = 'none'
      let dayOfWeek = '0'
      let weekOfMonth = '1'

      if (existingEvent.recurrenceRule) {
        try {
          const rule = JSON.parse(existingEvent.recurrenceRule)
          recurrenceFrequency = rule.frequency || 'none'
          dayOfWeek = String(rule.dayOfWeek ?? 0)
          weekOfMonth = String(rule.weekOfMonth ?? 1)
        } catch {
          // Invalid rule, use defaults
        }
      }

      reset({
        title: existingEvent.title,
        description: existingEvent.description || '',
        location: existingEvent.location || '',
        category: existingEvent.category || '',
        isRecurring: existingEvent.isRecurring,
        recurrenceFrequency,
        recurrenceDayOfWeek: dayOfWeek,
        recurrenceWeekOfMonth: weekOfMonth,
        startDatetime: existingEvent.startDatetime || '',
        endDatetime: existingEvent.endDatetime || '',
      })
    }
  }, [existingEvent, reset])

  const onSubmit = async (formData: EventFormData) => {
    let recurrenceRule: string | null = null

    if (formData.isRecurring && formData.recurrenceFrequency !== 'none') {
      const rule: Record<string, unknown> = {
        frequency: formData.recurrenceFrequency,
        dayOfWeek: parseInt(formData.recurrenceDayOfWeek || '0'),
      }
      if (formData.recurrenceFrequency === 'monthly') {
        rule.weekOfMonth = parseInt(formData.recurrenceWeekOfMonth || '1')
      }
      recurrenceRule = JSON.stringify(rule)
    }

    const eventData = {
      title: formData.title,
      description: formData.description || null,
      location: formData.location || null,
      category: formData.category || null,
      isRecurring: formData.isRecurring,
      recurrenceRule,
      startDatetime: formData.startDatetime
        ? new Date(formData.startDatetime).toISOString()
        : null,
      endDatetime: formData.endDatetime
        ? new Date(formData.endDatetime).toISOString()
        : null,
    }

    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, data: eventData })
        navigate(`/events/${id}`)
      } else {
        const newEvent = await createMutation.mutateAsync(eventData)
        navigate(`/events/${newEvent.id}`)
      }
    } catch (error) {
      console.error('Failed to save event:', error)
    }
  }

  if (isEditing && isLoadingEvent) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--st-muted)]">Loading event...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
        <CardHeader>
          <CardTitle className="text-[var(--st-fg)]">{isEditing ? 'Edit Event' : 'Create Event'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[var(--st-fg)]">Title *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Event title"
                className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[var(--st-fg)]">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Event description"
                rows={3}
                className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-[var(--st-fg)]">Location</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="e.g., Main Sanctuary"
                className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-[var(--st-fg)]">Category</Label>
              <Select
                value={watch('category') || ''}
                onValueChange={(value) => setValue('category', value)}
              >
                <SelectTrigger className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)]">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date/Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[var(--st-fg)]">Start Date/Time</Label>
                <DateTimePicker
                  value={watch('startDatetime') || ''}
                  onChange={(value) => setValue('startDatetime', value)}
                  placeholder="Pick start date & time"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--st-fg)]">End Date/Time</Label>
                <DateTimePicker
                  value={watch('endDatetime') || ''}
                  onChange={(value) => setValue('endDatetime', value)}
                  placeholder="Pick end date & time"
                />
              </div>
            </div>

            {/* Recurring */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  {...register('isRecurring')}
                  className="h-4 w-4"
                />
                <Label htmlFor="isRecurring" className="text-[var(--st-fg)]">This is a recurring event</Label>
              </div>

              {isRecurring && (
                <div className="pl-6 space-y-4 border-l-2 border-[var(--st-border)]">
                  <div className="space-y-2">
                    <Label className="text-[var(--st-fg)]">Recurrence Pattern</Label>
                    <Select
                      value={recurrenceFrequency}
                      onValueChange={(value) =>
                        setValue('recurrenceFrequency', value as 'weekly' | 'monthly' | 'none')
                      }
                    >
                      <SelectTrigger className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)]">
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[var(--st-fg)]">Day of Week</Label>
                    <Select
                      value={watch('recurrenceDayOfWeek')}
                      onValueChange={(value) => setValue('recurrenceDayOfWeek', value)}
                    >
                      <SelectTrigger className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)]">
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {recurrenceFrequency === 'monthly' && (
                    <div className="space-y-2">
                      <Label className="text-[var(--st-fg)]">Week of Month</Label>
                      <Select
                        value={watch('recurrenceWeekOfMonth')}
                        onValueChange={(value) => setValue('recurrenceWeekOfMonth', value)}
                      >
                        <SelectTrigger className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)]">
                          {WEEKS_OF_MONTH.map((week) => (
                            <SelectItem key={week.value} value={week.value}>
                              {week.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]"
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/events')}
                className="border-[var(--st-border)] text-[var(--st-fg)]"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
