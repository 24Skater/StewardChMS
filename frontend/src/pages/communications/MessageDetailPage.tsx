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
        <div className="animate-pulse">Loading message...</div>
      </div>
    )
  }

  if (!message) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-red-500">Message not found</div>
      </div>
    )
  }

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500">Sent</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Message Details</h1>
        <Link to="/communications">
          <Button variant="outline">Back to Messages</Button>
        </Link>
      </div>

      {/* Message Info */}
      <div className="bg-card border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-muted-foreground">Channel:</span>
            <Badge className="ml-2" variant={message.channel === 'email' ? 'default' : 'secondary'}>
              {message.channel === 'email' ? '📧 Email' : '📱 SMS'}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Sent:</span>
            <span className="ml-2">
              {new Date(message.createdAt).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Sent By:</span>
            <span className="ml-2">
              {message.createdByUser?.name || message.createdByUser?.email || 'Unknown'}
            </span>
          </div>
          {message.subject && (
            <div>
              <span className="text-muted-foreground">Subject:</span>
              <span className="ml-2 font-medium">{message.subject}</span>
            </div>
          )}
        </div>
        
        <div>
          <span className="text-muted-foreground block mb-2">Message:</span>
          <div className="bg-muted p-4 rounded whitespace-pre-wrap">
            {message.body}
          </div>
        </div>
      </div>

      {/* Delivery Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-muted-foreground">Total</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.sent}</div>
            <div className="text-muted-foreground">Sent</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <div className="text-muted-foreground">Pending</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
            <div className="text-muted-foreground">Failed</div>
          </div>
        </div>
      )}

      {/* Recipients */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Recipients</h2>
          <Select
            value={statusFilter || 'all'}
            onValueChange={(value) => {
              setStatusFilter(value === 'all' ? '' : value as DeliveryStatus)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {recipientsLoading ? (
          <div className="p-4 animate-pulse">Loading recipients...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivered At</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients?.recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell>
                      {recipient.member ? (
                        <Link 
                          to={`/members/${recipient.member.id}`}
                          className="text-primary hover:underline"
                        >
                          {recipient.member.firstName} {recipient.member.lastName}
                        </Link>
                      ) : recipient.guestContact?.name ? (
                        <span>{recipient.guestContact.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Guest</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {message.channel === 'email'
                        ? recipient.member?.email || recipient.guestContact?.email
                        : recipient.member?.phone || recipient.guestContact?.phone}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(recipient.deliveryStatus)}
                    </TableCell>
                    <TableCell>
                      {recipient.deliveredAt
                        ? new Date(recipient.deliveredAt).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-red-500 max-w-[200px] truncate">
                      {recipient.errorMessage || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {recipients && recipients.totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="py-2 px-4">
                  Page {page} of {recipients.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(recipients.totalPages, p + 1))}
                  disabled={page === recipients.totalPages}
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

