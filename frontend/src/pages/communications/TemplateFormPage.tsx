import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useMessageTemplate,
  useCreateMessageTemplate,
  useUpdateMessageTemplate,
} from '../../hooks/useCommunications'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  channel: z.enum(['email', 'sms']),
  subject: z.string().max(200).optional(),
  body: z.string().min(1, 'Template body is required'),
})

type TemplateFormData = z.infer<typeof templateSchema>

export default function TemplateFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = !!id

  const { data: template, isLoading } = useMessageTemplate(id || '')
  const createMutation = useCreateMessageTemplate()
  const updateMutation = useUpdateMessageTemplate()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      channel: 'email',
      subject: '',
      body: '',
    },
  })

  const channel = watch('channel')

  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        channel: template.channel,
        subject: template.subject || '',
        body: template.body,
      })
    }
  }, [template, reset])

  const onSubmit = async (data: TemplateFormData) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      navigate('/communications/templates')
    } catch (error) {
      console.error('Failed to save template:', error)
    }
  }

  if (isEditing && isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse text-[var(--st-muted)]">Loading template...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-[var(--st-fg)]">
        {isEditing ? 'Edit Template' : 'Create Template'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[var(--st-fg)]">Template Name</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="e.g., Welcome Email, Event Reminder"
            className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
          />
          {errors.name && (
            <p className="text-sm text-[var(--st-color-danger)]">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="channel" className="text-[var(--st-fg)]">Channel</Label>
          <Select
            value={channel}
            onValueChange={(value) => setValue('channel', value as 'email' | 'sms')}
          >
            <SelectTrigger className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
              <SelectItem value="email" className="text-[var(--st-fg)]">Email</SelectItem>
              <SelectItem value="sms" className="text-[var(--st-fg)]">SMS</SelectItem>
            </SelectContent>
          </Select>
          {errors.channel && (
            <p className="text-sm text-[var(--st-color-danger)]">{errors.channel.message}</p>
          )}
        </div>

        {channel === 'email' && (
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-[var(--st-fg)]">Subject Line</Label>
            <Input
              id="subject"
              {...register('subject')}
              placeholder="e.g., Welcome to Our Church!"
              className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
            />
            {errors.subject && (
              <p className="text-sm text-[var(--st-color-danger)]">{errors.subject.message}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="body" className="text-[var(--st-fg)]">Message Body</Label>
          <Textarea
            id="body"
            {...register('body')}
            placeholder="Write your message here..."
            rows={8}
            className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
          />
          {errors.body && (
            <p className="text-sm text-[var(--st-color-danger)]">{errors.body.message}</p>
          )}
          <p className="text-sm text-[var(--st-muted)]">
            Available variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{email}}'}
          </p>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/communications/templates')}
            className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

