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
import { MemberStatus } from '@/lib/api'

function MembersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  
  const search = searchParams.get('search') || undefined
  const status = (searchParams.get('status') as MemberStatus) || undefined
  const page = parseInt(searchParams.get('page') || '1', 10)

  const { data, isLoading, error } = useMembers({ search, status, page, limit: 20 })
  const deleteMutation = useDeleteMember()

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Members</h1>
            <p className="mt-1 text-slate-400">Manage church members and families</p>
          </div>
          <div className="flex gap-3">
            <Link to="/members/import">
              <Button variant="outline" className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700">
                Import CSV
              </Button>
            </Link>
            <Link to="/members/new">
              <Button className="bg-amber-500 text-slate-900 hover:bg-amber-400">
                Add Member
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <Input
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-md border-slate-600 bg-slate-800/50 text-white placeholder-slate-400"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          <Select value={status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40 border-slate-600 bg-slate-800/50 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-slate-600 bg-slate-800 text-white">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="visitor">Visitor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading members...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">Error loading members</div>
          ) : data?.members.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No members found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-300">Name</TableHead>
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Phone</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.members.map((member) => (
                  <TableRow key={member.id} className="border-slate-700">
                    <TableCell>
                      <Link
                        to={`/members/${member.id}`}
                        className="font-medium text-white hover:text-amber-400"
                      >
                        {member.firstName} {member.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {member.email || '—'}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {member.phone || '—'}
                    </TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link to={`/members/${member.id}`}>
                          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                            View
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
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
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total} members
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MembersPage

