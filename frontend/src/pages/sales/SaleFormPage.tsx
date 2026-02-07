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
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/sales" className="inline-flex items-center text-blue-600 hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sales
      </Link>

      <h1 className="text-2xl font-bold mb-6">New Sale</h1>

      <form onSubmit={handleSubmit}>
        {/* Customer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label>Member (optional)</Label>
            <Select
              value={memberId || 'none'}
              onValueChange={(value) => setMemberId(value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
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
              <Label htmlFor="guestName">Guest Name</Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Optional"
              />
            </div>
          )}
        </div>

        {/* Add Items */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="font-semibold mb-4">Add Items</h3>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6">
              <Select
                value={selectedProductId || 'none'}
                onValueChange={(value) => setSelectedProductId(value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
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
              />
            </div>
            <div className="col-span-3">
              <Button
                type="button"
                onClick={addItem}
                disabled={!selectedProductId}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border rounded-lg overflow-hidden mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right w-24">Price</TableHead>
                <TableHead className="text-center w-24">Qty</TableHead>
                <TableHead className="text-right w-32">Line Total</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No items added yet
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.product.name}</TableCell>
                    <TableCell className="text-right">{formatCents(item.product.priceCents)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                        className="w-16 text-center mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
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
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCents(subtotalCents)}</span>
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="tax">Tax:</Label>
              <div className="w-24">
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  min="0"
                  value={(taxCents / 100).toFixed(2)}
                  onChange={(e) => setTaxCents(Math.round(parseFloat(e.target.value || '0') * 100))}
                  className="text-right"
                />
              </div>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCents(totalCents)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/sales')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending || items.length === 0}>
            {createMutation.isPending ? 'Processing...' : 'Complete Sale'}
          </Button>
        </div>
      </form>
    </div>
  )
}


