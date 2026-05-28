import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMembers } from '../../hooks/useMembers'
import { useMessageTemplates, useSendMessage } from '../../hooks/useCommunications'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { Checkbox } from '../../components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { MessageTarget, MemberStatus, ApiClientError } from '../../lib/api'

const composeSchema = z.object({
  channel: z.enum(['email', 'sms']),
  subject: z.string().max(200).optional(),
  body: z.string().min(1, 'Message body is required'),
  targetType: z.enum(['all', 'status', 'memberIds']),
  targetStatus: z.enum(['active', 'inactive', 'visitor']).optional(),
})

type ComposeFormData = z.infer<typeof composeSchema>

export default function ComposeMessagePage() {
  const navigate = useNavigate()
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const { data: membersData } = useMembers({ limit: 100 })
  const { data: templatesData } = useMessageTemplates({ limit: 100 })
  const sendMutation = useSendMessage()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ComposeFormData>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      channel: 'email',
      subject: '',
      body: '',
      targetType: 'all',
      targetStatus: 'active',
    },
  })

  const channel = watch('channel')
  const targetType = watch('targetType')

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId) return
    const template = templatesData?.templates.find(t => t.id === templateId)
    if (template) {
      setValue('channel', template.channel)
      setValue('subject', template.subject || '')
      setValue('body', template.body)
    }
  }

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const onSubmit = async (data: ComposeFormData) => {
    setErrorMessage(null)
    try {
      let target: MessageTarget

      if (data.targetType === 'all') {
        target = { type: 'all' }
      } else if (data.targetType === 'status' && data.targetStatus) {
        target = { type: 'status', status: data.targetStatus as MemberStatus }
      } else if (data.targetType === 'memberIds' && selectedMembers.length > 0) {
        target = { type: 'memberIds', memberIds: selectedMembers }
      } else {
        setErrorMessage('Please select at least one recipient')
        return
      }

      await sendMutation.mutateAsync({
        channel: data.channel,
        subject: data.channel === 'email' ? data.subject : undefined,
        body: data.body,
        target,
      })

      navigate('/communications')
    } catch (error) {
      console.error('Failed to send message:', error)
      if (error instanceof ApiClientError) {
        setErrorMessage(error.data.message || error.data.error || 'Failed to send message')
      } else {
        setErrorMessage('Failed to send message. Please try again.')
      }
    }
  }

  // Filter templates by channel
  const channelTemplates = templatesData?.templates.filter(t => t.channel === channel) || []

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-[var(--st-fg)]">Compose Message</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Channel Selection */}
        <div className="space-y-2">
          <Label className="text-[var(--st-fg)]">Channel</Label>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={channel === 'email' ? 'default' : 'outline'}
              onClick={() => setValue('channel', 'email')}
              className={channel === 'email' ? 'bg-[var(--st-primary)] text-[var(--st-fg-on-primary)]' : 'border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]'}
            >
              Email
            </Button>
            <Button
              type="button"
              variant={channel === 'sms' ? 'default' : 'outline'}
              onClick={() => setValue('channel', 'sms')}
              className={channel === 'sms' ? 'bg-[var(--st-primary)] text-[var(--st-fg-on-primary)]' : 'border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]'}
            >
              SMS
            </Button>
          </div>
        </div>

        {/* Template Selection */}
        {channelTemplates.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="template" className="text-[var(--st-fg)]">Use Template (Optional)</Label>
            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
                {channelTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id} className="text-[var(--st-fg)]">
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Subject (Email only) */}
        {channel === 'email' && (
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-[var(--st-fg)]">Subject</Label>
            <Input
              id="subject"
              {...register('subject')}
              placeholder="Enter email subject..."
              className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
            />
            {errors.subject && (
              <p className="text-sm text-[var(--st-color-danger)]">{errors.subject.message}</p>
            )}
          </div>
        )}

        {/* Message Body */}
        <div className="space-y-2">
          <Label htmlFor="body" className="text-[var(--st-fg)]">Message</Label>
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

        {/* Recipients */}
        <div className="space-y-4">
          <Label className="text-[var(--st-fg)]">Recipients</Label>
          
          <div className="space-y-2">
            <Select
              value={targetType}
              onValueChange={(value) => setValue('targetType', value as 'all' | 'status' | 'memberIds')}
            >
              <SelectTrigger className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                <SelectValue placeholder="Select recipient type" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
                <SelectItem value="all" className="text-[var(--st-fg)]">All Active Members</SelectItem>
                <SelectItem value="status" className="text-[var(--st-fg)]">Members by Status</SelectItem>
                <SelectItem value="memberIds" className="text-[var(--st-fg)]">Select Specific Members</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === 'status' && (
            <Select
              value={watch('targetStatus')}
              onValueChange={(value) => setValue('targetStatus', value as 'active' | 'inactive' | 'visitor')}
            >
              <SelectTrigger className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
                <SelectItem value="active" className="text-[var(--st-fg)]">Active Members</SelectItem>
                <SelectItem value="inactive" className="text-[var(--st-fg)]">Inactive Members</SelectItem>
                <SelectItem value="visitor" className="text-[var(--st-fg)]">Visitors</SelectItem>
              </SelectContent>
            </Select>
          )}

          {targetType === 'memberIds' && (
            <div className="border border-[var(--st-border)] rounded-md p-4 max-h-[300px] overflow-y-auto space-y-2 bg-[var(--st-surface)]">
              {membersData?.members.length === 0 ? (
                <p className="text-[var(--st-muted)]">No members found</p>
              ) : (
                membersData?.members.map(member => {
                  const hasContact = channel === 'email' ? !!member.email : !!member.phone
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center gap-2 p-2 rounded ${
                        !hasContact ? 'opacity-50' : 'hover:bg-[var(--st-surface-hover)]'
                      }`}
                    >
                      <Checkbox
                        id={member.id}
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                        disabled={!hasContact}
                      />
                      <label
                        htmlFor={member.id}
                        className="flex-1 cursor-pointer text-[var(--st-fg)]"
                      >
                        {member.firstName} {member.lastName}
                        {!hasContact && (
                          <span className="text-sm text-[var(--st-muted)] ml-2">
                            (no {channel})
                          </span>
                        )}
                      </label>
                      <span className="text-sm text-[var(--st-muted)]">
                        {channel === 'email' ? member.email : member.phone}
                      </span>
                    </div>
                  )
                })
              )}
              {selectedMembers.length > 0 && (
                <p className="text-sm font-medium pt-2 border-t border-[var(--st-border)] text-[var(--st-fg)]">
                  {selectedMembers.length} member(s) selected
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button 
            type="submit" 
            disabled={isSubmitting || sendMutation.isPending}
            className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]"
          >
            {sendMutation.isPending ? 'Sending...' : 'Send Message'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/communications')}
            className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
          >
            Cancel
          </Button>
        </div>

        {errorMessage && (
          <div className="text-[var(--st-color-danger)] bg-[var(--st-color-danger)]/10 p-3 rounded border border-[var(--st-color-danger)]/30">
            {errorMessage}
          </div>
        )}
      </form>
    </div>
  )
}

