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
    return <div className="p-6 text-[var(--st-muted)]">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--st-fg)]">
        {isEditing ? 'Edit Donation' : 'Add Donation'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-6">
        <div>
          <Label className="text-[var(--st-fg)]">Member (optional)</Label>
          <Select
            value={memberId || 'none'}
            onValueChange={(value) => setValue('memberId', value === 'none' ? undefined : value)}
          >
            <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
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
            <Label className="text-[var(--st-fg)]">Guest Name</Label>
            <Input {...register('guestName')} placeholder="Anonymous" className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
          </div>
        )}

        <div>
          <Label className="text-[var(--st-fg)]">Amount *</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            {...register('amount', { valueAsNumber: true })}
            className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
          />
          {errors.amount && (
            <p className="text-[var(--st-color-danger)] text-sm mt-1">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <Label className="text-[var(--st-fg)]">Payment Method *</Label>
          <Select
            value={watch('method')}
            onValueChange={(value: 'cash' | 'check' | 'card' | 'online' | 'other') =>
              setValue('method', value)
            }
          >
            <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
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
          <Label className="text-[var(--st-fg)]">Fund</Label>
          <Select
            value={watch('fundId') || 'none'}
            onValueChange={(value) => setValue('fundId', value === 'none' ? undefined : value)}
          >
            <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
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
          <Label className="text-[var(--st-fg)]">Date Received *</Label>
          <Input type="date" {...register('receivedAt')} className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
          {errors.receivedAt && (
            <p className="text-[var(--st-color-danger)] text-sm mt-1">{errors.receivedAt.message}</p>
          )}
        </div>

        <div>
          <Label className="text-[var(--st-fg)]">Note</Label>
          <Textarea {...register('note')} placeholder="Optional note" className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Donation' : 'Add Donation'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/giving')} className="border-[var(--st-border)] text-[var(--st-fg)]">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

