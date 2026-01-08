import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useCreatePledge,
  useUpdatePledge,
  usePledge,
  useFunds,
} from '../../hooks/useAccounting'
import { useMembers } from '../../hooks/useMembers'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'

const pledgeSchema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  amount: z.number().positive('Amount must be positive'),
  fundId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['active', 'completed', 'canceled']),
})

type PledgeFormData = z.infer<typeof pledgeSchema>

export default function PledgeFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const { data: existingPledge, isLoading: loadingPledge } = usePledge(id || '')
  const { data: fundsData } = useFunds()
  const { data: membersData } = useMembers({ limit: 100 })

  const createMutation = useCreatePledge()
  const updateMutation = useUpdatePledge()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PledgeFormData>({
    resolver: zodResolver(pledgeSchema),
    defaultValues: {
      status: 'active',
    },
  })

  useEffect(() => {
    if (existingPledge && isEditing) {
      reset({
        memberId: existingPledge.memberId,
        amount: existingPledge.amountCents / 100,
        fundId: existingPledge.fundId || undefined,
        startDate: existingPledge.startDate?.split('T')[0] || undefined,
        endDate: existingPledge.endDate?.split('T')[0] || undefined,
        status: existingPledge.status,
      })
    }
  }, [existingPledge, isEditing, reset])

  const onSubmit = async (data: PledgeFormData) => {
    try {
      const payload = {
        memberId: data.memberId,
        amountCents: Math.round(data.amount * 100),
        fundId: data.fundId || null,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        status: data.status,
      }

      if (isEditing) {
        await updateMutation.mutateAsync({ id: id!, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      navigate('/pledges')
    } catch (error) {
      console.error('Failed to save pledge:', error)
      alert('Failed to save pledge')
    }
  }

  if (isEditing && loadingPledge) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Edit Pledge' : 'Add Pledge'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label>Member *</Label>
          <Select
            value={watch('memberId') || ''}
            onValueChange={(value) => setValue('memberId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a member" />
            </SelectTrigger>
            <SelectContent>
              {membersData?.members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.memberId && (
            <p className="text-red-500 text-sm mt-1">{errors.memberId.message}</p>
          )}
        </div>

        <div>
          <Label>Pledge Amount *</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount && (
            <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <Label>Fund</Label>
          <Select
            value={watch('fundId') || 'none'}
            onValueChange={(value) => setValue('fundId', value === 'none' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a fund" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Undesignated --</SelectItem>
              {fundsData?.funds.map((fund) => (
                <SelectItem key={fund.id} value={fund.id}>
                  {fund.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Start Date</Label>
            <Input type="date" {...register('startDate')} />
          </div>
          <div>
            <Label>End Date</Label>
            <Input type="date" {...register('endDate')} />
          </div>
        </div>

        <div>
          <Label>Status *</Label>
          <Select
            value={watch('status')}
            onValueChange={(value: 'active' | 'completed' | 'canceled') =>
              setValue('status', value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Pledge' : 'Add Pledge'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/pledges')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

