import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMember, useCreateMember, useUpdateMember } from '@/hooks/useMembers'
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
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'

const memberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  dateOfBirth: z.string().optional(),
  status: z.enum(['active', 'inactive', 'visitor']),
  notes: z.string().optional(),
})

type MemberFormData = z.infer<typeof memberSchema>

function MemberFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = !!id

  const { data: member, isLoading } = useMember(id || '')
  const createMutation = useCreateMember()
  const updateMutation = useUpdateMember()

  const canEditNotes = user?.permissions.includes('members.notes') ?? false

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      dateOfBirth: '',
      status: 'active',
      notes: '',
    },
  })

  useEffect(() => {
    if (member) {
      reset({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email || '',
        phone: member.phone || '',
        street: member.street || '',
        city: member.city || '',
        state: member.state || '',
        zip: member.zip || '',
        dateOfBirth: member.dateOfBirth ? member.dateOfBirth.split('T')[0] : '',
        status: member.status,
        notes: member.notes || '',
      })
    }
  }, [member, reset])

  const onSubmit = async (data: MemberFormData) => {
    const payload = {
      ...data,
      email: data.email || null,
      phone: data.phone || null,
      street: data.street || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      dateOfBirth: data.dateOfBirth || null,
      notes: canEditNotes ? (data.notes || null) : undefined,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      navigate('/members')
    } catch {
      // Error handled by mutation
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--st-muted)]">Loading member...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">
          {isEdit ? 'Edit Member' : 'Add New Member'}
        </h1>
        <p className="mt-1 text-[var(--st-muted)]">
          {isEdit ? 'Update member information' : 'Enter the details for the new member'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
          <CardHeader>
            <CardTitle className="text-[var(--st-fg)]">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error Alert */}
            {(createMutation.isError || updateMutation.isError) && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                <p className="text-sm text-red-500">
                  {createMutation.error?.data?.error || updateMutation.error?.data?.error || 'An error occurred'}
                </p>
              </div>
            )}

            {/* Name Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName" className="text-[var(--st-fg)]">First Name *</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName" className="text-[var(--st-fg)]">Last Name *</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Contact Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email" className="text-[var(--st-fg)]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone" className="text-[var(--st-fg)]">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="street" className="text-[var(--st-fg)]">Street Address</Label>
              <Input
                id="street"
                {...register('street')}
                className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="city" className="text-[var(--st-fg)]">City</Label>
                <Input
                  id="city"
                  {...register('city')}
                  className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
                />
              </div>
              <div>
                <Label htmlFor="state" className="text-[var(--st-fg)]">State</Label>
                <Input
                  id="state"
                  {...register('state')}
                  className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
                />
              </div>
              <div>
                <Label htmlFor="zip" className="text-[var(--st-fg)]">ZIP Code</Label>
                <Input
                  id="zip"
                  {...register('zip')}
                  className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
                />
              </div>
            </div>

            {/* Date of Birth & Status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="dateOfBirth" className="text-[var(--st-fg)]">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                  className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
                />
              </div>
              <div>
                <Label htmlFor="status" className="text-[var(--st-fg)]">Status</Label>
                <Select value={watch('status')} onValueChange={(v) => setValue('status', v as 'active' | 'inactive' | 'visitor')}>
                  <SelectTrigger className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="visitor">Visitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            {canEditNotes && (
              <div>
                <Label htmlFor="notes" className="text-[var(--st-fg)]">Notes (Private)</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  rows={4}
                  className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
                  placeholder="Internal notes about this member..."
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                className="bg-[var(--st-primary)] text-[var(--st-primaryFg)] hover:bg-[var(--st-primary-hover)]"
              >
                {isSubmitting || createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : isEdit
                  ? 'Update Member'
                  : 'Create Member'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/members')}
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

export default MemberFormPage
