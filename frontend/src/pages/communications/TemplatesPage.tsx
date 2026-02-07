import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMessageTemplates, useDeleteMessageTemplate } from '../../hooks/useCommunications'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog'
import { Badge } from '../../components/ui/badge'
import { MessageChannel } from '../../lib/api'

export default function TemplatesPage() {
  const [channelFilter, setChannelFilter] = useState<MessageChannel | ''>('')
  
  const { data, isLoading, error } = useMessageTemplates({
    channel: channelFilter || undefined,
  })
  
  const deleteMutation = useDeleteMessageTemplate()

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse text-[var(--st-muted)]">Loading templates...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-[var(--st-color-danger)]">Error loading templates</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">Message Templates</h1>
        <div className="flex gap-2">
          <Link to="/communications">
            <Button variant="outline" className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]">Back to Messages</Button>
          </Link>
          <Link to="/communications/templates/new">
            <Button className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">Create Template</Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <Select
          value={channelFilter || 'all'}
          onValueChange={(value) => setChannelFilter(value === 'all' ? '' : value as MessageChannel)}
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

      {data?.templates.length === 0 ? (
        <div className="text-center py-8 text-[var(--st-muted)]">
          No templates found. Create your first template to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--st-border)]">
              <TableHead className="text-[var(--st-muted)]">Name</TableHead>
              <TableHead className="text-[var(--st-muted)]">Channel</TableHead>
              <TableHead className="text-[var(--st-muted)]">Subject</TableHead>
              <TableHead className="text-[var(--st-muted)]">Updated</TableHead>
              <TableHead className="text-right text-[var(--st-muted)]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.templates.map((template) => (
              <TableRow key={template.id} className="border-[var(--st-border)]">
                <TableCell className="font-medium text-[var(--st-fg)]">{template.name}</TableCell>
                <TableCell>
                  <Badge variant={template.channel === 'email' ? 'default' : 'secondary'} className={template.channel === 'email' ? 'bg-[var(--st-primary)]' : ''}>
                    {template.channel === 'email' ? '📧 Email' : '📱 SMS'}
                  </Badge>
                </TableCell>
                <TableCell className="text-[var(--st-muted)]">
                  {template.subject || '(no subject)'}
                </TableCell>
                <TableCell className="text-[var(--st-fg)]">
                  {new Date(template.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link to={`/communications/templates/${template.id}/edit`}>
                      <Button variant="outline" size="sm" className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]">
                        Edit
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="bg-[var(--st-color-danger)]">
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-[var(--st-fg)]">Delete Template</AlertDialogTitle>
                          <AlertDialogDescription className="text-[var(--st-muted)]">
                            Are you sure you want to delete "{template.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(template.id)} className="bg-[var(--st-color-danger)]">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

