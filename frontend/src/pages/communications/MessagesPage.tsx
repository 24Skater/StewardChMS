import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMessages } from '../../hooks/useCommunications'
import { Button } from '../../components/ui/button'
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
import { Badge } from '../../components/ui/badge'
import { MessageChannel } from '../../lib/api'

export default function MessagesPage() {
  const [page, setPage] = useState(1)
  const [channelFilter, setChannelFilter] = useState<MessageChannel | ''>('')
  
  const { data, isLoading, error } = useMessages({
    channel: channelFilter || undefined,
    page,
    limit: 20,
  })

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse text-[var(--st-muted)]">Loading messages...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-[var(--st-color-danger)]">Error loading messages</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">Communications</h1>
        <div className="flex gap-2">
          <Link to="/communications/templates">
            <Button variant="outline" className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]">Manage Templates</Button>
          </Link>
          <Link to="/communications/new">
            <Button className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">Compose Message</Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <Select
          value={channelFilter || 'all'}
          onValueChange={(value) => {
            setChannelFilter(value === 'all' ? '' : value as MessageChannel)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px] bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
            <SelectValue placeholder="All channels" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
            <SelectItem value="all" className="text-[var(--st-fg)]">All channels</SelectItem>
            <SelectItem value="email" className="text-[var(--st-fg)]">Email</SelectItem>
            <SelectItem value="sms" className="text-[var(--st-fg)]">SMS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data?.messages.length === 0 ? (
        <div className="text-center py-8 text-[var(--st-muted)]">
          No messages sent yet. Compose your first message to get started.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--st-border)]">
                <TableHead className="text-[var(--st-muted)]">Date</TableHead>
                <TableHead className="text-[var(--st-muted)]">Channel</TableHead>
                <TableHead className="text-[var(--st-muted)]">Subject / Preview</TableHead>
                <TableHead className="text-[var(--st-muted)]">Recipients</TableHead>
                <TableHead className="text-[var(--st-muted)]">Sent By</TableHead>
                <TableHead className="text-right text-[var(--st-muted)]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.messages.map((message) => (
                <TableRow key={message.id} className="border-[var(--st-border)]">
                  <TableCell className="text-[var(--st-fg)]">
                    {new Date(message.createdAt).toLocaleDateString()}{' '}
                    <span className="text-[var(--st-muted)]">
                      {new Date(message.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={message.channel === 'email' ? 'default' : 'secondary'} className={message.channel === 'email' ? 'bg-[var(--st-primary)]' : ''}>
                      {message.channel === 'email' ? 'Email' : 'SMS'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] text-[var(--st-fg)]">
                    {message.subject ? (
                      <div>
                        <div className="font-medium">{message.subject}</div>
                        <div className="text-sm text-[var(--st-muted)] truncate">
                          {message.body.substring(0, 50)}...
                        </div>
                      </div>
                    ) : (
                      <div className="truncate">
                        {message.body.substring(0, 80)}...
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-[var(--st-border)] text-[var(--st-fg)]">
                      {message._count?.recipients || 0} recipients
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[var(--st-muted)]">
                    {message.createdByUser?.name || message.createdByUser?.email || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/communications/${message.id}`}>
                      <Button variant="outline" size="sm" className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
              >
                Previous
              </Button>
              <span className="py-2 px-4 text-[var(--st-fg)]">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
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

