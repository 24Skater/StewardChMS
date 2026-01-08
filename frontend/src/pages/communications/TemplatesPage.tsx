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
        <div className="animate-pulse">Loading templates...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-red-500">Error loading templates</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Message Templates</h1>
        <div className="flex gap-2">
          <Link to="/communications">
            <Button variant="outline">Back to Messages</Button>
          </Link>
          <Link to="/communications/templates/new">
            <Button>Create Template</Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <Select
          value={channelFilter || 'all'}
          onValueChange={(value) => setChannelFilter(value === 'all' ? '' : value as MessageChannel)}
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

      {data?.templates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No templates found. Create your first template to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>
                  <Badge variant={template.channel === 'email' ? 'default' : 'secondary'}>
                    {template.channel === 'email' ? '📧 Email' : '📱 SMS'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {template.subject || '(no subject)'}
                </TableCell>
                <TableCell>
                  {new Date(template.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link to={`/communications/templates/${template.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{template.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(template.id)}>
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

