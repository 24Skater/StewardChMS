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
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/reports" className="inline-flex items-center text-blue-600 hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Reports
      </Link>

      <h1 className="text-2xl font-bold mb-6">Sales Summary</h1>

      {/* Date Range Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <Label>From Date</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <Label>To Date</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
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
          >
            This Month
          </Button>
        </div>
        <div className="flex items-end">
          <Button onClick={handleExportCSV} disabled={!data}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-8">Loading...</div>}
      {error && <div className="text-center py-8 text-red-600">Error loading report</div>}

      {data && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border rounded-lg">
              <div className="text-sm text-gray-500">Total Sales</div>
              <div className="text-3xl font-bold">{data.totalSales}</div>
            </div>
            <div className="p-4 bg-white border rounded-lg">
              <div className="text-sm text-gray-500">Revenue</div>
              <div className="text-3xl font-bold text-green-600">{formatCents(data.totalRevenueCents)}</div>
            </div>
            <div className="p-4 bg-white border rounded-lg">
              <div className="text-sm text-gray-500">Tax Collected</div>
              <div className="text-3xl font-bold text-gray-600">{formatCents(data.totalTaxCents)}</div>
            </div>
          </div>

          {/* Top Products Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="font-semibold">Top Products</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      No sales found in this date range
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.topProducts.map((product) => (
                      <TableRow key={product.productId}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">{product.quantity}</TableCell>
                        <TableCell className="text-right">{formatCents(product.revenueCents)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-gray-50">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">{formatCents(data.totalRevenueCents)}</TableCell>
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


