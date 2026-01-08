import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePledges, useDeletePledge, useFunds } from '../../hooks/useAccounting'
import { Button } from '../../components/ui/button'
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
import { PledgeStatus } from '../../lib/api'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string | null): string {
  return dateStr ? new Date(dateStr).toLocaleDateString() : '-'
}

const statusColors: Record<PledgeStatus, string> = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  canceled: 'bg-gray-100 text-gray-800',
}

export default function PledgesPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<PledgeStatus | ''>('')
  const [fundId, setFundId] = useState('')

  const { data: fundsData } = useFunds()
  const { data, isLoading, error } = usePledges({
    page,
    limit: 20,
    status: status || undefined,
    fundId: fundId || undefined,
  })

  const deleteMutation = useDeletePledge()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this pledge?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (error) {
    return <div className="p-4 text-red-600">Error loading pledges</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pledges</h1>
        <Link to="/pledges/new">
          <Button>Add Pledge</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as PledgeStatus | '')}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
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
              setStatus('')
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
                  <TableHead>Member</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.pledges.map((pledge) => (
                  <TableRow key={pledge.id}>
                    <TableCell>
                      {pledge.member
                        ? `${pledge.member.firstName} ${pledge.member.lastName}`
                        : '-'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCents(pledge.amountCents)}
                    </TableCell>
                    <TableCell>{pledge.fund?.name || 'Undesignated'}</TableCell>
                    <TableCell>{formatDate(pledge.startDate)}</TableCell>
                    <TableCell>{formatDate(pledge.endDate)}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          statusColors[pledge.status]
                        }`}
                      >
                        {pledge.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link to={`/pledges/${pledge.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(pledge.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.pledges.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No pledges found
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

