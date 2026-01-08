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
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  closed: 'bg-blue-100 text-blue-800',
  void: 'bg-gray-200 text-gray-600',
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
    return <div className="p-4 text-red-600">Error loading purchase orders</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <Link to="/purchase-orders/new">
          <Button>Create PO</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as PurchaseOrderStatus | '')}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
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
          <Label>Vendor</Label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger>
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
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
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Requestor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">
                      <Link to={`/purchase-orders/${po.id}`} className="text-blue-600 hover:underline">
                        {po.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{po.vendor?.name || '-'}</TableCell>
                    <TableCell>{formatDate(po.issueDate)}</TableCell>
                    <TableCell>
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
                    <TableCell className="font-semibold">
                      {formatCents(po.totalCents)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link to={`/purchase-orders/${po.id}`}>
                          <Button variant="outline" size="sm">
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
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
              >
                Previous
              </Button>
              <span className="py-2 px-4">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === data.totalPages}
                onClick={() => setPage(page + 1)}
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

