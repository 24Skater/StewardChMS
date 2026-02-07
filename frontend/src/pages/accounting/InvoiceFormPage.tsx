import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateInvoice, useVendors } from '../../hooks/useAccounting'
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
import { InvoiceItemInput, InvoiceStatus } from '../../lib/api'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function InvoiceFormPage() {
  const navigate = useNavigate()
  const { data: vendorsData } = useVendors()
  const createMutation = useCreateInvoice()

  const [vendorId, setVendorId] = useState('')
  const [billToName, setBillToName] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<InvoiceStatus>('draft')
  const [taxCents, setTaxCents] = useState(0)
  const [note, setNote] = useState('')
  const [items, setItems] = useState<InvoiceItemInput[]>([])

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
        billToName: billToName || null,
        issueDate: new Date(issueDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        status,
        taxCents,
        note: note || null,
        items,
      })
      navigate('/invoices')
    } catch (error) {
      console.error('Failed to create invoice:', error)
      alert('Failed to create invoice')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--st-fg)]">Create Invoice</h1>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]/50 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-[var(--st-fg)]">Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
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
            <Label className="text-[var(--st-fg)]">Bill To Name</Label>
            <Input
              value={billToName}
              onChange={(e) => setBillToName(e.target.value)}
              placeholder="Customer name"
              className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-[var(--st-fg)]">Issue Date *</Label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
              className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
            />
          </div>
          <div>
            <Label className="text-[var(--st-fg)]">Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
            />
          </div>
          <div>
            <Label className="text-[var(--st-fg)]">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
              <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Line Items */}
        <div className="border border-[var(--st-border)] rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 text-[var(--st-fg)]">Line Items</h2>
          
          {/* Add Item Form */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="col-span-2">
              <Input
                placeholder="Description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
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
                className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
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
                className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
              />
              <Button type="button" onClick={addItem} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
                Add
              </Button>
            </div>
          </div>

          {/* Items Table */}
          {items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)]">
                  <TableHead className="text-[var(--st-muted)]">Description</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Qty</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Unit Price</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index} className="border-[var(--st-border)]">
                    <TableCell className="text-[var(--st-fg)]">{item.description}</TableCell>
                    <TableCell className="text-right text-[var(--st-fg)]">{item.quantity}</TableCell>
                    <TableCell className="text-right text-[var(--st-fg)]">
                      {formatCents(item.unitPriceCents)}
                    </TableCell>
                    <TableCell className="text-right text-[var(--st-fg)]">
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
            <div className="text-[var(--st-fg)]">Subtotal: {formatCents(subtotalCents)}</div>
            <div className="flex justify-end items-center gap-2">
              <Label className="text-[var(--st-fg)]">Tax:</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="w-32 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                value={taxCents / 100}
                onChange={(e) => setTaxCents(Math.round((parseFloat(e.target.value) || 0) * 100))}
              />
            </div>
            <div className="text-lg font-bold text-[var(--st-fg)]">Total: {formatCents(totalCents)}</div>
          </div>
        </div>

        <div>
          <Label className="text-[var(--st-fg)]">Note</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={createMutation.isPending} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
            {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/invoices')} className="border-[var(--st-border)] text-[var(--st-fg)]">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

