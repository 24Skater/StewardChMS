import { Link, useParams, useNavigate } from 'react-router-dom'
import { useMember, useDeleteMember } from '@/hooks/useMembers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { MemberStatus } from '@/lib/api'

function MemberDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: member, isLoading, error } = useMember(id || '')
  const deleteMutation = useDeleteMember()

  const canViewNotes = user?.permissions.includes('members.notes') ?? false

  const handleDelete = async () => {
    if (!member) return
    if (window.confirm(`Are you sure you want to delete ${member.firstName} ${member.lastName}?`)) {
      await deleteMutation.mutateAsync(member.id)
      navigate('/members')
    }
  }

  const getStatusBadge = (status: MemberStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'visitor':
        return <Badge variant="warning">Visitor</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading member...</div>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Member not found</h1>
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">
                {member.firstName} {member.lastName}
              </h1>
              {getStatusBadge(member.status)}
            </div>
            <p className="mt-1 text-slate-400">
              Member since {new Date(member.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to={`/members/${member.id}/edit`}>
              <Button className="bg-amber-500 text-slate-900 hover:bg-amber-400">
                Edit Member
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleDelete}
              className="border-red-500/50 bg-transparent text-red-400 hover:bg-red-500/10"
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact Information */}
          <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-white">{member.email || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Phone</p>
                <p className="text-white">{member.phone || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Address</p>
                <p className="text-white">
                  {member.street || member.city || member.state || member.zip
                    ? [member.street, member.city, member.state, member.zip].filter(Boolean).join(', ')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Date of Birth</p>
                <p className="text-white">
                  {member.dateOfBirth
                    ? new Date(member.dateOfBirth).toLocaleDateString()
                    : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Households */}
          <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Households</CardTitle>
            </CardHeader>
            <CardContent>
              {member.households && member.households.length > 0 ? (
                <div className="space-y-3">
                  {member.households.map((hh) => (
                    <Link
                      key={hh.id}
                      to={`/households/${hh.householdId}`}
                      className="block rounded-lg border border-slate-700/50 bg-slate-700/30 p-3 hover:bg-slate-700/50"
                    >
                      <p className="font-medium text-white">
                        {hh.householdName || 'Unnamed Household'}
                      </p>
                      <p className="text-sm text-slate-400 capitalize">
                        {hh.relationshipType}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">Not linked to any household</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {canViewNotes && (
            <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">Notes (Private)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-slate-300">
                  {member.notes || 'No notes added'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

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

export default MemberDetailPage

