import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useCreateExpense,
  useUpdateExpense,
  useExpense,
  useFunds,
  useVendors,
} from '../../hooks/useAccounting'
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

const expenseSchema = z.object({
  vendorId: z.string().optional(),
  fundId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  expenseDate: z.string().min(1, 'Date is required'),
  category: z.string().optional(),
  note: z.string().optional(),
})

type ExpenseFormData = z.infer<typeof expenseSchema>

export default function ExpenseFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const { data: existingExpense, isLoading: loadingExpense } = useExpense(id || '')
  const { data: fundsData } = useFunds()
  const { data: vendorsData } = useVendors()

  const createMutation = useCreateExpense()
  const updateMutation = useUpdateExpense()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseDate: new Date().toISOString().split('T')[0],
    },
  })

  useEffect(() => {
    if (existingExpense && isEditing) {
      reset({
        vendorId: existingExpense.vendorId || undefined,
        fundId: existingExpense.fundId || undefined,
        amount: existingExpense.amountCents / 100,
        expenseDate: existingExpense.expenseDate.split('T')[0],
        category: existingExpense.category || undefined,
        note: existingExpense.note || undefined,
      })
    }
  }, [existingExpense, isEditing, reset])

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      const payload = {
        vendorId: data.vendorId || null,
        fundId: data.fundId || null,
        amountCents: Math.round(data.amount * 100),
        expenseDate: new Date(data.expenseDate).toISOString(),
        category: data.category || null,
        note: data.note || null,
      }

      if (isEditing) {
        await updateMutation.mutateAsync({ id: id!, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      navigate('/expenses')
    } catch (error) {
      console.error('Failed to save expense:', error)
      alert('Failed to save expense')
    }
  }

  if (isEditing && loadingExpense) {
    return <div className="p-6 text-[var(--st-muted)]">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--st-fg)]">
        {isEditing ? 'Edit Expense' : 'Add Expense'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-6">
        <div>
          <Label className="text-[var(--st-fg)]">Vendor</Label>
          <Select
            value={watch('vendorId') || 'none'}
            onValueChange={(value) => setValue('vendorId', value === 'none' ? undefined : value)}
          >
            <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
              <SelectValue placeholder="Select a vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- No Vendor --</SelectItem>
              {vendorsData?.vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
          <Label className="text-[var(--st-fg)]">Date *</Label>
          <Input type="date" {...register('expenseDate')} className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
          {errors.expenseDate && (
            <p className="text-[var(--st-color-danger)] text-sm mt-1">{errors.expenseDate.message}</p>
          )}
        </div>

        <div>
          <Label className="text-[var(--st-fg)]">Category</Label>
          <Input {...register('category')} placeholder="e.g., Utilities, Supplies, etc." className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
        </div>

        <div>
          <Label className="text-[var(--st-fg)]">Note</Label>
          <Textarea {...register('note')} placeholder="Optional note" className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]" />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Expense' : 'Add Expense'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/expenses')} className="border-[var(--st-border)] text-[var(--st-fg)]">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

