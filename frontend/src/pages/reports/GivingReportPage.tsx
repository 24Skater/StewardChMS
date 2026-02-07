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
    <div className="space-y-6">
      <Link to="/reports" className="inline-flex items-center text-[var(--st-link)] hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Reports
      </Link>

      <h1 className="text-2xl font-bold text-[var(--st-fg)]">Giving Summary</h1>

      {/* Date Range Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[var(--st-surface-muted)] rounded-lg border border-[var(--st-border)]">
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
              const d = getDefaultDateRange()
              setDateFrom(d.dateFrom)
              setDateTo(d.dateTo)
            }}
            className="border-[var(--st-border)] text-[var(--st-muted)] hover:bg-[var(--st-surface-hover)]"
          >
            Year to Date
          </Button>
        </div>
        <div className="flex items-end">
          <Button onClick={handleExportCSV} disabled={!data} className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-[var(--st-muted)]">Loading...</div>}
      {error && <div className="text-center py-8 text-[var(--st-color-danger)]">Error loading report</div>}

      {data && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
              <div className="text-sm text-[var(--st-muted)]">Total Giving</div>
              <div className="text-3xl font-bold text-[var(--st-color-success)]">{formatCents(data.totalCents)}</div>
            </div>
            <div className="p-4 bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
              <div className="text-sm text-[var(--st-muted)]">Total Donations</div>
              <div className="text-3xl font-bold text-[var(--st-fg)]">{data.totalDonations}</div>
            </div>
          </div>

          {/* Fund Breakdown Table */}
          <div className="border border-[var(--st-border)] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)]">
                  <TableHead className="text-[var(--st-muted)]">Fund</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Donations</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.fundTotals.length === 0 ? (
                  <TableRow className="border-[var(--st-border)]">
                    <TableCell colSpan={3} className="text-center py-8 text-[var(--st-muted)]">
                      No donations found in this date range
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.fundTotals.map((fund) => (
                      <TableRow key={fund.fundId || 'undesignated'} className="border-[var(--st-border)]">
                        <TableCell className="font-medium text-[var(--st-fg)]">{fund.fundName}</TableCell>
                        <TableCell className="text-right text-[var(--st-muted)]">{fund.donationCount}</TableCell>
                        <TableCell className="text-right text-[var(--st-fg)]">{formatCents(fund.totalCents)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-[var(--st-surface-muted)] border-[var(--st-border)]">
                      <TableCell className="text-[var(--st-fg)]">TOTAL</TableCell>
                      <TableCell className="text-right text-[var(--st-muted)]">{data.totalDonations}</TableCell>
                      <TableCell className="text-right text-[var(--st-color-success)]">{formatCents(data.totalCents)}</TableCell>
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
