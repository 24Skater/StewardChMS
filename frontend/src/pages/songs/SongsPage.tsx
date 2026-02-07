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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">Song Library</h1>
        <Link to="/songs/new">
          <Button className="bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)]">
            Add Song
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
        <CardHeader>
          <CardTitle className="text-lg text-[var(--st-fg)]">Search</CardTitle>
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
              className="max-w-md border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-fg)]"
            />
            {search && (
              <Button 
                variant="outline" 
                onClick={() => setSearch('')}
                className="border-[var(--st-border)] text-[var(--st-fg)]"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg border border-red-500/50">
          Error loading songs: {error.message}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8 text-[var(--st-muted)]">Loading songs...</div>
      )}

      {/* Songs table */}
      {data && (
        <>
          <Card className="border-[var(--st-border)] bg-[var(--st-surface)]/50">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--st-border)]">
                  <TableHead className="text-[var(--st-muted)]">Title</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Artist</TableHead>
                  <TableHead className="text-[var(--st-muted)]">Key</TableHead>
                  <TableHead className="text-[var(--st-muted)]">BPM</TableHead>
                  <TableHead className="text-right text-[var(--st-muted)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.songs.length === 0 ? (
                  <TableRow className="border-[var(--st-border)]">
                    <TableCell colSpan={5} className="text-center py-8 text-[var(--st-muted)]">
                      No songs found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.songs.map((song) => (
                    <TableRow key={song.id} className="border-[var(--st-border)]">
                      <TableCell className="font-medium text-[var(--st-fg)]">
                        <Link
                          to={`/songs/${song.id}/edit`}
                          className="text-[var(--st-link)] hover:underline"
                        >
                          {song.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-[var(--st-fg)]">{song.artist || '-'}</TableCell>
                      <TableCell className="text-[var(--st-fg)]">{song.defaultKey || '-'}</TableCell>
                      <TableCell className="text-[var(--st-fg)]">{song.bpm || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/songs/${song.id}/edit`}>
                            <Button variant="ghost" size="sm" className="text-[var(--st-muted)] hover:text-[var(--st-fg)]">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(song.id, song.title)}
                            className="text-red-500 hover:text-red-400"
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
                className="border-[var(--st-border)] text-[var(--st-fg)]"
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-[var(--st-fg)]">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="border-[var(--st-border)] text-[var(--st-fg)]"
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
