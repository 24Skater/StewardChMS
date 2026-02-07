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
    return <div className="text-center py-8 text-[var(--st-muted)]">Loading...</div>
  }

  if (error || !sale) {
    return <div className="text-center py-8 text-[var(--st-color-danger)]">Error loading sale</div>
  }

  return (
    <div className="space-y-6">
      <Link to="/sales" className="inline-flex items-center text-[var(--st-link)] hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sales
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">Sale {sale.saleNumber}</h1>
          <div className="text-[var(--st-muted)]">
            {formatDate(sale.soldAt)} at {formatTime(sale.soldAt)}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded text-sm font-medium ${
            sale.status === 'completed'
              ? 'bg-[var(--st-color-success)]/20 text-[var(--st-color-success)]'
              : 'bg-[var(--st-color-danger)]/20 text-[var(--st-color-danger)]'
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-[var(--st-surfaceMuted)] rounded-lg border border-[var(--st-border)]">
          <h3 className="font-semibold text-[var(--st-fg)] mb-2">Customer</h3>
          <div className="text-[var(--st-muted)]">
            {sale.member
              ? `${sale.member.firstName} ${sale.member.lastName}`
              : sale.guestName || 'Guest'}
          </div>
        </div>
        <div className="p-4 bg-[var(--st-surfaceMuted)] rounded-lg border border-[var(--st-border)]">
          <h3 className="font-semibold text-[var(--st-fg)] mb-2">Processed By</h3>
          <div className="text-[var(--st-muted)]">{sale.createdByUser?.name || sale.createdByUser?.email || '-'}</div>
        </div>
      </div>

      {/* Items */}
      <div className="border border-[var(--st-border)] rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--st-border)]">
              <TableHead className="text-[var(--st-muted)]">Product</TableHead>
              <TableHead className="text-[var(--st-muted)]">SKU</TableHead>
              <TableHead className="text-right text-[var(--st-muted)]">Unit Price</TableHead>
              <TableHead className="text-center text-[var(--st-muted)]">Qty</TableHead>
              <TableHead className="text-right text-[var(--st-muted)]">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sale.items?.map((item) => (
              <TableRow key={item.id} className="border-[var(--st-border)]">
                <TableCell className="font-medium text-[var(--st-fg)]">{item.product?.name || 'Unknown'}</TableCell>
                <TableCell className="text-[var(--st-muted)]">{item.product?.sku || '-'}</TableCell>
                <TableCell className="text-right text-[var(--st-muted)]">{formatCents(item.unitPriceCents)}</TableCell>
                <TableCell className="text-center text-[var(--st-fg)]">{item.quantity}</TableCell>
                <TableCell className="text-right font-medium text-[var(--st-color-success)]">{formatCents(item.lineTotalCents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2 text-[var(--st-fg)]">
          <div className="flex justify-between">
            <span className="text-[var(--st-muted)]">Subtotal:</span>
            <span>{formatCents(sale.subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--st-muted)]">Tax:</span>
            <span>{formatCents(sale.taxCents)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-[var(--st-border)] pt-2">
            <span>Total:</span>
            <span className="text-[var(--st-color-success)]">{formatCents(sale.totalCents)}</span>
          </div>
        </div>
      </div>

      {sale.status === 'void' && (
        <div className="p-4 bg-[var(--st-color-danger)]/10 border border-[var(--st-color-danger)]/30 rounded-lg">
          <p className="text-[var(--st-color-danger)]">
            This sale has been voided. Inventory has been restored.
          </p>
        </div>
      )}
    </div>
  )
}
