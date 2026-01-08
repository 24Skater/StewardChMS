import { useState } from 'react'
import { useFundsSummary, useGivingSummary, useDonorStatement } from '../../hooks/useAccounting'
import { useMembers } from '../../hooks/useMembers'
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs'
import { generateDonorStatementPDF } from '../../lib/pdf'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function getDefaultDateRange() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  return {
    dateFrom: startOfYear.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
  }
}

export default function FinanceReportsPage() {
  const defaults = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom)
  const [dateTo, setDateTo] = useState(defaults.dateTo)
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [statementYear, setStatementYear] = useState(new Date().getFullYear())

  const { data: fundSummary, isLoading: loadingFunds } = useFundsSummary(dateFrom, dateTo)
  const { data: givingSummary, isLoading: loadingGiving } = useGivingSummary(dateFrom, dateTo)
  const { data: membersData } = useMembers({ limit: 500 })
  const { data: donorStatement, isLoading: loadingStatement } = useDonorStatement(
    selectedMemberId,
    statementYear
  )

  const handleDownloadStatement = () => {
    if (donorStatement) {
      generateDonorStatementPDF(donorStatement)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Finance Reports</h1>

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
        <div className="flex items-end gap-2">
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
      </div>

      <Tabs defaultValue="funds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funds">Fund Summary</TabsTrigger>
          <TabsTrigger value="giving">Giving Summary</TabsTrigger>
          <TabsTrigger value="statement">Donor Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="funds">
          {loadingFunds ? (
            <div className="text-center py-8">Loading...</div>
          ) : fundSummary ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-gray-500">Total Income</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCents(fundSummary.totals.incomeCents)}
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-gray-500">Total Expenses</div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCents(fundSummary.totals.expensesCents)}
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-gray-500">Net</div>
                  <div
                    className={`text-2xl font-bold ${
                      fundSummary.totals.netCents >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCents(fundSummary.totals.netCents)}
                  </div>
                </div>
              </div>

              {/* Fund Details Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fund</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fundSummary.funds.map((fund) => (
                      <TableRow key={fund.fundId || 'undesignated'}>
                        <TableCell className="font-medium">
                          {fund.fundName || 'Undesignated'}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCents(fund.incomeCents)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCents(fund.expensesCents)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            fund.netCents >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCents(fund.netCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {fundSummary.funds.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No transactions in this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="giving">
          {loadingGiving ? (
            <div className="text-center py-8">Loading...</div>
          ) : givingSummary ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-gray-500">Total Donations</div>
                  <div className="text-2xl font-bold">
                    {givingSummary.totalDonations}
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-gray-500">Total Amount</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCents(givingSummary.totalCents)}
                  </div>
                </div>
              </div>

              {/* Donors Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Donor</TableHead>
                      <TableHead className="text-right">Donations</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {givingSummary.donors.map((donor, index) => (
                      <TableRow key={donor.memberId || `guest-${index}`}>
                        <TableCell className="font-medium">
                          {donor.memberName || donor.guestName || 'Anonymous'}
                        </TableCell>
                        <TableCell className="text-right">
                          {donor.donationCount}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCents(donor.totalCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {givingSummary.donors.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                          No donations in this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="statement">
          <div className="space-y-6">
            {/* Member and Year Selection */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label>Select Member</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {membersData?.members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.firstName} {member.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select
                  value={statementYear.toString()}
                  onValueChange={(v) => setStatementYear(parseInt(v, 10))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(5)].map((_, i) => {
                      const yr = new Date().getFullYear() - i
                      return (
                        <SelectItem key={yr} value={yr.toString()}>
                          {yr}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleDownloadStatement}
                  disabled={!selectedMemberId || loadingStatement || !donorStatement}
                >
                  Download PDF Statement
                </Button>
              </div>
            </div>

            {/* Statement Preview */}
            {selectedMemberId && (
              loadingStatement ? (
                <div className="text-center py-8">Loading...</div>
              ) : donorStatement ? (
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h2 className="font-semibold mb-4">
                      Contribution Statement for {donorStatement.member.firstName}{' '}
                      {donorStatement.member.lastName}
                    </h2>
                    <div className="text-sm text-gray-500 mb-4">
                      Year: {donorStatement.year}
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Fund</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {donorStatement.donations.map((donation, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {new Date(donation.receivedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCents(donation.amountCents)}
                            </TableCell>
                            <TableCell className="capitalize">{donation.method}</TableCell>
                            <TableCell>{donation.fundName || 'General'}</TableCell>
                          </TableRow>
                        ))}
                        {donorStatement.donations.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                              No donations in this year
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    <div className="mt-4 pt-4 border-t flex justify-between">
                      <span className="font-semibold">Total Contributions:</span>
                      <span className="font-bold text-green-600 text-lg">
                        {formatCents(donorStatement.totalCents)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null
            )}

            {!selectedMemberId && (
              <div className="text-center py-12 text-gray-500">
                Select a member to view their contribution statement
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

