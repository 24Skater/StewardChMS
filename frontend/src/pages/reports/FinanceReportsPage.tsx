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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--st-fg)]">Finance Reports</h1>

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
        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const d = getDefaultDateRange()
              setDateFrom(d.dateFrom)
              setDateTo(d.dateTo)
            }}
            className="border-[var(--st-border)] text-[var(--st-mutedFg)]"
          >
            Year to Date
          </Button>
        </div>
      </div>

      <Tabs defaultValue="funds" className="space-y-4">
        <TabsList className="bg-[var(--st-surface)] border border-[var(--st-border)]">
          <TabsTrigger value="funds" className="data-[state=active]:bg-[var(--st-primary)] data-[state=active]:text-white">Fund Summary</TabsTrigger>
          <TabsTrigger value="giving" className="data-[state=active]:bg-[var(--st-primary)] data-[state=active]:text-white">Giving Summary</TabsTrigger>
          <TabsTrigger value="statement" className="data-[state=active]:bg-[var(--st-primary)] data-[state=active]:text-white">Donor Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="funds">
          {loadingFunds ? (
            <div className="text-center py-8 text-[var(--st-muted)]">Loading...</div>
          ) : fundSummary ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-[var(--st-border)] bg-[var(--st-surface)] rounded-lg p-4">
                  <div className="text-sm text-[var(--st-muted)]">Total Income</div>
                  <div className="text-2xl font-bold text-emerald-500">
                    {formatCents(fundSummary.totals.incomeCents)}
                  </div>
                </div>
                <div className="border border-[var(--st-border)] bg-[var(--st-surface)] rounded-lg p-4">
                  <div className="text-sm text-[var(--st-muted)]">Total Expenses</div>
                  <div className="text-2xl font-bold text-red-500">
                    {formatCents(fundSummary.totals.expensesCents)}
                  </div>
                </div>
                <div className="border border-[var(--st-border)] bg-[var(--st-surface)] rounded-lg p-4">
                  <div className="text-sm text-[var(--st-muted)]">Net</div>
                  <div
                    className={`text-2xl font-bold ${
                      fundSummary.totals.netCents >= 0 ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {formatCents(fundSummary.totals.netCents)}
                  </div>
                </div>
              </div>

              {/* Fund Details Table */}
              <div className="border border-[var(--st-border)] rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[var(--st-border)]">
                      <TableHead className="text-[var(--st-muted)]">Fund</TableHead>
                      <TableHead className="text-right text-[var(--st-muted)]">Income</TableHead>
                      <TableHead className="text-right text-[var(--st-muted)]">Expenses</TableHead>
                      <TableHead className="text-right text-[var(--st-muted)]">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fundSummary.funds.map((fund) => (
                      <TableRow key={fund.fundId || 'undesignated'} className="border-[var(--st-border)]">
                        <TableCell className="font-medium text-[var(--st-fg)]">
                          {fund.fundName || 'Undesignated'}
                        </TableCell>
                        <TableCell className="text-right text-emerald-500">
                          {formatCents(fund.incomeCents)}
                        </TableCell>
                        <TableCell className="text-right text-red-500">
                          {formatCents(fund.expensesCents)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            fund.netCents >= 0 ? 'text-emerald-500' : 'text-red-500'
                          }`}
                        >
                          {formatCents(fund.netCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {fundSummary.funds.length === 0 && (
                      <TableRow className="border-[var(--st-border)]">
                        <TableCell colSpan={4} className="text-center py-8 text-[var(--st-muted)]">
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
            <div className="text-center py-8 text-[var(--st-muted)]">Loading...</div>
          ) : givingSummary ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[var(--st-border)] bg-[var(--st-surface)] rounded-lg p-4">
                  <div className="text-sm text-[var(--st-muted)]">Total Donations</div>
                  <div className="text-2xl font-bold text-[var(--st-fg)]">
                    {givingSummary.totalDonations}
                  </div>
                </div>
                <div className="border border-[var(--st-border)] bg-[var(--st-surface)] rounded-lg p-4">
                  <div className="text-sm text-[var(--st-muted)]">Total Amount</div>
                  <div className="text-2xl font-bold text-emerald-500">
                    {formatCents(givingSummary.totalCents)}
                  </div>
                </div>
              </div>

              {/* Donors Table */}
              <div className="border border-[var(--st-border)] rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[var(--st-border)]">
                      <TableHead className="text-[var(--st-muted)]">Donor</TableHead>
                      <TableHead className="text-right text-[var(--st-muted)]">Donations</TableHead>
                      <TableHead className="text-right text-[var(--st-muted)]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {givingSummary.donors.map((donor, index) => (
                      <TableRow key={donor.memberId || `guest-${index}`} className="border-[var(--st-border)]">
                        <TableCell className="font-medium text-[var(--st-fg)]">
                          {donor.memberName || donor.guestName || 'Anonymous'}
                        </TableCell>
                        <TableCell className="text-right text-[var(--st-muted)]">
                          {donor.donationCount}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-500">
                          {formatCents(donor.totalCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {givingSummary.donors.length === 0 && (
                      <TableRow className="border-[var(--st-border)]">
                        <TableCell colSpan={3} className="text-center py-8 text-[var(--st-muted)]">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[var(--st-surfaceMuted)] rounded-lg border border-[var(--st-border)]">
              <div>
                <Label className="text-[var(--st-mutedFg)]">Select Member</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
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
                <Label className="text-[var(--st-mutedFg)]">Year</Label>
                <Select
                  value={statementYear.toString()}
                  onValueChange={(v) => setStatementYear(parseInt(v, 10))}
                >
                  <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
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
                  className="bg-[var(--st-primary)] text-white"
                >
                  Download PDF Statement
                </Button>
              </div>
            </div>

            {/* Statement Preview */}
            {selectedMemberId && (
              loadingStatement ? (
                <div className="text-center py-8 text-[var(--st-muted)]">Loading...</div>
              ) : donorStatement ? (
                <div className="space-y-6">
                  <div className="border border-[var(--st-border)] bg-[var(--st-surface)] rounded-lg p-4">
                    <h2 className="font-semibold text-[var(--st-fg)] mb-4">
                      Contribution Statement for {donorStatement.member.firstName}{' '}
                      {donorStatement.member.lastName}
                    </h2>
                    <div className="text-sm text-[var(--st-muted)] mb-4">
                      Year: {donorStatement.year}
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow className="border-[var(--st-border)]">
                          <TableHead className="text-[var(--st-muted)]">Date</TableHead>
                          <TableHead className="text-right text-[var(--st-muted)]">Amount</TableHead>
                          <TableHead className="text-[var(--st-muted)]">Method</TableHead>
                          <TableHead className="text-[var(--st-muted)]">Fund</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {donorStatement.donations.map((donation, idx) => (
                          <TableRow key={idx} className="border-[var(--st-border)]">
                            <TableCell className="text-[var(--st-fg)]">
                              {new Date(donation.receivedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right text-emerald-500">
                              {formatCents(donation.amountCents)}
                            </TableCell>
                            <TableCell className="capitalize text-[var(--st-muted)]">{donation.method}</TableCell>
                            <TableCell className="text-[var(--st-muted)]">{donation.fundName || 'General'}</TableCell>
                          </TableRow>
                        ))}
                        {donorStatement.donations.length === 0 && (
                          <TableRow className="border-[var(--st-border)]">
                            <TableCell colSpan={4} className="text-center py-8 text-[var(--st-muted)]">
                              No donations in this year
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    <div className="mt-4 pt-4 border-t border-[var(--st-border)] flex justify-between">
                      <span className="font-semibold text-[var(--st-fg)]">Total Contributions:</span>
                      <span className="font-bold text-emerald-500 text-lg">
                        {formatCents(donorStatement.totalCents)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null
            )}

            {!selectedMemberId && (
              <div className="text-center py-12 text-[var(--st-muted)]">
                Select a member to view their contribution statement
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
