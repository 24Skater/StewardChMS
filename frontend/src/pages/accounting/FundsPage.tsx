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
    return <div className="p-4 text-red-600">Error loading funds</div>
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Funds</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>Add Fund</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFund ? 'Edit Fund' : 'Add Fund'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Fund Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                <Label htmlFor="isRestricted">Restricted Fund</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingFund ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Restricted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.funds.map((fund) => (
                <TableRow key={fund.id}>
                  <TableCell className="font-medium">{fund.name}</TableCell>
                  <TableCell>{fund.description || '-'}</TableCell>
                  <TableCell>{fund.isRestricted ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(fund)}
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
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
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

