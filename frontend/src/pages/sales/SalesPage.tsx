import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSales } from '../../hooks/useSales'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { Plus } from 'lucide-react'
import { getSales } from '@/lib/api'
import { downloadCSV, generateExportFilename, formatCentsToDollars, formatDateTime } from '@/lib/csv'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getDefaultDateRange() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    dateFrom: startOfMonth.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
  }
}

export default function SalesPage() {
  const defaults = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom)
  const [dateTo, setDateTo] = useState(defaults.dateTo)
  const [isExporting, setIsExporting] = useState(false)

  const { data, isLoading } = useSales({ dateFrom, dateTo })

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const allData = await getSales({ dateFrom, dateTo, limit: 10000 })

      const headers = [
        'Sale Number',
        'Date/Time',
        'Customer',
        'Items',
        'Total',
        'Payment Method',
        'Status',
        'Sold By',
        'Note',
      ]

      const rows = allData.sales.map(sale => [
        sale.saleNumber || sale.id,
        formatDateTime(sale.saleDate),
        sale.memberName || sale.guestName || 'Walk-in',
        sale.lineItems?.map(li => `${li.productName} x${li.quantity}`).join('; ') || '',
        formatCentsToDollars(sale.totalCents),
        sale.paymentMethod,
        sale.status,
        sale.soldByUserName || '',
        sale.note || '',
      ])

      downloadCSV(generateExportFilename('sales'), headers, rows)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export sales. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Sales</h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Link to="/sales/new">
            <Button className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
              <Plus className="h-4 w-4 mr-2" /> New Sale
            </Button>
          </Link>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[var(--st-surfaceMuted)] rounded-lg border border-[var(--st-border)]">
        <div>
          <Label className="text-[var(--st-muted)]">From Date</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
          />
        </div>
        <div>
          <Label className="text-[var(--st-muted)]">To Date</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
          />
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              setDateFrom(today)
              setDateTo(today)
            }}
            className="border-[var(--st-border)] text-[var(--st-muted)] bg-[var(--st-surface)]"
          >
            Today
          </Button>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              const d = getDefaultDateRange()
              setDateFrom(d.dateFrom)
              setDateTo(d.dateTo)
            }}
            className="border-[var(--st-border)] text-[var(--st-muted)] bg-[var(--st-surface)]"
          >
            This Month
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-[var(--st-muted)]">Loading...</div>}

      {data && (
        <div className="border border-[var(--st-border)] rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--st-border)]">
                <TableHead className="text-[var(--st-muted)]">Sale #</TableHead>
                <TableHead className="text-[var(--st-muted)]">Date</TableHead>
                <TableHead className="text-[var(--st-muted)]">Customer</TableHead>
                <TableHead className="text-[var(--st-muted)]">Items</TableHead>
                <TableHead className="text-right text-[var(--st-muted)]">Total</TableHead>
                <TableHead className="text-[var(--st-muted)]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sales.length === 0 ? (
                <TableRow className="border-[var(--st-border)]">
                  <TableCell colSpan={6} className="text-center py-8 text-[var(--st-muted)]">
                    No sales found in this date range
                  </TableCell>
                </TableRow>
              ) : (
                data.sales.map((sale) => (
                  <TableRow key={sale.id} className={`border-[var(--st-border)] ${sale.status === 'void' ? 'opacity-50' : ''}`}>
                    <TableCell>
                      <Link to={`/sales/${sale.id}`} className="text-[var(--st-link)] hover:underline font-medium">
                        {sale.saleNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-[var(--st-fg)]">{formatDate(sale.soldAt)}</div>
                      <div className="text-sm text-[var(--st-muted)]">{formatTime(sale.soldAt)}</div>
                    </TableCell>
                    <TableCell className="text-[var(--st-fg)]">
                      {sale.member
                        ? `${sale.member.firstName} ${sale.member.lastName}`
                        : sale.guestName || 'Guest'}
                    </TableCell>
                    <TableCell className="text-[var(--st-muted)]">{sale._count?.items || '-'}</TableCell>
                    <TableCell className="text-right font-medium text-[var(--st-color-success)]">
                      {formatCents(sale.totalCents)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        sale.status === 'completed'
                          ? 'bg-[var(--st-color-success)]/20 text-[var(--st-color-success)]'
                          : 'bg-[var(--st-color-danger)]/20 text-[var(--st-color-danger)]'
                      }`}>
                        {sale.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
