import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDonations, useDeleteDonation, useFunds } from '../../hooks/useAccounting'
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

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

export default function DonationsPage() {
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [fundId, setFundId] = useState('')

  const { data: fundsData } = useFunds()
  const { data, isLoading, error } = useDonations({
    page,
    limit: 20,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    fundId: fundId || undefined,
  })

  const deleteMutation = useDeleteDonation()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this donation?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Donations</h1>
        <div className="p-6 rounded-lg border border-[var(--st-color-danger)]/30 bg-[var(--st-color-danger)]/10 text-[var(--st-color-danger)]">
          <p className="font-medium">Error loading donations</p>
          <p className="text-sm mt-1 opacity-80">Please try refreshing the page or logging out and back in.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Donations</h1>
        <Link to="/giving/new">
          <Button className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
            Add Donation
          </Button>
        </Link>
      </div>

      {/* Filters */}
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
        <div>
          <Label className="text-[var(--st-muted)]">Fund</Label>
          <Select value={fundId} onValueChange={setFundId}>
            <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
              <SelectValue placeholder="All Funds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Funds</SelectItem>
              {fundsData?.funds.map((fund) => (
                <SelectItem key={fund.id} value={fund.id}>
                  {fund.name}
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
            }}
            className="border-[var(--st-border)] text-[var(--st-muted)]"
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
                  <TableHead className="text-[var(--st-muted)]">Donor</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Amount</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Method</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Fund</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.donations.map((donation) => (
                  <TableRow key={donation.id} className="border-[var(--st-border)]">
                    <TableCell className="text-[var(--st-fg)]">{formatDate(donation.receivedAt)}</TableCell>
                    <TableCell className="text-[var(--st-fg)]">
                      {donation.member
                        ? `${donation.member.firstName} ${donation.member.lastName}`
                        : donation.guestName || 'Anonymous'}
                    </TableCell>
                    <TableCell className="font-semibold text-[var(--st-color-success)]">
                      {formatCents(donation.amountCents)}
                    </TableCell>
                    <TableCell className="capitalize text-[var(--st-muted)]">{donation.method}</TableCell>
                    <TableCell className="text-[var(--st-muted)]">{donation.fund?.name || 'Undesignated'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link to={`/giving/${donation.id}/edit`}>
                          <Button variant="outline" size="sm" className="border-[var(--st-border)] text-[var(--st-fg)]">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(donation.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.donations.length === 0 && (
                  <TableRow className="border-[var(--st-border)]">
                    <TableCell colSpan={6} className="text-center py-8 text-[var(--st-muted)]">
                      No donations found
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
