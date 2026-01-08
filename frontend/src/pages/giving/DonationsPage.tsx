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
    return <div className="p-4 text-red-600">Error loading donations</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Donations</h1>
        <Link to="/giving/new">
          <Button>Add Donation</Button>
        </Link>
      </div>

      {/* Filters */}
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
        <div>
          <Label>Fund</Label>
          <Select value={fundId} onValueChange={setFundId}>
            <SelectTrigger>
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
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.donations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell>{formatDate(donation.receivedAt)}</TableCell>
                    <TableCell>
                      {donation.member
                        ? `${donation.member.firstName} ${donation.member.lastName}`
                        : donation.guestName || 'Anonymous'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCents(donation.amountCents)}
                    </TableCell>
                    <TableCell className="capitalize">{donation.method}</TableCell>
                    <TableCell>{donation.fund?.name || 'Undesignated'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link to={`/giving/${donation.id}/edit`}>
                          <Button variant="outline" size="sm">
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
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
              >
                Previous
              </Button>
              <span className="py-2 px-4">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === data.totalPages}
                onClick={() => setPage(page + 1)}
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

