import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useExpenses, useDeleteExpense, useFunds, useVendors } from '../../hooks/useAccounting'
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
import { getExpenses } from '@/lib/api'
import { downloadCSV, generateExportFilename, formatCentsToDollars, formatDate as formatDateExport } from '@/lib/csv'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

export default function ExpensesPage() {
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [fundId, setFundId] = useState('')
  const [vendorId, setVendorId] = useState('')

  const { data: fundsData } = useFunds()
  const { data: vendorsData } = useVendors()
  const { data, isLoading, error } = useExpenses({
    page,
    limit: 20,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    fundId: fundId || undefined,
    vendorId: vendorId || undefined,
  })

  const deleteMutation = useDeleteExpense()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const allData = await getExpenses({
        limit: 10000,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        fundId: fundId || undefined,
        vendorId: vendorId || undefined,
      })

      const headers = [
        'Date',
        'Category',
        'Amount',
        'Vendor',
        'Fund',
        'Note',
        'Created At',
      ]

      const rows = allData.expenses.map(expense => [
        formatDateExport(expense.expenseDate),
        expense.category || '',
        formatCentsToDollars(expense.amountCents),
        expense.vendor?.name || '',
        expense.fund?.name || 'General',
        expense.note || '',
        formatDateExport(expense.createdAt),
      ])

      downloadCSV(generateExportFilename('expenses'), headers, rows)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export expenses. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (error) {
    return <div className="p-4 text-[var(--st-color-danger)]">Error loading expenses</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Expenses</h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Link to="/expenses/new">
            <Button className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
              Add Expense
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
        <div>
          <Label className="text-[var(--st-fg)]">From Date</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
          />
        </div>
        <div>
          <Label className="text-[var(--st-fg)]">To Date</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
          />
        </div>
        <div>
          <Label className="text-[var(--st-fg)]">Fund</Label>
          <Select value={fundId} onValueChange={setFundId}>
            <SelectTrigger className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
              <SelectValue placeholder="All Funds" />
            </SelectTrigger>
            <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
              <SelectItem value="all">All Funds</SelectItem>
              {fundsData?.funds.map((fund) => (
                <SelectItem key={fund.id} value={fund.id}>
                  {fund.name}
                </SelectItem>
              ))}
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
              setDateFrom('')
              setDateTo('')
              setFundId('')
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
                  <TableHead className="text-[var(--st-muted)]">Date</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Vendor</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Category</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Fund</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Amount</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.expenses.map((expense) => (
                  <TableRow key={expense.id} className="border-[var(--st-border)]">
                    <TableCell className="text-[var(--st-fg)]">{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell className="text-[var(--st-fg)]">{expense.vendor?.name || '-'}</TableCell>
                    <TableCell className="text-[var(--st-fg)]">{expense.category || '-'}</TableCell>
                    <TableCell className="text-[var(--st-fg)]">{expense.fund?.name || 'Undesignated'}</TableCell>
                    <TableCell className="font-semibold text-[var(--st-fg)]">
                      {formatCents(expense.amountCents)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link to={`/expenses/${expense.id}/edit`}>
                          <Button variant="outline" size="sm" className="border-[var(--st-border)] text-[var(--st-fg)]">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(expense.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.expenses.length === 0 && (
                  <TableRow className="border-[var(--st-border)]">
                    <TableCell colSpan={6} className="text-center py-8 text-[var(--st-muted)]">
                      No expenses found
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
