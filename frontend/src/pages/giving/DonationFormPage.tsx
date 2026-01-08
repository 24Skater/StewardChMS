import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useCreateDonation,
  useUpdateDonation,
  useDonation,
  useFunds,
} from '../../hooks/useAccounting'
import { useMembers } from '../../hooks/useMembers'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'

const donationSchema = z.object({
  memberId: z.string().optional(),
  guestName: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['cash', 'check', 'card', 'online', 'other']),
  fundId: z.string().optional(),
  receivedAt: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
})

type DonationFormData = z.infer<typeof donationSchema>

export default function DonationFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const { data: existingDonation, isLoading: loadingDonation } = useDonation(id || '')
  const { data: fundsData } = useFunds()
  const { data: membersData } = useMembers({ limit: 100 })

  const createMutation = useCreateDonation()
  const updateMutation = useUpdateDonation()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      receivedAt: new Date().toISOString().split('T')[0],
      method: 'cash',
    },
  })

  const memberId = watch('memberId')

  useEffect(() => {
    if (existingDonation && isEditing) {
      reset({
        memberId: existingDonation.memberId || undefined,
        guestName: existingDonation.guestName || undefined,
        amount: existingDonation.amountCents / 100,
        method: existingDonation.method,
        fundId: existingDonation.fundId || undefined,
        receivedAt: existingDonation.receivedAt.split('T')[0],
        note: existingDonation.note || undefined,
      })
    }
  }, [existingDonation, isEditing, reset])

  const onSubmit = async (data: DonationFormData) => {
    try {
      const payload = {
        memberId: data.memberId || null,
        guestName: !data.memberId ? data.guestName || null : null,
        amountCents: Math.round(data.amount * 100),
        method: data.method,
        fundId: data.fundId || null,
        receivedAt: new Date(data.receivedAt).toISOString(),
        note: data.note || null,
      }

      if (isEditing) {
        await updateMutation.mutateAsync({ id: id!, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      navigate('/giving')
    } catch (error) {
      console.error('Failed to save donation:', error)
      alert('Failed to save donation')
    }
  }

  if (isEditing && loadingDonation) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Edit Donation' : 'Add Donation'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label>Member (optional)</Label>
          <Select
            value={memberId || 'none'}
            onValueChange={(value) => setValue('memberId', value === 'none' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Guest/Anonymous --</SelectItem>
              {membersData?.members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!memberId && (
          <div>
            <Label>Guest Name</Label>
            <Input {...register('guestName')} placeholder="Anonymous" />
          </div>
        )}

        <div>
          <Label>Amount *</Label>
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
          <Label>Payment Method *</Label>
          <Select
            value={watch('method')}
            onValueChange={(value: 'cash' | 'check' | 'card' | 'online' | 'other') =>
              setValue('method', value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
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

        <div>
          <Label>Date Received *</Label>
          <Input type="date" {...register('receivedAt')} />
          {errors.receivedAt && (
            <p className="text-red-500 text-sm mt-1">{errors.receivedAt.message}</p>
          )}
        </div>

        <div>
          <Label>Note</Label>
          <Textarea {...register('note')} placeholder="Optional note" />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Donation' : 'Add Donation'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/giving')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

