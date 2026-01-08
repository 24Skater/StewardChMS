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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading household...</div>
      </div>
    )
  }

  if (error || !household) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Household not found</h1>
          <Link to="/members" className="mt-4 text-amber-400 hover:underline">
            Back to members
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            {isEditing ? (
              <div className="flex items-center gap-3">
                <Input
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="Household name"
                  className="w-64 border-slate-600 bg-slate-700/50 text-white"
                />
                <Button
                  size="sm"
                  onClick={handleUpdateName}
                  disabled={updateMutation.isPending}
                  className="bg-amber-500 text-slate-900"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">
                  {household.name || 'Unnamed Household'}
                </h1>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setHouseholdName(household.name || '')
                    setIsEditing(true)
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  Edit
                </Button>
              </div>
            )}
            <p className="mt-1 text-slate-400">
              Created {new Date(household.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="border-red-500/50 bg-transparent text-red-400 hover:bg-red-500/10"
          >
            Delete Household
          </Button>
        </div>

        {/* Members */}
        <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Household Members</CardTitle>
            <Button
              size="sm"
              onClick={() => setShowAddMember(!showAddMember)}
              className="bg-amber-500 text-slate-900 hover:bg-amber-400"
            >
              {showAddMember ? 'Cancel' : 'Add Member'}
            </Button>
          </CardHeader>
          <CardContent>
            {/* Add Member Form */}
            {showAddMember && (
              <div className="mb-6 rounded-lg border border-slate-700/50 bg-slate-700/30 p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label className="text-slate-300">Member</Label>
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                      <SelectTrigger className="mt-1 border-slate-600 bg-slate-700/50 text-white">
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent className="border-slate-600 bg-slate-800 text-white">
                        {availableMembers?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.firstName} {m.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Relationship</Label>
                    <Select
                      value={selectedRelationship}
                      onValueChange={(v) => setSelectedRelationship(v as RelationshipType)}
                    >
                      <SelectTrigger className="mt-1 border-slate-600 bg-slate-700/50 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-600 bg-slate-800 text-white">
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
                      className="bg-amber-500 text-slate-900 hover:bg-amber-400"
                    >
                      Add to Household
                    </Button>
                  </div>
                </div>
                {linkMutation.isError && (
                  <p className="mt-2 text-sm text-red-400">
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
                    className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-700/30 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <Link
                          to={`/members/${hm.memberId}`}
                          className="font-medium text-white hover:text-amber-400"
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
                      className="text-red-400 hover:text-red-300"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">No members in this household yet</p>
            )}
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="mt-8">
          <Link to="/members" className="text-amber-400 hover:underline">
            ← Back to members
          </Link>
        </div>
      </div>
    </div>
  )
}

export default HouseholdDetailPage

