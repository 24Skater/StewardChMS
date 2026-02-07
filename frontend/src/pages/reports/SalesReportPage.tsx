import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSalesSummary } from '../../hooks/useReports'
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
import { downloadCSV, formatCentsToDollars } from '../../lib/csv'
import { Download, ArrowLeft } from 'lucide-react'

function getDefaultDateRange() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    dateFrom: startOfMonth.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
  }
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function SalesReportPage() {
  const defaults = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom)
  const [dateTo, setDateTo] = useState(defaults.dateTo)

  const { data, isLoading, error } = useSalesSummary(dateFrom, dateTo)

  const handleExportCSV = () => {
    if (!data) return

    const headers = ['Product', 'Quantity Sold', 'Revenue ($)']
    const rows = data.topProducts.map(p => [
      p.name,
      String(p.quantity),
      formatCentsToDollars(p.revenueCents),
    ])
    rows.push(['TOTAL', '', formatCentsToDollars(data.totalRevenueCents)])

    downloadCSV(`sales-summary-${dateFrom}-to-${dateTo}.csv`, headers, rows)
  }

  return (
    <div className="space-y-6">
      <Link to="/reports" className="inline-flex items-center text-[var(--st-link)] hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Reports
      </Link>

      <h1 className="text-2xl font-bold text-[var(--st-fg)]">Sales Summary</h1>

      {/* Date Range Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[var(--st-surfaceMuted)] rounded-lg border border-[var(--st-border)]">
        <div>
          <Label className="text-[var(--st-mutedFg)]">From Date</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
          />
        </div>
        <div>
          <Label className="text-[var(--st-mutedFg)]">To Date</Label>
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
              const d = getDefaultDateRange()
              setDateFrom(d.dateFrom)
              setDateTo(d.dateTo)
            }}
            className="border-[var(--st-border)] text-[var(--st-mutedFg)]"
          >
            This Month
          </Button>
        </div>
        <div className="flex items-end">
          <Button onClick={handleExportCSV} disabled={!data} className="bg-[var(--st-primary)] text-white">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-[var(--st-muted)]">Loading...</div>}
      {error && <div className="text-center py-8 text-[var(--st-danger)]">Error loading report</div>}

      {data && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
              <div className="text-sm text-[var(--st-muted)]">Total Sales</div>
              <div className="text-3xl font-bold text-[var(--st-fg)]">{data.totalSales}</div>
            </div>
            <div className="p-4 bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
              <div className="text-sm text-[var(--st-muted)]">Revenue</div>
              <div className="text-3xl font-bold text-emerald-500">{formatCents(data.totalRevenueCents)}</div>
            </div>
            <div className="p-4 bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
              <div className="text-sm text-[var(--st-muted)]">Tax Collected</div>
              <div className="text-3xl font-bold text-[var(--st-muted)]">{formatCents(data.totalTaxCents)}</div>
            </div>
          </div>

          {/* Top Products Table */}
          <div className="border border-[var(--st-border)] rounded-lg overflow-hidden">
            <div className="p-4 bg-[var(--st-surfaceMuted)] border-b border-[var(--st-border)]">
              <h3 className="font-semibold text-[var(--st-fg)]">Top Products</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)]">
                  <TableHead className="text-[var(--st-muted)]">Product</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Quantity Sold</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topProducts.length === 0 ? (
                  <TableRow className="border-[var(--st-border)]">
                    <TableCell colSpan={3} className="text-center py-8 text-[var(--st-muted)]">
                      No sales found in this date range
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.topProducts.map((product) => (
                      <TableRow key={product.productId} className="border-[var(--st-border)]">
                        <TableCell className="font-medium text-[var(--st-fg)]">{product.name}</TableCell>
                        <TableCell className="text-right text-[var(--st-muted)]">{product.quantity}</TableCell>
                        <TableCell className="text-right text-[var(--st-fg)]">{formatCents(product.revenueCents)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-[var(--st-surfaceMuted)] border-[var(--st-border)]">
                      <TableCell className="text-[var(--st-fg)]">TOTAL</TableCell>
                      <TableCell className="text-right text-[var(--st-muted)]">-</TableCell>
                      <TableCell className="text-right text-emerald-500">{formatCents(data.totalRevenueCents)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
