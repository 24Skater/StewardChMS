import { useState } from 'react'
import { useFunds, useCreateFund, useUpdateFund, useDeleteFund } from '../../hooks/useAccounting'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Checkbox } from '../../components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { Fund } from '../../lib/api'

export default function FundsPage() {
  const { data, isLoading, error } = useFunds()
  const createMutation = useCreateFund()
  const updateMutation = useUpdateFund()
  const deleteMutation = useDeleteFund()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFund, setEditingFund] = useState<Fund | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isRestricted: false,
  })

  const handleOpenCreate = () => {
    setEditingFund(null)
    setFormData({ name: '', description: '', isRestricted: false })
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (fund: Fund) => {
    setEditingFund(fund)
    setFormData({
      name: fund.name,
      description: fund.description || '',
      isRestricted: fund.isRestricted,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        isRestricted: formData.isRestricted,
      }

      if (editingFund) {
        await updateMutation.mutateAsync({ id: editingFund.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to save fund:', error)
      alert('Failed to save fund')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this fund?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete fund:', error)
        alert('Cannot delete fund with existing transactions')
      }
    }
  }

  if (error) {
    return <div className="p-4 text-[var(--st-color-danger)]">Error loading funds</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Funds</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">Add Fund</Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--st-fg)]">{editingFund ? 'Edit Fund' : 'Add Fund'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-[var(--st-fg)]">Fund Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                />
              </div>
              <div>
                <Label className="text-[var(--st-fg)]">Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isRestricted"
                  checked={formData.isRestricted}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isRestricted: !!checked })
                  }
                />
                <Label htmlFor="isRestricted" className="text-[var(--st-fg)]">Restricted Fund</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-[var(--st-border)] text-[var(--st-fg)]">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
                  {editingFund ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-[var(--st-muted)]">Loading...</div>
      ) : (
        <div className="border border-[var(--st-border)] rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--st-border)]">
                <TableHead className="text-[var(--st-muted)]">Name</TableHead>
                <TableHead className="text-[var(--st-muted)]">Description</TableHead>
                <TableHead className="text-[var(--st-muted)]">Restricted</TableHead>
                <TableHead className="text-[var(--st-muted)]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.funds.map((fund) => (
                <TableRow key={fund.id} className="border-[var(--st-border)]">
                  <TableCell className="font-medium text-[var(--st-fg)]">{fund.name}</TableCell>
                  <TableCell className="text-[var(--st-muted)]">{fund.description || '-'}</TableCell>
                  <TableCell className="text-[var(--st-fg)]">{fund.isRestricted ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(fund)}
                        className="border-[var(--st-border)] text-[var(--st-fg)]"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(fund.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data?.funds.length === 0 && (
                <TableRow className="border-[var(--st-border)]">
                  <TableCell colSpan={4} className="text-center py-8 text-[var(--st-muted)]">
                    No funds found. Create your first fund to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

