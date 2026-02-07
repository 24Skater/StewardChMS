import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useHouseholds,
  useCreateHousehold,
  useDeleteHousehold,
} from '@/hooks/useHouseholds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { downloadCSV, generateExportFilename, formatDate } from '@/lib/csv'

function HouseholdsPage() {
  const { data, isLoading, error } = useHouseholds()
  const createMutation = useCreateHousehold()
  const deleteMutation = useDeleteHousehold()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newHouseholdName, setNewHouseholdName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const handleExport = () => {
    if (!data?.households) return

    const headers = [
      'Household Name',
      'Member Count',
      'Members',
      'Created At',
    ]

    const rows = data.households.map(household => {
      const displayName = household.name || 
        (household.members.length > 0
          ? `${household.members[0].lastName} Household`
          : 'Unnamed Household')
      
      const membersList = household.members
        .map(m => `${m.firstName} ${m.lastName} (${m.relationshipType})`)
        .join('; ')

      return [
        displayName,
        household.members.length.toString(),
        membersList,
        formatDate(household.createdAt),
      ]
    })

    downloadCSV(generateExportFilename('households'), headers, rows)
  }

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({ name: newHouseholdName || null })
      setShowCreateDialog(false)
      setNewHouseholdName('')
    } catch (error) {
      console.error('Failed to create household:', error)
    }
  }

  const handleDelete = async (id: string, name: string | null) => {
    if (window.confirm(`Are you sure you want to delete the household "${name || 'Unnamed'}"? This will NOT delete the members, only the household grouping.`)) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete household:', error)
      }
    }
  }

  const getRelationshipBadge = (type: string) => {
    switch (type) {
      case 'parent':
        return <Badge className="bg-[var(--st-primary)]/20 text-[var(--st-primary)] border-0">Parent</Badge>
      case 'spouse':
        return <Badge className="bg-[var(--st-color-success)]/20 text-[var(--st-color-success)] border-0">Spouse</Badge>
      case 'child':
        return <Badge className="bg-[var(--st-color-warning)]/20 text-[var(--st-color-warning)] border-0">Child</Badge>
      default:
        return <Badge className="bg-[var(--st-muted)]/20 text-[var(--st-muted)] border-0">Other</Badge>
    }
  }

  // Filter households by search query
  const filteredHouseholds = data?.households.filter((household) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    
    // Search by household name
    if (household.name?.toLowerCase().includes(query)) return true
    
    // Search by member names
    return household.members.some(
      (m) => 
        m.firstName.toLowerCase().includes(query) ||
        m.lastName.toLowerCase().includes(query)
    )
  }) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--st-muted)]">Loading households...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--st-color-danger)]">Error loading households</h1>
          <p className="mt-2 text-[var(--st-muted)]">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--st-fg)]">Households</h1>
          <p className="text-[var(--st-muted)]">
            Manage family units and member relationships
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!data?.households.length}
            className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
          >
            Export CSV
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]">
                + New Household
              </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--st-fg)]">Create Household</DialogTitle>
              <DialogDescription className="text-[var(--st-muted)]">
                Create a new household to group family members together.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="householdName" className="text-[var(--st-fg)]">
                  Household Name (optional)
                </Label>
                <Input
                  id="householdName"
                  value={newHouseholdName}
                  onChange={(e) => setNewHouseholdName(e.target.value)}
                  placeholder="e.g., The Smith Family"
                  className="mt-1 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                />
                <p className="mt-1 text-xs text-[var(--st-muted)]">
                  If left blank, the household will be named after its members.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="border-[var(--st-border)] text-[var(--st-fg)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Household'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--st-muted)]">
              Total Households
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--st-fg)]">
              {data?.total || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--st-muted)]">
              Total Members in Households
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--st-fg)]">
              {data?.households.reduce((sum, h) => sum + h.members.length, 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--st-muted)]">
              Avg. Household Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--st-fg)]">
              {data?.total
                ? (data.households.reduce((sum, h) => sum + h.members.length, 0) / data.total).toFixed(1)
                : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search households or members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
        />
      </div>

      {/* Households Table */}
      <Card className="bg-[var(--st-surface)] border-[var(--st-border)]">
        <CardContent className="p-0">
          {filteredHouseholds.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[var(--st-muted)]">
                {searchQuery ? 'No households match your search.' : 'No households yet. Create one to get started.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)] hover:bg-transparent">
                  <TableHead className="text-[var(--st-muted)]">Household</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Members</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Size</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHouseholds.map((household) => {
                  // Generate display name from members if no name set
                  const displayName = household.name || 
                    (household.members.length > 0
                      ? `${household.members[0].lastName} Household`
                      : 'Unnamed Household')

                  return (
                    <TableRow key={household.id} className="border-[var(--st-border)]">
                      <TableCell>
                        <Link
                          to={`/households/${household.id}`}
                          className="font-medium text-[var(--st-fg)] hover:text-[var(--st-link)]"
                        >
                          {displayName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {household.members.length === 0 ? (
                            <span className="text-[var(--st-muted)] text-sm">No members</span>
                          ) : (
                            household.members.slice(0, 4).map((member) => (
                              <div key={member.id} className="flex items-center gap-1">
                                <Link
                                  to={`/members/${member.memberId}`}
                                  className="text-sm text-[var(--st-fg)] hover:text-[var(--st-link)]"
                                >
                                  {member.firstName} {member.lastName}
                                </Link>
                                {getRelationshipBadge(member.relationshipType)}
                              </div>
                            ))
                          )}
                          {household.members.length > 4 && (
                            <span className="text-sm text-[var(--st-muted)]">
                              +{household.members.length - 4} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[var(--st-fg)]">{household.members.length}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                          >
                            <Link to={`/households/${household.id}`}>Manage</Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(household.id, household.name)}
                            disabled={deleteMutation.isPending}
                            className="text-[var(--st-color-danger)] hover:text-[var(--st-color-danger)] hover:bg-[var(--st-color-danger)]/10"
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-[var(--st-surface)]/50 border-[var(--st-border)]">
        <CardContent className="py-4">
          <h3 className="font-medium text-[var(--st-fg)] mb-2">💡 How Households Work</h3>
          <ul className="text-sm text-[var(--st-muted)] space-y-1 list-disc list-inside">
            <li>Households group family members together (parents, children, spouses)</li>
            <li>Each member can have a relationship type within the household</li>
            <li>Click "Manage" to add/remove members and update relationships</li>
            <li>Deleting a household only removes the grouping—members remain in the system</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default HouseholdsPage

