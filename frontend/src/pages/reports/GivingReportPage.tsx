import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGivingReport } from '../../hooks/useReports'
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
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  return {
    dateFrom: startOfYear.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
  }
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function GivingReportPage() {
  const defaults = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom)
  const [dateTo, setDateTo] = useState(defaults.dateTo)

  const { data, isLoading, error } = useGivingReport(dateFrom, dateTo)

  const handleExportCSV = () => {
    if (!data) return

    const headers = ['Fund', 'Donations', 'Total ($)']
    const rows = data.fundTotals.map(f => [
      f.fundName,
      String(f.donationCount),
      formatCentsToDollars(f.totalCents),
    ])
    rows.push(['TOTAL', String(data.totalDonations), formatCentsToDollars(data.totalCents)])

    downloadCSV(`giving-report-${dateFrom}-to-${dateTo}.csv`, headers, rows)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/reports" className="inline-flex items-center text-blue-600 hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Reports
      </Link>

      <h1 className="text-2xl font-bold mb-6">Giving Summary</h1>

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
            Year to Date
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white border rounded-lg">
              <div className="text-sm text-gray-500">Total Giving</div>
              <div className="text-3xl font-bold text-green-600">{formatCents(data.totalCents)}</div>
            </div>
            <div className="p-4 bg-white border rounded-lg">
              <div className="text-sm text-gray-500">Total Donations</div>
              <div className="text-3xl font-bold">{data.totalDonations}</div>
            </div>
          </div>

          {/* Fund Breakdown Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Donations</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.fundTotals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      No donations found in this date range
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.fundTotals.map((fund) => (
                      <TableRow key={fund.fundId || 'undesignated'}>
                        <TableCell className="font-medium">{fund.fundName}</TableCell>
                        <TableCell className="text-right">{fund.donationCount}</TableCell>
                        <TableCell className="text-right">{formatCents(fund.totalCents)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-gray-50">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">{data.totalDonations}</TableCell>
                      <TableCell className="text-right">{formatCents(data.totalCents)}</TableCell>
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


