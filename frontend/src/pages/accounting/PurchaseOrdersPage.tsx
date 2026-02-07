import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePurchaseOrders, useDeletePurchaseOrder, useVendors } from '../../hooks/useAccounting'
import { Button } from '../../components/ui/button'
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
import { PurchaseOrderStatus } from '../../lib/api'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

const statusColors: Record<PurchaseOrderStatus, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  submitted: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  closed: 'bg-blue-500/20 text-blue-400',
  void: 'bg-gray-500/20 text-gray-500',
}

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('')
  const [vendorId, setVendorId] = useState('')

  const { data: vendorsData } = useVendors()
  const { data, isLoading, error } = usePurchaseOrders({
    page,
    limit: 20,
    status: status || undefined,
    vendorId: vendorId || undefined,
  })

  const deleteMutation = useDeletePurchaseOrder()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this purchase order?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading purchase orders</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Purchase Orders</h1>
        <Link to="/purchase-orders/new">
          <Button className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]">
            Create PO
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
        <div>
          <Label className="text-[var(--st-fg)]">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as PurchaseOrderStatus | '')}>
            <SelectTrigger className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[var(--st-fg)]">Vendor</Label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
              <SelectItem value="all">All Vendors</SelectItem>
              {vendorsData?.vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              setStatus('')
              setVendorId('')
            }}
            className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-[var(--st-muted)]">Loading...</div>
      ) : (
        <>
          <div className="border border-[var(--st-border)] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)]">
                  <TableHead className="text-[var(--st-muted)]">PO #</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Vendor</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Issue Date</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Requestor</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Status</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Total</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.purchaseOrders.map((po) => (
                  <TableRow key={po.id} className="border-[var(--st-border)]">
                    <TableCell className="font-medium">
                      <Link to={`/purchase-orders/${po.id}`} className="text-[var(--st-link)] hover:underline">
                        {po.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[var(--st-fg)]">{po.vendor?.name || '-'}</TableCell>
                    <TableCell className="text-[var(--st-fg)]">{formatDate(po.issueDate)}</TableCell>
                    <TableCell className="text-[var(--st-fg)]">
                      {po.requestorUser?.name || po.requestorUser?.email || '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          statusColors[po.status]
                        }`}
                      >
                        {po.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-[var(--st-fg)]">
                      {formatCents(po.totalCents)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link to={`/purchase-orders/${po.id}`}>
                          <Button variant="outline" size="sm" className="border-[var(--st-border)] text-[var(--st-fg)]">
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(po.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.purchaseOrders.length === 0 && (
                  <TableRow className="border-[var(--st-border)]">
                    <TableCell colSpan={7} className="text-center py-8 text-[var(--st-muted)]">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="border-[var(--st-border)] text-[var(--st-fg)]"
              >
                Previous
              </Button>
              <span className="py-2 px-4 text-[var(--st-fg)]">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === data.totalPages}
                onClick={() => setPage(page + 1)}
                className="border-[var(--st-border)] text-[var(--st-fg)]"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
