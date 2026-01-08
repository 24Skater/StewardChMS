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
import { MessageTarget, MemberStatus } from '../../lib/api'

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
    try {
      let target: MessageTarget

      if (data.targetType === 'all') {
        target = { type: 'all' }
      } else if (data.targetType === 'status' && data.targetStatus) {
        target = { type: 'status', status: data.targetStatus as MemberStatus }
      } else if (data.targetType === 'memberIds' && selectedMembers.length > 0) {
        target = { type: 'memberIds', memberIds: selectedMembers }
      } else {
        alert('Please select at least one recipient')
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
    }
  }

  // Filter templates by channel
  const channelTemplates = templatesData?.templates.filter(t => t.channel === channel) || []

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Compose Message</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Channel Selection */}
        <div className="space-y-2">
          <Label>Channel</Label>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={channel === 'email' ? 'default' : 'outline'}
              onClick={() => setValue('channel', 'email')}
            >
              📧 Email
            </Button>
            <Button
              type="button"
              variant={channel === 'sms' ? 'default' : 'outline'}
              onClick={() => setValue('channel', 'sms')}
            >
              📱 SMS
            </Button>
          </div>
        </div>

        {/* Template Selection */}
        {channelTemplates.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="template">Use Template (Optional)</Label>
            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {channelTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
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
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              {...register('subject')}
              placeholder="Enter email subject..."
            />
            {errors.subject && (
              <p className="text-sm text-red-500">{errors.subject.message}</p>
            )}
          </div>
        )}

        {/* Message Body */}
        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            {...register('body')}
            placeholder="Write your message here..."
            rows={8}
          />
          {errors.body && (
            <p className="text-sm text-red-500">{errors.body.message}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Available variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{email}}'}
          </p>
        </div>

        {/* Recipients */}
        <div className="space-y-4">
          <Label>Recipients</Label>
          
          <div className="space-y-2">
            <Select
              value={targetType}
              onValueChange={(value) => setValue('targetType', value as 'all' | 'status' | 'memberIds')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recipient type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Active Members</SelectItem>
                <SelectItem value="status">Members by Status</SelectItem>
                <SelectItem value="memberIds">Select Specific Members</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === 'status' && (
            <Select
              value={watch('targetStatus')}
              onValueChange={(value) => setValue('targetStatus', value as 'active' | 'inactive' | 'visitor')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Members</SelectItem>
                <SelectItem value="inactive">Inactive Members</SelectItem>
                <SelectItem value="visitor">Visitors</SelectItem>
              </SelectContent>
            </Select>
          )}

          {targetType === 'memberIds' && (
            <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto space-y-2">
              {membersData?.members.length === 0 ? (
                <p className="text-muted-foreground">No members found</p>
              ) : (
                membersData?.members.map(member => {
                  const hasContact = channel === 'email' ? !!member.email : !!member.phone
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center gap-2 p-2 rounded ${
                        !hasContact ? 'opacity-50' : 'hover:bg-muted'
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
                        className="flex-1 cursor-pointer"
                      >
                        {member.firstName} {member.lastName}
                        {!hasContact && (
                          <span className="text-sm text-muted-foreground ml-2">
                            (no {channel})
                          </span>
                        )}
                      </label>
                      <span className="text-sm text-muted-foreground">
                        {channel === 'email' ? member.email : member.phone}
                      </span>
                    </div>
                  )
                })
              )}
              {selectedMembers.length > 0 && (
                <p className="text-sm font-medium pt-2 border-t">
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
          >
            {sendMutation.isPending ? 'Sending...' : 'Send Message'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/communications')}
          >
            Cancel
          </Button>
        </div>

        {sendMutation.isError && (
          <div className="text-red-500">
            Failed to send message. Please try again.
          </div>
        )}
      </form>
    </div>
  )
}

