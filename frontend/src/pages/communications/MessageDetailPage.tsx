import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMessage, useMessageRecipients, useMessageStats } from '../../hooks/useCommunications'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { DeliveryStatus } from '../../lib/api'

export default function MessageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('')
  const [page, setPage] = useState(1)

  const { data: message, isLoading: messageLoading } = useMessage(id || '')
  const { data: stats } = useMessageStats(id || '')
  const { data: recipients, isLoading: recipientsLoading } = useMessageRecipients(
    id || '',
    { status: statusFilter || undefined, page, limit: 20 }
  )

  if (messageLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse text-[var(--st-muted)]">Loading message...</div>
      </div>
    )
  }

  if (!message) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-[var(--st-color-danger)]">Message not found</div>
      </div>
    )
  }

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-[var(--st-color-success)] text-white">Sent</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-[var(--st-color-warning)] text-black">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive" className="bg-[var(--st-color-danger)]">Failed</Badge>
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">Message Details</h1>
        <Link to="/communications">
          <Button variant="outline" className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]">Back to Messages</Button>
        </Link>
      </div>

      {/* Message Info */}
      <div className="bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-[var(--st-muted)]">Channel:</span>
            <Badge className="ml-2" variant={message.channel === 'email' ? 'default' : 'secondary'}>
              {message.channel === 'email' ? 'Email' : 'SMS'}
            </Badge>
          </div>
          <div>
            <span className="text-[var(--st-muted)]">Sent:</span>
            <span className="ml-2 text-[var(--st-fg)]">
              {new Date(message.createdAt).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[var(--st-muted)]">Sent By:</span>
            <span className="ml-2 text-[var(--st-fg)]">
              {message.createdByUser?.name || message.createdByUser?.email || 'Unknown'}
            </span>
          </div>
          {message.subject && (
            <div>
              <span className="text-[var(--st-muted)]">Subject:</span>
              <span className="ml-2 font-medium text-[var(--st-fg)]">{message.subject}</span>
            </div>
          )}
        </div>
        
        <div>
          <span className="text-[var(--st-muted)] block mb-2">Message:</span>
          <div className="bg-[var(--st-surface-muted)] border border-[var(--st-border)] p-4 rounded whitespace-pre-wrap text-[var(--st-fg)]">
            {message.body}
          </div>
        </div>
      </div>

      {/* Delivery Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[var(--st-fg)]">{stats.total}</div>
            <div className="text-[var(--st-muted)]">Total</div>
          </div>
          <div className="bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[var(--st-color-success)]">{stats.sent}</div>
            <div className="text-[var(--st-muted)]">Sent</div>
          </div>
          <div className="bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[var(--st-color-warning)]">{stats.pending}</div>
            <div className="text-[var(--st-muted)]">Pending</div>
          </div>
          <div className="bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[var(--st-color-danger)]">{stats.failed}</div>
            <div className="text-[var(--st-muted)]">Failed</div>
          </div>
        </div>
      )}

      {/* Recipients */}
      <div className="bg-[var(--st-surface)] border border-[var(--st-border)] rounded-lg">
        <div className="p-4 border-b border-[var(--st-border)] flex justify-between items-center">
          <h2 className="text-xl font-semibold text-[var(--st-fg)]">Recipients</h2>
          <Select
            value={statusFilter || 'all'}
            onValueChange={(value) => {
              setStatusFilter(value === 'all' ? '' : value as DeliveryStatus)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[180px] bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
              <SelectItem value="all" className="text-[var(--st-fg)]">All statuses</SelectItem>
              <SelectItem value="sent" className="text-[var(--st-fg)]">Sent</SelectItem>
              <SelectItem value="pending" className="text-[var(--st-fg)]">Pending</SelectItem>
              <SelectItem value="failed" className="text-[var(--st-fg)]">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {recipientsLoading ? (
          <div className="p-4 animate-pulse text-[var(--st-muted)]">Loading recipients...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)]">
                  <TableHead className="text-[var(--st-muted)]">Recipient</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Contact</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Status</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Delivered At</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients?.recipients.map((recipient) => (
                  <TableRow key={recipient.id} className="border-[var(--st-border)]">
                    <TableCell>
                      {recipient.member ? (
                        <Link 
                          to={`/members/${recipient.member.id}`}
                          className="text-[var(--st-primary)] hover:underline"
                        >
                          {recipient.member.firstName} {recipient.member.lastName}
                        </Link>
                      ) : recipient.guestContact?.name ? (
                        <span className="text-[var(--st-fg)]">{recipient.guestContact.name}</span>
                      ) : (
                        <span className="text-[var(--st-muted)]">Guest</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[var(--st-muted)]">
                      {message.channel === 'email'
                        ? recipient.member?.email || recipient.guestContact?.email
                        : recipient.member?.phone || recipient.guestContact?.phone}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(recipient.deliveryStatus)}
                    </TableCell>
                    <TableCell className="text-[var(--st-fg)]">
                      {recipient.deliveredAt
                        ? new Date(recipient.deliveredAt).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-[var(--st-color-danger)] max-w-[200px] truncate">
                      {recipient.errorMessage || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {recipients && recipients.totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t border-[var(--st-border)]">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                >
                  Previous
                </Button>
                <span className="py-2 px-4 text-[var(--st-fg)]">
                  Page {page} of {recipients.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(recipients.totalPages, p + 1))}
                  disabled={page === recipients.totalPages}
                  className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

