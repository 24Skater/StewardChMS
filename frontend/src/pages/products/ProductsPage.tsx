import { useState } from 'react'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../../hooks/useProducts'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Product, CreateProductData } from '../../lib/api'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function ProductsPage() {
  const [showInactive, setShowInactive] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    description: '',
    sku: '',
    priceCents: 0,
    isActive: true,
  })

  const { data, isLoading } = useProducts(showInactive ? undefined : true)
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        priceCents: product.priceCents,
        isActive: product.isActive,
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: '',
        description: '',
        sku: '',
        priceCents: 0,
        isActive: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({
          id: editingProduct.id,
          data: formData,
        })
      } else {
        await createMutation.mutateAsync(formData)
      }
      setIsDialogOpen(false)
    } catch {
      // Error handled by mutation
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to deactivate this product?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Products</h1>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 text-sm text-[var(--st-muted)]">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="accent-[var(--st-primary)]"
            />
            Show inactive
          </label>
          <Button onClick={() => openDialog()} className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]">
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-[var(--st-muted)]">Loading...</div>}

      {data && (
        <div className="border border-[var(--st-border)] rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--st-border)]">
                <TableHead className="text-[var(--st-muted)]">Name</TableHead>
                <TableHead className="text-[var(--st-muted)]">SKU</TableHead>
                <TableHead className="text-[var(--st-muted)]">Description</TableHead>
                <TableHead className="text-right text-[var(--st-muted)]">Price</TableHead>
                <TableHead className="text-[var(--st-muted)]">Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.length === 0 ? (
                <TableRow className="border-[var(--st-border)]">
                  <TableCell colSpan={6} className="text-center py-8 text-[var(--st-muted)]">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                data.products.map((product) => (
                  <TableRow key={product.id} className={`border-[var(--st-border)] ${!product.isActive ? 'opacity-50' : ''}`}>
                    <TableCell className="font-medium text-[var(--st-fg)]">{product.name}</TableCell>
                    <TableCell className="text-[var(--st-muted)]">{product.sku || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate text-[var(--st-muted)]">{product.description || '-'}</TableCell>
                    <TableCell className="text-right text-emerald-500 font-medium">{formatCents(product.priceCents)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        product.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--st-muted)]/20 text-[var(--st-muted)]'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDialog(product)} className="text-[var(--st-muted)] hover:text-[var(--st-fg)]">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {product.isActive && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--st-fg)]">{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name" className="text-[var(--st-fg)]">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                />
              </div>
              <div>
                <Label htmlFor="sku" className="text-[var(--st-fg)]">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku || ''}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value || undefined })}
                  className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-[var(--st-fg)]">Description</Label>
                <Input
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value || undefined })}
                  className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                />
              </div>
              <div>
                <Label htmlFor="price" className="text-[var(--st-fg)]">Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={(formData.priceCents / 100).toFixed(2)}
                  onChange={(e) => setFormData({ ...formData, priceCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                  required
                  className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                />
              </div>
              {editingProduct && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="accent-[var(--st-primary)]"
                  />
                  <Label htmlFor="isActive" className="text-[var(--st-fg)]">Active</Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-[var(--st-border)] text-[var(--st-fg)]">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-[var(--st-primary)] text-white">
                {editingProduct ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
