import { useState } from 'react'
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '../../hooks/useAccounting'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
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
import { Vendor } from '../../lib/api'

export default function VendorsPage() {
  const { data, isLoading, error } = useVendors()
  const createMutation = useCreateVendor()
  const updateMutation = useUpdateVendor()
  const deleteMutation = useDeleteVendor()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
  })

  const handleOpenCreate = () => {
    setEditingVendor(null)
    setFormData({ name: '', email: '', phone: '', street: '', city: '', state: '', zip: '' })
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setFormData({
      name: vendor.name,
      email: vendor.email || '',
      phone: vendor.phone || '',
      street: vendor.street || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zip: vendor.zip || '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        street: formData.street || null,
        city: formData.city || null,
        state: formData.state || null,
        zip: formData.zip || null,
      }

      if (editingVendor) {
        await updateMutation.mutateAsync({ id: editingVendor.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to save vendor:', error)
      alert('Failed to save vendor')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete vendor:', error)
        alert('Cannot delete vendor with existing transactions')
      }
    }
  }

  if (error) {
    return <div className="p-4 text-[var(--st-color-danger)]">Error loading vendors</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Vendors</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">Add Vendor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-[var(--st-surface)] border-[var(--st-border)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--st-fg)]">{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-[var(--st-fg)]">Vendor Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[var(--st-fg)]">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                  />
                </div>
                <div>
                  <Label className="text-[var(--st-fg)]">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[var(--st-fg)]">Street</Label>
                <Input
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-[var(--st-fg)]">City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                  />
                </div>
                <div>
                  <Label className="text-[var(--st-fg)]">State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                  />
                </div>
                <div>
                  <Label className="text-[var(--st-fg)]">ZIP</Label>
                  <Input
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-[var(--st-border)] text-[var(--st-fg)]">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
                  {editingVendor ? 'Update' : 'Create'}
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
                <TableHead className="text-[var(--st-muted)]">Email</TableHead>
                <TableHead className="text-[var(--st-muted)]">Phone</TableHead>
                <TableHead className="text-[var(--st-muted)]">Location</TableHead>
                <TableHead className="text-[var(--st-muted)]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.vendors.map((vendor) => (
                <TableRow key={vendor.id} className="border-[var(--st-border)]">
                  <TableCell className="font-medium text-[var(--st-fg)]">{vendor.name}</TableCell>
                  <TableCell className="text-[var(--st-muted)]">{vendor.email || '-'}</TableCell>
                  <TableCell className="text-[var(--st-muted)]">{vendor.phone || '-'}</TableCell>
                  <TableCell className="text-[var(--st-muted)]">
                    {vendor.city && vendor.state
                      ? `${vendor.city}, ${vendor.state}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(vendor)}
                        className="border-[var(--st-border)] text-[var(--st-fg)]"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(vendor.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data?.vendors.length === 0 && (
                <TableRow className="border-[var(--st-border)]">
                  <TableCell colSpan={5} className="text-center py-8 text-[var(--st-muted)]">
                    No vendors found. Add your first vendor to get started.
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

