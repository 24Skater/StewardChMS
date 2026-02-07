import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  useHousehold,
  useDeleteHousehold,
  useUpdateHousehold,
  useLinkMemberToHousehold,
  useUnlinkMemberFromHousehold,
} from '@/hooks/useHouseholds'
import { useMembers } from '@/hooks/useMembers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RelationshipType } from '@/lib/api'

function HouseholdDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: household, isLoading, error } = useHousehold(id || '')
  const { data: membersData } = useMembers({ limit: 100 })
  const deleteMutation = useDeleteHousehold()
  const updateMutation = useUpdateHousehold()
  const linkMutation = useLinkMemberToHousehold()
  const unlinkMutation = useUnlinkMemberFromHousehold()

  const [isEditing, setIsEditing] = useState(false)
  const [householdName, setHouseholdName] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipType>('parent')

  const handleDelete = async () => {
    if (!household) return
    if (window.confirm('Are you sure you want to delete this household?')) {
      await deleteMutation.mutateAsync(household.id)
      navigate('/members')
    }
  }

  const handleUpdateName = async () => {
    if (!household) return
    await updateMutation.mutateAsync({ id: household.id, data: { name: householdName || null } })
    setIsEditing(false)
  }

  const handleLinkMember = async () => {
    if (!household || !selectedMemberId) return
    await linkMutation.mutateAsync({
      householdId: household.id,
      memberId: selectedMemberId,
      relationshipType: selectedRelationship,
    })
    setShowAddMember(false)
    setSelectedMemberId('')
  }

  const handleUnlinkMember = async (memberId: string, memberName: string) => {
    if (!household) return
    if (window.confirm(`Remove ${memberName} from this household?`)) {
      await unlinkMutation.mutateAsync({ householdId: household.id, memberId })
    }
  }

  const getRelationshipBadge = (type: string) => {
    switch (type) {
      case 'parent':
        return <Badge variant="default">Parent</Badge>
      case 'spouse':
        return <Badge variant="success">Spouse</Badge>
      case 'child':
        return <Badge variant="warning">Child</Badge>
      default:
        return <Badge variant="secondary">Other</Badge>
    }
  }

  // Filter out members already in the household
  const availableMembers = membersData?.members.filter(
    (m) => !household?.members.some((hm) => hm.memberId === m.id)
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--st-muted)]">Loading household...</div>
      </div>
    )
  }

  if (error || !household) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">Household not found</h1>
          <Link to="/members" className="mt-4 text-[var(--st-link)] hover:underline">
            Back to members
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {isEditing ? (
            <div className="flex items-center gap-3">
              <Input
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Household name"
                className="w-64 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
              />
              <Button
                size="sm"
                onClick={handleUpdateName}
                disabled={updateMutation.isPending}
                className="bg-[var(--st-primary)] text-white"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                className="text-[var(--st-muted)]"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-[var(--st-fg)]">
                {household.name || 'Unnamed Household'}
              </h1>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setHouseholdName(household.name || '')
                  setIsEditing(true)
                }}
                className="text-[var(--st-muted)] hover:text-[var(--st-fg)]"
              >
                Edit
              </Button>
            </div>
          )}
          <p className="mt-1 text-[var(--st-muted)]">
            Created {new Date(household.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleDelete}
          className="border-red-500/50 bg-transparent text-red-500 hover:bg-red-500/10"
        >
          Delete Household
        </Button>
      </div>

      {/* Members */}
      <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[var(--st-fg)]">Household Members</CardTitle>
          <Button
            size="sm"
            onClick={() => setShowAddMember(!showAddMember)}
            className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]"
          >
            {showAddMember ? 'Cancel' : 'Add Member'}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Add Member Form */}
          {showAddMember && (
            <div className="mb-6 rounded-lg border border-[var(--st-border)] bg-[var(--st-surfaceMuted)] p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-[var(--st-fg)]">Member</Label>
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                      {availableMembers?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName} {m.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[var(--st-fg)]">Relationship</Label>
                  <Select
                    value={selectedRelationship}
                    onValueChange={(v) => setSelectedRelationship(v as RelationshipType)}
                  >
                    <SelectTrigger className="mt-1 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleLinkMember}
                    disabled={!selectedMemberId || linkMutation.isPending}
                    className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]"
                  >
                    Add to Household
                  </Button>
                </div>
              </div>
              {linkMutation.isError && (
                <p className="mt-2 text-sm text-red-500">
                  {linkMutation.error?.data?.error || 'Failed to add member'}
                </p>
              )}
            </div>
          )}

          {/* Members List */}
          {household.members.length > 0 ? (
            <div className="space-y-3">
              {household.members.map((hm) => (
                <div
                  key={hm.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--st-border)] bg-[var(--st-surfaceMuted)] p-4"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <Link
                        to={`/members/${hm.memberId}`}
                        className="font-medium text-[var(--st-fg)] hover:text-[var(--st-link)]"
                      >
                        {hm.firstName} {hm.lastName}
                      </Link>
                    </div>
                    {getRelationshipBadge(hm.relationshipType)}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnlinkMember(hm.memberId, `${hm.firstName} ${hm.lastName}`)}
                    className="text-red-500 hover:text-red-400"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--st-muted)]">No members in this household yet</p>
          )}
        </CardContent>
      </Card>

      {/* Back Link */}
      <div>
        <Link to="/members" className="text-[var(--st-link)] hover:underline">
          ← Back to members
        </Link>
      </div>
    </div>
  )
}

export default HouseholdDetailPage
