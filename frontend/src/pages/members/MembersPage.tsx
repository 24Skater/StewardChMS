import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMembers, useDeleteMember } from '@/hooks/useMembers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MemberStatus, getMembers, Member } from '@/lib/api'
import { downloadCSV, generateExportFilename, formatDate } from '@/lib/csv'

function MembersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  
  const search = searchParams.get('search') || undefined
  const status = (searchParams.get('status') as MemberStatus) || undefined
  const page = parseInt(searchParams.get('page') || '1', 10)

  const { data, isLoading, error } = useMembers({ search, status, page, limit: 20 })
  const deleteMutation = useDeleteMember()
  const [isExporting, setIsExporting] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (searchInput) {
      params.set('search', searchInput)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    setSearchParams(params)
  }

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'all') {
      params.set('status', value)
    } else {
      params.delete('status')
    }
    params.set('page', '1')
    setSearchParams(params)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    setSearchParams(params)
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMutation.mutate(id)
    }
  }

  const exportMembers = async (exportAll: boolean) => {
    setIsExporting(true)
    try {
      // Fetch all members or current filtered view
      let membersToExport: Member[]
      
      if (exportAll) {
        // Fetch all members (high limit to get everyone)
        const allData = await getMembers({ limit: 10000 })
        membersToExport = allData.members
      } else {
        // Export current filtered view
        const filteredData = await getMembers({ search, status, limit: 10000 })
        membersToExport = filteredData.members
      }

      // Define all exportable fields
      const headers = [
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Street',
        'City',
        'State',
        'ZIP',
        'Date of Birth',
        'Status',
        'Notes',
        'Household',
        'Created At',
        'Updated At',
      ]

      const rows = membersToExport.map(member => [
        member.firstName,
        member.lastName,
        member.email || '',
        member.phone || '',
        member.street || '',
        member.city || '',
        member.state || '',
        member.zip || '',
        formatDate(member.dateOfBirth),
        member.status,
        member.notes || '',
        member.households?.map(h => h.householdName || 'Unnamed').join('; ') || '',
        formatDate(member.createdAt),
        formatDate(member.updatedAt),
      ])

      const filename = generateExportFilename(exportAll ? 'members-all' : 'members-filtered')
      downloadCSV(filename, headers, rows)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export members. Please try again.')
    } finally {
      setIsExporting(false)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--st-fg)]">Members</h1>
          <p className="mt-1 text-[var(--st-muted)]">Manage church members and families</p>
        </div>
        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
              <DropdownMenuItem 
                onClick={() => exportMembers(true)}
                className="text-[var(--st-fg)] focus:bg-[var(--st-surface-hover)] cursor-pointer"
              >
                Export All Members
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => exportMembers(false)}
                className="text-[var(--st-fg)] focus:bg-[var(--st-surface-hover)] cursor-pointer"
              >
                Export Current View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/members/import">
            <Button variant="outline" className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]">
              Import CSV
            </Button>
          </Link>
          <Link to="/members/new">
            <Button className="bg-[var(--st-primary)] text-[var(--st-primaryFg)] hover:bg-[var(--st-primary-hover)]">
              Add Member
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-md border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)] placeholder-[var(--st-muted)]"
          />
          <Button type="submit" className="bg-[var(--st-primary)] text-[var(--st-primaryFg)] hover:bg-[var(--st-primary-hover)]">
            Search
          </Button>
        </form>
        <Select value={status || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40 border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="visitor">Visitor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)]/50">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--st-muted)]">Loading members...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">Error loading members</div>
        ) : data?.members.length === 0 ? (
          <div className="p-8 text-center text-[var(--st-muted)]">No members found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--st-border)] hover:bg-transparent">
                <TableHead className="text-[var(--st-muted)]">Name</TableHead>
                <TableHead className="text-[var(--st-muted)]">Email</TableHead>
                <TableHead className="text-[var(--st-muted)]">Phone</TableHead>
                <TableHead className="text-[var(--st-muted)]">Status</TableHead>
                <TableHead className="text-[var(--st-muted)]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.members.map((member) => (
                <TableRow key={member.id} className="border-[var(--st-border)]">
                  <TableCell>
                    <Link
                      to={`/members/${member.id}`}
                      className="font-medium text-[var(--st-fg)] hover:text-[var(--st-primary)]"
                    >
                      {member.firstName} {member.lastName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[var(--st-muted)]">
                    {member.email || '—'}
                  </TableCell>
                  <TableCell className="text-[var(--st-muted)]">
                    {member.phone || '—'}
                  </TableCell>
                  <TableCell>{getStatusBadge(member.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link to={`/members/${member.id}`}>
                        <Button size="sm" variant="ghost" className="text-[var(--st-muted)] hover:text-[var(--st-fg)]">
                          View
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-400"
                        onClick={() => handleDelete(member.id, `${member.firstName} ${member.lastName}`)}
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
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--st-muted)]">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total} members
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="border-[var(--st-border)] bg-transparent text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MembersPage
