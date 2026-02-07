import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCreateSale } from '../../hooks/useSales'
import { useProducts } from '../../hooks/useProducts'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { Product, SaleItemInput } from '../../lib/api'

interface SaleLineItem extends SaleItemInput {
  product: Product
  lineTotalCents: number
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function SaleFormPage() {
  const navigate = useNavigate()
  const createMutation = useCreateSale()
  const { data: productsData } = useProducts(true)
  const { data: membersData } = useMembers({ limit: 100 })

  const [memberId, setMemberId] = useState<string>('')
  const [guestName, setGuestName] = useState('')
  const [taxCents, setTaxCents] = useState(0)
  const [items, setItems] = useState<SaleLineItem[]>([])

  // For adding new items
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState(1)

  const addItem = () => {
    if (!selectedProductId || quantity <= 0) return

    const product = productsData?.products.find(p => p.id === selectedProductId)
    if (!product) return

    // Check if product already in list
    const existingIndex = items.findIndex(i => i.productId === selectedProductId)
    if (existingIndex >= 0) {
      // Update quantity
      const updated = [...items]
      updated[existingIndex].quantity += quantity
      updated[existingIndex].lineTotalCents = updated[existingIndex].quantity * product.priceCents
      setItems(updated)
    } else {
      // Add new item
      setItems([...items, {
        productId: selectedProductId,
        quantity,
        product,
        lineTotalCents: quantity * product.priceCents,
      }])
    }

    setSelectedProductId('')
    setQuantity(1)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return
    const updated = [...items]
    updated[index].quantity = newQty
    updated[index].lineTotalCents = newQty * updated[index].product.priceCents
    setItems(updated)
  }

  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0)
  const totalCents = subtotalCents + taxCents

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      alert('Please add at least one item')
      return
    }

    try {
      const sale = await createMutation.mutateAsync({
        memberId: memberId || undefined,
        guestName: !memberId && guestName ? guestName : undefined,
        taxCents,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      })
      navigate(`/sales/${sale.id}`)
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/sales" className="inline-flex items-center text-[var(--st-link)] hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sales
      </Link>

      <h1 className="text-2xl font-bold text-[var(--st-fg)]">New Sale</h1>

      <form onSubmit={handleSubmit}>
        {/* Customer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
          <div>
            <Label className="text-[var(--st-fg)]">Member (optional)</Label>
            <Select
              value={memberId || 'none'}
              onValueChange={(value) => setMemberId(value === 'none' ? '' : value)}
            >
              <SelectTrigger className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                <SelectItem value="none">-- None (Guest) --</SelectItem>
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
              <Label htmlFor="guestName" className="text-[var(--st-fg)]">Guest Name</Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Optional"
                className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
              />
            </div>
          )}
        </div>

        {/* Add Items */}
        <div className="mb-6 p-4 border border-[var(--st-border)] bg-[var(--st-surface)]/50 rounded-lg">
          <h3 className="font-semibold mb-4 text-[var(--st-fg)]">Add Items</h3>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6">
              <Select
                value={selectedProductId || 'none'}
                onValueChange={(value) => setSelectedProductId(value === 'none' ? '' : value)}
              >
                <SelectTrigger className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                  <SelectItem value="none">-- Select Product --</SelectItem>
                  {productsData?.products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {formatCents(product.priceCents)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                placeholder="Qty"
                className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
              />
            </div>
            <div className="col-span-3">
              <Button
                type="button"
                onClick={addItem}
                disabled={!selectedProductId}
                className="w-full bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]"
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border border-[var(--st-border)] rounded-lg overflow-hidden mb-6">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--st-border)]">
                <TableHead className="text-[var(--st-muted)]">Product</TableHead>
                <TableHead className="text-right w-24 text-[var(--st-muted)]">Price</TableHead>
                <TableHead className="text-center w-24 text-[var(--st-muted)]">Qty</TableHead>
                <TableHead className="text-right w-32 text-[var(--st-muted)]">Line Total</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow className="border-[var(--st-border)]">
                  <TableCell colSpan={5} className="text-center py-8 text-[var(--st-muted)]">
                    No items added yet
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={index} className="border-[var(--st-border)]">
                    <TableCell className="font-medium text-[var(--st-fg)]">{item.product.name}</TableCell>
                    <TableCell className="text-right text-[var(--st-fg)]">{formatCents(item.product.priceCents)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                        className="w-16 text-center mx-auto border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium text-[var(--st-fg)]">
                      {formatCents(item.lineTotalCents)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-[var(--st-fg)]">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCents(subtotalCents)}</span>
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="tax" className="text-[var(--st-fg)]">Tax:</Label>
              <div className="w-24">
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  min="0"
                  value={(taxCents / 100).toFixed(2)}
                  onChange={(e) => setTaxCents(Math.round(parseFloat(e.target.value || '0') * 100))}
                  className="text-right border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
                />
              </div>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-[var(--st-border)] pt-2 text-[var(--st-fg)]">
              <span>Total:</span>
              <span>{formatCents(totalCents)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/sales')}
            className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || items.length === 0}
            className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]"
          >
            {createMutation.isPending ? 'Processing...' : 'Complete Sale'}
          </Button>
        </div>
      </form>
    </div>
  )
}
