import { useParams, Link, useNavigate } from 'react-router-dom'
import { useInvoice, useUpdateInvoice, useDeleteInvoice } from '../../hooks/useAccounting'
import { Button } from '../../components/ui/button'
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
import { InvoiceStatus } from '../../lib/api'
import { generateInvoicePDF } from '../../lib/pdf'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

// Status colors for display
const _statusColors: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  void: 'bg-red-100 text-red-800',
}
void _statusColors

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: invoice, isLoading, error } = useInvoice(id || '')
  const updateMutation = useUpdateInvoice()
  const deleteMutation = useDeleteInvoice()

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (invoice) {
      await updateMutation.mutateAsync({ id: invoice.id, data: { status: newStatus } })
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      await deleteMutation.mutateAsync(id!)
      navigate('/invoices')
    }
  }

  const handleDownloadPDF = () => {
    if (invoice) {
      generateInvoicePDF(invoice)
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>
  }

  if (error || !invoice) {
    return <div className="p-6 text-red-600">Error loading invoice</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link to="/invoices" className="text-blue-600 hover:underline text-sm mb-2 block">
            ← Back to Invoices
          </Link>
          <h1 className="text-2xl font-bold">Invoice {invoice.invoiceNumber}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            Download PDF
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Details</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Bill To:</span>{' '}
              {invoice.vendor?.name || invoice.billToName || 'N/A'}
            </div>
            <div>
              <span className="text-gray-500">Issue Date:</span>{' '}
              {formatDate(invoice.issueDate)}
            </div>
            <div>
              <span className="text-gray-500">Due Date:</span>{' '}
              {invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Status:</span>
              <Select value={invoice.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32">
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
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span>{formatCents(invoice.subtotalCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tax:</span>
              <span>{formatCents(invoice.taxCents)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCents(invoice.totalCents)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden mb-6">
        <h2 className="font-semibold p-4 bg-gray-50">Line Items</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatCents(item.unitPriceCents)}</TableCell>
                <TableCell className="text-right">{formatCents(item.lineTotalCents)}</TableCell>
              </TableRow>
            ))}
            {(!invoice.items || invoice.items.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No line items
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {invoice.note && (
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Note</h2>
          <p className="text-gray-600">{invoice.note}</p>
        </div>
      )}
    </div>
  )
}

