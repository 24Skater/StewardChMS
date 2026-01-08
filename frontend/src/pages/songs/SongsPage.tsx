import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSongs, useDeleteSong } from '../../hooks/useSongs'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'

export default function SongsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useSongs({
    search: search || undefined,
    page,
    limit: 20,
  })

  const deleteMutation = useDeleteSong()

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return

    try {
      await deleteMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to delete song:', error)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Song Library</h1>
        <Link to="/songs/new">
          <Button>Add Song</Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Search by title or artist..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="max-w-md"
            />
            {search && (
              <Button variant="outline" onClick={() => setSearch('')}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
          Error loading songs: {error.message}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8 text-gray-500">Loading songs...</div>
      )}

      {/* Songs table */}
      {data && (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>BPM</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.songs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No songs found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.songs.map((song) => (
                    <TableRow key={song.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/songs/${song.id}/edit`}
                          className="text-blue-600 hover:underline"
                        >
                          {song.title}
                        </Link>
                      </TableCell>
                      <TableCell>{song.artist || '-'}</TableCell>
                      <TableCell>{song.defaultKey || '-'}</TableCell>
                      <TableCell>{song.bpm || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/songs/${song.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(song.id, song.title)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

