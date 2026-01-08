import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSong, useCreateSong, useUpdateSong } from '../../hooks/useSongs'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

const songFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  artist: z.string().optional().nullable(),
  defaultKey: z.string().optional().nullable(),
  bpm: z.coerce.number().int().positive().optional().nullable(),
  lyrics: z.string().optional().nullable(),
})

type SongFormData = z.infer<typeof songFormSchema>

const MUSICAL_KEYS = [
  'C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B',
  'Cm', 'C#m/Dbm', 'Dm', 'D#m/Ebm', 'Em', 'Fm', 'F#m/Gbm', 'Gm', 'G#m/Abm', 'Am', 'A#m/Bbm', 'Bm',
]

export default function SongFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const { data: existingSong, isLoading: isLoadingSong } = useSong(id)
  const createMutation = useCreateSong()
  const updateMutation = useUpdateSong()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SongFormData>({
    resolver: zodResolver(songFormSchema),
    defaultValues: {
      title: '',
      artist: '',
      defaultKey: '',
      bpm: undefined,
      lyrics: '',
    },
  })

  // Load existing song data
  useEffect(() => {
    if (existingSong) {
      reset({
        title: existingSong.title,
        artist: existingSong.artist || '',
        defaultKey: existingSong.defaultKey || '',
        bpm: existingSong.bpm || undefined,
        lyrics: existingSong.lyrics || '',
      })
    }
  }, [existingSong, reset])

  const onSubmit = async (formData: SongFormData) => {
    const songData = {
      title: formData.title,
      artist: formData.artist || null,
      defaultKey: formData.defaultKey || null,
      bpm: formData.bpm || null,
      lyrics: formData.lyrics || null,
    }

    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, data: songData })
      } else {
        await createMutation.mutateAsync(songData)
      }
      navigate('/songs')
    } catch (error) {
      console.error('Failed to save song:', error)
    }
  }

  if (isEditing && isLoadingSong) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-8 text-gray-500">Loading song...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Song' : 'Add Song'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Song title"
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Artist */}
            <div className="space-y-2">
              <Label htmlFor="artist">Artist</Label>
              <Input
                id="artist"
                {...register('artist')}
                placeholder="Artist or composer"
              />
            </div>

            {/* Key and BPM */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultKey">Default Key</Label>
                <select
                  id="defaultKey"
                  {...register('defaultKey')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select key</option>
                  {MUSICAL_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpm">BPM</Label>
                <Input
                  id="bpm"
                  type="number"
                  min={1}
                  max={300}
                  {...register('bpm')}
                  placeholder="Beats per minute"
                />
              </div>
            </div>

            {/* Lyrics */}
            <div className="space-y-2">
              <Label htmlFor="lyrics">Lyrics</Label>
              <Textarea
                id="lyrics"
                {...register('lyrics')}
                placeholder="Song lyrics..."
                rows={10}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Song' : 'Add Song'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/songs')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

