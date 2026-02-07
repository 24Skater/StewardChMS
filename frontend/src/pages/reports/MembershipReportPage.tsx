import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMembershipSummary } from '../../hooks/useReports'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { downloadCSV } from '../../lib/csv'
import { Download, ArrowLeft } from 'lucide-react'

function getDefaultDateRange() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  return {
    dateFrom: startOfYear.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
  }
}

export default function MembershipReportPage() {
  const defaults = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom)
  const [dateTo, setDateTo] = useState(defaults.dateTo)

  const { data, isLoading, error } = useMembershipSummary(dateFrom, dateTo)

  const handleExportCSV = () => {
    if (!data) return

    const headers = ['Metric', 'Value']
    const rows: [string, string][] = [
      ['Active Members', String(data.byStatus.active)],
      ['Inactive Members', String(data.byStatus.inactive)],
      ['Visitors', String(data.byStatus.visitor)],
      ['Total Members', String(data.totalMembers)],
      ['New Members (Period)', String(data.newMembersInPeriod)],
      ['Missing Email', String(data.missingFields.email)],
      ['Missing Phone', String(data.missingFields.phone)],
    ]

    downloadCSV(`membership-summary-${dateFrom}-to-${dateTo}.csv`, headers, rows)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/reports" className="inline-flex items-center text-blue-600 hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Reports
      </Link>

      <h1 className="text-2xl font-bold mb-6">Membership Summary</h1>

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
          {/* Status Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border rounded-lg">
              <div className="text-sm text-gray-500">Active</div>
              <div className="text-3xl font-bold text-green-600">{data.byStatus.active}</div>
            </div>
            <div className="p-4 bg-white border rounded-lg">
              <div className="text-sm text-gray-500">Inactive</div>
              <div className="text-3xl font-bold text-gray-600">{data.byStatus.inactive}</div>
            </div>
            <div className="p-4 bg-white border rounded-lg">
              <div className="text-sm text-gray-500">Visitors</div>
              <div className="text-3xl font-bold text-blue-600">{data.byStatus.visitor}</div>
            </div>
            <div className="p-4 bg-white border rounded-lg">
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-3xl font-bold">{data.totalMembers}</div>
            </div>
          </div>

          {/* New Members */}
          <div className="p-4 bg-white border rounded-lg">
            <h3 className="font-semibold mb-2">New Members in Period</h3>
            <div className="text-2xl font-bold text-green-600">{data.newMembersInPeriod}</div>
            <div className="text-sm text-gray-500">
              {dateFrom} to {dateTo}
            </div>
          </div>

          {/* Missing Fields */}
          <div className="p-4 bg-white border rounded-lg">
            <h3 className="font-semibold mb-4">Data Quality (Active Members)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Missing Email</div>
                <div className="text-xl font-semibold text-amber-600">{data.missingFields.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Missing Phone</div>
                <div className="text-xl font-semibold text-amber-600">{data.missingFields.phone}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


