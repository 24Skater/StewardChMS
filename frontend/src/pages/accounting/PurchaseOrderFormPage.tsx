import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreatePurchaseOrder, useVendors } from '../../hooks/useAccounting'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { PurchaseOrderItemInput, PurchaseOrderStatus } from '../../lib/api'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function PurchaseOrderFormPage() {
  const navigate = useNavigate()
  const { data: vendorsData } = useVendors()
  const createMutation = useCreatePurchaseOrder()

  const [vendorId, setVendorId] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<PurchaseOrderStatus>('draft')
  const [taxCents, setTaxCents] = useState(0)
  const [note, setNote] = useState('')
  const [items, setItems] = useState<PurchaseOrderItemInput[]>([])

  // New item form
  const [newDescription, setNewDescription] = useState('')
  const [newQuantity, setNewQuantity] = useState(1)
  const [newUnitPrice, setNewUnitPrice] = useState(0)

  const addItem = () => {
    if (!newDescription || newQuantity <= 0 || newUnitPrice < 0) {
      alert('Please fill in all item fields')
      return
    }
    setItems([
      ...items,
      {
        description: newDescription,
        quantity: newQuantity,
        unitPriceCents: Math.round(newUnitPrice * 100),
      },
    ])
    setNewDescription('')
    setNewQuantity(1)
    setNewUnitPrice(0)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotalCents = items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
    0
  )
  const totalCents = subtotalCents + taxCents

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({
        vendorId: vendorId || null,
        issueDate: new Date(issueDate).toISOString(),
        status,
        taxCents,
        note: note || null,
        items,
      })
      navigate('/purchase-orders')
    } catch (error) {
      console.error('Failed to create purchase order:', error)
      alert('Failed to create purchase order')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Purchase Order</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- None --</SelectItem>
                {vendorsData?.vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Issue Date *</Label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as PurchaseOrderStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Line Items */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Line Items</h2>
          
          {/* Add Item Form */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="col-span-2">
              <Input
                placeholder="Description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Qty"
                min="0.01"
                step="0.01"
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Unit Price"
                min="0"
                step="0.01"
                value={newUnitPrice}
                onChange={(e) => setNewUnitPrice(parseFloat(e.target.value) || 0)}
              />
              <Button type="button" onClick={addItem}>
                Add
              </Button>
            </div>
          </div>

          {/* Items Table */}
          {items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCents(item.unitPriceCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCents(Math.round(item.quantity * item.unitPriceCents))}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Totals */}
          <div className="mt-4 text-right space-y-2">
            <div>Subtotal: {formatCents(subtotalCents)}</div>
            <div className="flex justify-end items-center gap-2">
              <Label>Tax:</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="w-32"
                value={taxCents / 100}
                onChange={(e) => setTaxCents(Math.round((parseFloat(e.target.value) || 0) * 100))}
              />
            </div>
            <div className="text-lg font-bold">Total: {formatCents(totalCents)}</div>
          </div>
        </div>

        <div>
          <Label>Note</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/purchase-orders')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

