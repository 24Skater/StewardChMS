import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInvoices, useDeleteInvoice, useVendors } from '../../hooks/useAccounting'
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
import { InvoiceStatus } from '../../lib/api'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

const statusColors: Record<InvoiceStatus, string> = {
  draft: 'bg-[var(--st-border)] text-[var(--st-muted)]',
  sent: 'bg-[var(--st-primary)]/20 text-[var(--st-primary)]',
  paid: 'bg-[var(--st-color-success)]/20 text-[var(--st-color-success)]',
  void: 'bg-[var(--st-color-danger)]/20 text-[var(--st-color-danger)]',
}

export default function InvoicesPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<InvoiceStatus | ''>('')
  const [vendorId, setVendorId] = useState('')

  const { data: vendorsData } = useVendors()
  const { data, isLoading, error } = useInvoices({
    page,
    limit: 20,
    status: status || undefined,
    vendorId: vendorId || undefined,
  })

  const deleteMutation = useDeleteInvoice()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (error) {
    return <div className="p-4 text-[var(--st-color-danger)]">Error loading invoices</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Invoices</h1>
        <Link to="/invoices/new">
          <Button className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
            Create Invoice
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
        <div>
          <Label className="text-[var(--st-fg)]">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus | '')}>
            <SelectTrigger className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
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
                  <TableHead className="text-[var(--st-muted)]">Invoice #</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Bill To</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Issue Date</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Due Date</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Status</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Total</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="border-[var(--st-border)]">
                    <TableCell className="font-medium">
                      <Link to={`/invoices/${invoice.id}`} className="text-[var(--st-link)] hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[var(--st-fg)]">
                      {invoice.vendor?.name || invoice.billToName || '-'}
                    </TableCell>
                    <TableCell className="text-[var(--st-fg)]">{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell className="text-[var(--st-fg)]">{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          statusColors[invoice.status]
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-[var(--st-fg)]">
                      {formatCents(invoice.totalCents)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link to={`/invoices/${invoice.id}`}>
                          <Button variant="outline" size="sm" className="border-[var(--st-border)] text-[var(--st-fg)]">
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(invoice.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.invoices.length === 0 && (
                  <TableRow className="border-[var(--st-border)]">
                    <TableCell colSpan={7} className="text-center py-8 text-[var(--st-muted)]">
                      No invoices found
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
