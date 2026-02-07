import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  useMinistries,
  useCreateMinistry,
  useUpdateMinistry,
  useDeleteMinistry,
} from '@/hooks/useMinistries'
import {
  useGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
} from '@/hooks/useGroups'

// Schemas
const ministrySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true),
})

const groupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ministryId: z.string().min(1, 'Ministry is required'),
  description: z.string().optional(),
  meetingDay: z.string().optional(),
  meetingTime: z.string().optional(),
  location: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().default(true),
})

type MinistryFormData = z.infer<typeof ministrySchema>
type GroupFormData = z.infer<typeof groupSchema>

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function GroupsPage() {
  const [activeTab, setActiveTab] = useState<'ministries' | 'groups'>('ministries')
  const [ministryDialogOpen, setMinistryDialogOpen] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingMinistry, setEditingMinistry] = useState<string | null>(null)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [selectedMinistry, setSelectedMinistry] = useState<string>('all')

  // Data queries
  const { data: ministries, isLoading: ministriesLoading } = useMinistries()
  const { data: groups, isLoading: groupsLoading } = useGroups(
    selectedMinistry === 'all' ? undefined : { ministryId: selectedMinistry }
  )

  // Mutations
  const createMinistryMutation = useCreateMinistry()
  const updateMinistryMutation = useUpdateMinistry()
  const deleteMinistryMutation = useDeleteMinistry()
  const createGroupMutation = useCreateGroup()
  const updateGroupMutation = useUpdateGroup()
  const deleteGroupMutation = useDeleteGroup()

  // Ministry form
  const ministryForm = useForm<MinistryFormData>({
    resolver: zodResolver(ministrySchema),
    defaultValues: {
      name: '',
      description: '',
      parentId: undefined,
      isActive: true,
    },
  })

  // Group form
  const groupForm = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      ministryId: '',
      description: '',
      meetingDay: '',
      meetingTime: '',
      location: '',
      capacity: undefined,
      isActive: true,
    },
  })

  // Ministry handlers
  const handleMinistrySubmit = async (data: MinistryFormData) => {
    try {
      if (editingMinistry) {
        await updateMinistryMutation.mutateAsync({ id: editingMinistry, ...data })
      } else {
        await createMinistryMutation.mutateAsync(data)
      }
      setMinistryDialogOpen(false)
      setEditingMinistry(null)
      ministryForm.reset()
    } catch {
      // Error handled by mutation
    }
  }

  const handleEditMinistry = (ministry: { id: string; name: string; description: string | null; parentId: string | null; isActive: boolean }) => {
    setEditingMinistry(ministry.id)
    ministryForm.reset({
      name: ministry.name,
      description: ministry.description || '',
      parentId: ministry.parentId || undefined,
      isActive: ministry.isActive,
    })
    setMinistryDialogOpen(true)
  }

  const handleDeleteMinistry = async (id: string) => {
    if (confirm('Are you sure you want to delete this ministry?')) {
      try {
        await deleteMinistryMutation.mutateAsync(id)
      } catch {
        // Error handled by mutation
      }
    }
  }

  // Group handlers
  const handleGroupSubmit = async (data: GroupFormData) => {
    try {
      if (editingGroup) {
        await updateGroupMutation.mutateAsync({ id: editingGroup, ...data })
      } else {
        await createGroupMutation.mutateAsync(data)
      }
      setGroupDialogOpen(false)
      setEditingGroup(null)
      groupForm.reset()
    } catch {
      // Error handled by mutation
    }
  }

  const handleEditGroup = (group: { id: string; name: string; ministryId: string; description: string | null; meetingDay: string | null; meetingTime: string | null; location: string | null; capacity: number | null; isActive: boolean }) => {
    setEditingGroup(group.id)
    groupForm.reset({
      name: group.name,
      ministryId: group.ministryId,
      description: group.description || '',
      meetingDay: group.meetingDay || '',
      meetingTime: group.meetingTime || '',
      location: group.location || '',
      capacity: group.capacity || undefined,
      isActive: group.isActive,
    })
    setGroupDialogOpen(true)
  }

  const handleDeleteGroup = async (id: string) => {
    if (confirm('Are you sure you want to delete this group?')) {
      try {
        await deleteGroupMutation.mutateAsync(id)
      } catch {
        // Error handled by mutation
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="border-b border-[#334155] bg-[#1E293B]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-2xl font-bold text-white">Groups & Ministries</h1>
          <p className="text-sm text-[#94A3B8]">Manage your church's ministries and small groups</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'ministries' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('ministries')}
            className={activeTab === 'ministries' ? 'bg-[#2563EB]' : 'border-[#334155] text-[#CBD5E1]'}
          >
            Ministries
          </Button>
          <Button
            variant={activeTab === 'groups' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('groups')}
            className={activeTab === 'groups' ? 'bg-[#2563EB]' : 'border-[#334155] text-[#CBD5E1]'}
          >
            Groups
          </Button>
        </div>

        {/* Ministries Tab */}
        {activeTab === 'ministries' && (
          <Card className="border-[#334155] bg-[#1E293B]/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Ministries</CardTitle>
                <CardDescription className="text-[#94A3B8]">
                  Organize your church's ministry areas
                </CardDescription>
              </div>
              <Dialog open={ministryDialogOpen} onOpenChange={(open) => {
                setMinistryDialogOpen(open)
                if (!open) {
                  setEditingMinistry(null)
                  ministryForm.reset()
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-[#2563EB] hover:bg-[#3B82F6] text-white">
                    + Add Ministry
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1E293B] border-[#334155]">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {editingMinistry ? 'Edit Ministry' : 'New Ministry'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={ministryForm.handleSubmit(handleMinistrySubmit)} className="space-y-4">
                    <div>
                      <Label htmlFor="ministry-name" className="text-[#CBD5E1]">Name *</Label>
                      <Input
                        {...ministryForm.register('name')}
                        id="ministry-name"
                        className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                      />
                      {ministryForm.formState.errors.name && (
                        <p className="mt-1 text-sm text-[#DC2626]">{ministryForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="ministry-description" className="text-[#CBD5E1]">Description</Label>
                      <Textarea
                        {...ministryForm.register('description')}
                        id="ministry-description"
                        className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ministry-parent" className="text-[#CBD5E1]">Parent Ministry</Label>
                      <Select
                        value={ministryForm.watch('parentId') || 'none'}
                        onValueChange={(v) => ministryForm.setValue('parentId', v === 'none' ? undefined : v)}
                      >
                        <SelectTrigger className="mt-1 bg-[#1E293B] border-[#334155] text-white">
                          <SelectValue placeholder="None (Top-level)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Top-level)</SelectItem>
                          {ministries?.filter(m => m.id !== editingMinistry).map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMinistryDialogOpen(false)}
                        className="border-[#334155] text-[#CBD5E1]"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMinistryMutation.isPending || updateMinistryMutation.isPending}
                        className="bg-[#2563EB] hover:bg-[#3B82F6] text-white"
                      >
                        {editingMinistry ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {ministriesLoading ? (
                <p className="text-[#94A3B8]">Loading...</p>
              ) : ministries?.length === 0 ? (
                <p className="text-[#94A3B8]">No ministries yet. Create one to get started.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#334155]">
                      <TableHead className="text-[#94A3B8]">Name</TableHead>
                      <TableHead className="text-[#94A3B8]">Parent</TableHead>
                      <TableHead className="text-[#94A3B8]">Groups</TableHead>
                      <TableHead className="text-[#94A3B8]">Status</TableHead>
                      <TableHead className="text-[#94A3B8]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ministries?.map((ministry) => (
                      <TableRow key={ministry.id} className="border-[#334155]">
                        <TableCell className="text-white font-medium">{ministry.name}</TableCell>
                        <TableCell className="text-[#94A3B8]">{ministry.parent?.name || '—'}</TableCell>
                        <TableCell className="text-[#94A3B8]">{ministry._count?.groups || 0}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${ministry.isActive ? 'bg-[#16A34A]/20 text-[#16A34A]' : 'bg-[#64748B]/20 text-[#64748B]'}`}>
                            {ministry.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditMinistry(ministry)}
                              className="border-[#334155] text-[#CBD5E1] text-xs"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteMinistry(ministry.id)}
                              disabled={deleteMinistryMutation.isPending}
                              className="text-xs"
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <Card className="border-[#334155] bg-[#1E293B]/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Groups</CardTitle>
                <CardDescription className="text-[#94A3B8]">
                  Small groups and teams within ministries
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={selectedMinistry} onValueChange={setSelectedMinistry}>
                  <SelectTrigger className="w-48 bg-[#1E293B] border-[#334155] text-white">
                    <SelectValue placeholder="Filter by ministry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ministries</SelectItem>
                    {ministries?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={groupDialogOpen} onOpenChange={(open) => {
                  setGroupDialogOpen(open)
                  if (!open) {
                    setEditingGroup(null)
                    groupForm.reset()
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#2563EB] hover:bg-[#3B82F6] text-white">
                      + Add Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1E293B] border-[#334155] max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-white">
                        {editingGroup ? 'Edit Group' : 'New Group'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={groupForm.handleSubmit(handleGroupSubmit)} className="space-y-4">
                      <div>
                        <Label htmlFor="group-name" className="text-[#CBD5E1]">Name *</Label>
                        <Input
                          {...groupForm.register('name')}
                          id="group-name"
                          className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                        />
                        {groupForm.formState.errors.name && (
                          <p className="mt-1 text-sm text-[#DC2626]">{groupForm.formState.errors.name.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="group-ministry" className="text-[#CBD5E1]">Ministry *</Label>
                        <Select
                          value={groupForm.watch('ministryId')}
                          onValueChange={(v) => groupForm.setValue('ministryId', v)}
                        >
                          <SelectTrigger className="mt-1 bg-[#1E293B] border-[#334155] text-white">
                            <SelectValue placeholder="Select ministry" />
                          </SelectTrigger>
                          <SelectContent>
                            {ministries?.map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {groupForm.formState.errors.ministryId && (
                          <p className="mt-1 text-sm text-[#DC2626]">{groupForm.formState.errors.ministryId.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="group-description" className="text-[#CBD5E1]">Description</Label>
                        <Textarea
                          {...groupForm.register('description')}
                          id="group-description"
                          className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="group-day" className="text-[#CBD5E1]">Meeting Day</Label>
                          <Select
                            value={groupForm.watch('meetingDay') || 'none'}
                            onValueChange={(v) => groupForm.setValue('meetingDay', v === 'none' ? '' : v)}
                          >
                            <SelectTrigger className="mt-1 bg-[#1E293B] border-[#334155] text-white">
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Not specified</SelectItem>
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem key={day} value={day}>{day}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="group-time" className="text-[#CBD5E1]">Meeting Time</Label>
                          <Input
                            {...groupForm.register('meetingTime')}
                            id="group-time"
                            className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                            placeholder="7:00 PM"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="group-location" className="text-[#CBD5E1]">Location</Label>
                          <Input
                            {...groupForm.register('location')}
                            id="group-location"
                            className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                            placeholder="Room 101"
                          />
                        </div>
                        <div>
                          <Label htmlFor="group-capacity" className="text-[#CBD5E1]">Capacity</Label>
                          <Input
                            {...groupForm.register('capacity')}
                            id="group-capacity"
                            type="number"
                            className="mt-1 bg-[#1E293B] border-[#334155] text-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setGroupDialogOpen(false)}
                          className="border-[#334155] text-[#CBD5E1]"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                          className="bg-[#2563EB] hover:bg-[#3B82F6] text-white"
                        >
                          {editingGroup ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <p className="text-[#94A3B8]">Loading...</p>
              ) : groups?.length === 0 ? (
                <p className="text-[#94A3B8]">No groups yet. Create one to get started.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#334155]">
                      <TableHead className="text-[#94A3B8]">Name</TableHead>
                      <TableHead className="text-[#94A3B8]">Ministry</TableHead>
                      <TableHead className="text-[#94A3B8]">Schedule</TableHead>
                      <TableHead className="text-[#94A3B8]">Members</TableHead>
                      <TableHead className="text-[#94A3B8]">Status</TableHead>
                      <TableHead className="text-[#94A3B8]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups?.map((group) => (
                      <TableRow key={group.id} className="border-[#334155]">
                        <TableCell className="text-white font-medium">{group.name}</TableCell>
                        <TableCell className="text-[#94A3B8]">{group.ministry?.name || '—'}</TableCell>
                        <TableCell className="text-[#94A3B8]">
                          {group.meetingDay ? `${group.meetingDay}${group.meetingTime ? ` @ ${group.meetingTime}` : ''}` : '—'}
                        </TableCell>
                        <TableCell className="text-[#94A3B8]">{group._count?.members || 0}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${group.isActive ? 'bg-[#16A34A]/20 text-[#16A34A]' : 'bg-[#64748B]/20 text-[#64748B]'}`}>
                            {group.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditGroup(group)}
                              className="border-[#334155] text-[#CBD5E1] text-xs"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteGroup(group.id)}
                              disabled={deleteGroupMutation.isPending}
                              className="text-xs"
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

export default GroupsPage

