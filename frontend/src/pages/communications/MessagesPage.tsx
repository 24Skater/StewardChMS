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
        <div className="animate-pulse">Loading messages...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-red-500">Error loading messages</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Communications</h1>
        <div className="flex gap-2">
          <Link to="/communications/templates">
            <Button variant="outline">Manage Templates</Button>
          </Link>
          <Link to="/communications/new">
            <Button>Compose Message</Button>
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data?.messages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No messages sent yet. Compose your first message to get started.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Subject / Preview</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Sent By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>
                    {new Date(message.createdAt).toLocaleDateString()}{' '}
                    <span className="text-muted-foreground">
                      {new Date(message.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={message.channel === 'email' ? 'default' : 'secondary'}>
                      {message.channel === 'email' ? '📧 Email' : '📱 SMS'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    {message.subject ? (
                      <div>
                        <div className="font-medium">{message.subject}</div>
                        <div className="text-sm text-muted-foreground truncate">
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
                    <Badge variant="outline">
                      {message._count?.recipients || 0} recipients
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {message.createdByUser?.name || message.createdByUser?.email || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/communications/${message.id}`}>
                      <Button variant="outline" size="sm">
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
              >
                Previous
              </Button>
              <span className="py-2 px-4">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
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

