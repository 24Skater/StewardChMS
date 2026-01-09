import { useParams, Link } from 'react-router-dom'
import { useSale, useVoidSale } from '../../hooks/useSales'
import { Button } from '../../components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { ArrowLeft, XCircle } from 'lucide-react'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function SaleDetailPage() {
  const { id } = useParams()
  const { data: sale, isLoading, error } = useSale(id || '')
  const voidMutation = useVoidSale()

  const handleVoid = async () => {
    if (!sale) return
    if (!confirm('Are you sure you want to void this sale? This will restore inventory.')) return

    try {
      await voidMutation.mutateAsync(sale.id)
    } catch {
      // Error handled by mutation
    }
  }

  if (isLoading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  if (error || !sale) {
    return <div className="p-6 text-center text-red-600">Error loading sale</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/sales" className="inline-flex items-center text-blue-600 hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sales
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sale {sale.saleNumber}</h1>
          <div className="text-gray-500">
            {formatDate(sale.soldAt)} at {formatTime(sale.soldAt)}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded text-sm font-medium ${
            sale.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {sale.status.toUpperCase()}
          </span>
          {sale.status === 'completed' && (
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={voidMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {voidMutation.isPending ? 'Voiding...' : 'Void Sale'}
            </Button>
          )}
        </div>
      </div>

      {/* Sale Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Customer</h3>
          <div>
            {sale.member
              ? `${sale.member.firstName} ${sale.member.lastName}`
              : sale.guestName || 'Guest'}
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Processed By</h3>
          <div>{sale.createdByUser?.name || sale.createdByUser?.email || '-'}</div>
        </div>
      </div>

      {/* Items */}
      <div className="border rounded-lg overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sale.items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.product?.name || 'Unknown'}</TableCell>
                <TableCell>{item.product?.sku || '-'}</TableCell>
                <TableCell className="text-right">{formatCents(item.unitPriceCents)}</TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right font-medium">{formatCents(item.lineTotalCents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCents(sale.subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>{formatCents(sale.taxCents)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span>{formatCents(sale.totalCents)}</span>
          </div>
        </div>
      </div>

      {sale.status === 'void' && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">
            This sale has been voided. Inventory has been restored.
          </p>
        </div>
      )}
    </div>
  )
}

