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

  const { data, isLoading } = useSales({ dateFrom, dateTo })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales</h1>
        <Link to="/sales/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> New Sale
          </Button>
        </Link>
      </div>

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
              const today = new Date().toISOString().split('T')[0]
              setDateFrom(today)
              setDateTo(today)
            }}
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
          >
            This Month
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-8">Loading...</div>}

      {data && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No sales found in this date range
                  </TableCell>
                </TableRow>
              ) : (
                data.sales.map((sale) => (
                  <TableRow key={sale.id} className={sale.status === 'void' ? 'opacity-50' : ''}>
                    <TableCell>
                      <Link to={`/sales/${sale.id}`} className="text-blue-600 hover:underline font-medium">
                        {sale.saleNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>{formatDate(sale.soldAt)}</div>
                      <div className="text-sm text-gray-500">{formatTime(sale.soldAt)}</div>
                    </TableCell>
                    <TableCell>
                      {sale.member
                        ? `${sale.member.firstName} ${sale.member.lastName}`
                        : sale.guestName || 'Guest'}
                    </TableCell>
                    <TableCell>{sale._count?.items || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCents(sale.totalCents)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        sale.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
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


