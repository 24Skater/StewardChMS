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
import { PledgeStatus, getPledges } from '../../lib/api'
import { downloadCSV, generateExportFilename, formatCentsToDollars, formatDate as formatDateExport } from '@/lib/csv'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string | null): string {
  return dateStr ? new Date(dateStr).toLocaleDateString() : '-'
}

const statusColors: Record<PledgeStatus, string> = {
  active: 'bg-[var(--st-color-success)]/20 text-[var(--st-color-success)]',
  completed: 'bg-[var(--st-primary)]/20 text-[var(--st-primary)]',
  canceled: 'bg-[var(--st-border)] text-[var(--st-muted)]',
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
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const allData = await getPledges({
        limit: 10000,
        status: status || undefined,
        fundId: fundId || undefined,
      })

      const headers = [
        'Member',
        'Amount Pledged',
        'Amount Fulfilled',
        'Remaining',
        'Fund',
        'Status',
        'Start Date',
        'End Date',
        'Note',
      ]

      const rows = allData.pledges.map(pledge => [
        pledge.member ? `${pledge.member.firstName} ${pledge.member.lastName}` : 'Unknown',
        formatCentsToDollars(pledge.amountCents),
        '', // Fulfilled amount not in list response
        formatCentsToDollars(pledge.amountCents),
        pledge.fund?.name || 'General',
        pledge.status,
        formatDateExport(pledge.startDate),
        formatDateExport(pledge.endDate),
        '', // Note not in list response
      ])

      downloadCSV(generateExportFilename('pledges'), headers, rows)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export pledges. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this pledge?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (error) {
    return <div className="p-4 text-[var(--st-color-danger)]">Error loading pledges</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Pledges</h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Link to="/pledges/new">
            <Button className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">Add Pledge</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[var(--st-surface)] rounded-lg border border-[var(--st-border)]">
        <div>
          <Label className="text-[var(--st-muted)]">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as PledgeStatus | '')}>
            <SelectTrigger className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
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
              setStatus('')
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
                  <TableHead className="text-[var(--st-muted)]">Member</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Amount</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Fund</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Start Date</TableHead>
                  <TableHead className="text-[var(--st-muted)]">End Date</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Status</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.pledges.map((pledge) => (
                  <TableRow key={pledge.id} className="border-[var(--st-border)]">
                    <TableCell className="text-[var(--st-fg)]">
                      {pledge.member
                        ? `${pledge.member.firstName} ${pledge.member.lastName}`
                        : '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-[var(--st-color-success)]">
                      {formatCents(pledge.amountCents)}
                    </TableCell>
                    <TableCell className="text-[var(--st-muted)]">{pledge.fund?.name || 'Undesignated'}</TableCell>
                    <TableCell className="text-[var(--st-fg)]">{formatDate(pledge.startDate)}</TableCell>
                    <TableCell className="text-[var(--st-fg)]">{formatDate(pledge.endDate)}</TableCell>
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
                          <Button variant="outline" size="sm" className="border-[var(--st-border)] text-[var(--st-fg)]">
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
                  <TableRow className="border-[var(--st-border)]">
                    <TableCell colSpan={7} className="text-center py-8 text-[var(--st-muted)]">
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

