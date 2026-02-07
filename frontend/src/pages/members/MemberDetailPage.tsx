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
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--st-muted)]">Loading member...</div>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">Member not found</h1>
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[var(--st-fg)]">
              {member.firstName} {member.lastName}
            </h1>
            {getStatusBadge(member.status)}
          </div>
          <p className="mt-1 text-[var(--st-muted)]">
            Member since {new Date(member.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to={`/members/${member.id}/edit`}>
            <Button className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]">
              Edit Member
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="border-red-500/50 bg-transparent text-red-500 hover:bg-red-500/10"
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Information */}
        <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
          <CardHeader>
            <CardTitle className="text-[var(--st-fg)]">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-[var(--st-muted)]">Email</p>
              <p className="text-[var(--st-fg)]">{member.email || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--st-muted)]">Phone</p>
              <p className="text-[var(--st-fg)]">{member.phone || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--st-muted)]">Address</p>
              <p className="text-[var(--st-fg)]">
                {member.street || member.city || member.state || member.zip
                  ? [member.street, member.city, member.state, member.zip].filter(Boolean).join(', ')
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--st-muted)]">Date of Birth</p>
              <p className="text-[var(--st-fg)]">
                {member.dateOfBirth
                  ? new Date(member.dateOfBirth).toLocaleDateString()
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Households */}
        <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
          <CardHeader>
            <CardTitle className="text-[var(--st-fg)]">Households</CardTitle>
          </CardHeader>
          <CardContent>
            {member.households && member.households.length > 0 ? (
              <div className="space-y-3">
                {member.households.map((hh) => (
                  <Link
                    key={hh.id}
                    to={`/households/${hh.householdId}`}
                    className="block rounded-lg border border-[var(--st-border)] bg-[var(--st-surfaceMuted)] p-3 hover:bg-[var(--st-surface-hover)]"
                  >
                    <p className="font-medium text-[var(--st-fg)]">
                      {hh.householdName || 'Unnamed Household'}
                    </p>
                    <p className="text-sm text-[var(--st-muted)] capitalize">
                      {hh.relationshipType}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[var(--st-muted)]">Not linked to any household</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {canViewNotes && (
          <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-[var(--st-fg)]">Notes (Private)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-[var(--st-fg)]">
                {member.notes || 'No notes added'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Back Link */}
      <div>
        <Link to="/members" className="text-[var(--st-link)] hover:underline">
          ← Back to members
        </Link>
      </div>
    </div>
  )
}

export default MemberDetailPage
