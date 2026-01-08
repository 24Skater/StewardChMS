import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSongs,
  getSong,
  createSong,
  updateSong,
  deleteSong,
  SongSearchParams,
  CreateSongData,
} from '../lib/api'

export function useSongs(params: SongSearchParams = {}) {
  return useQuery({
    queryKey: ['songs', params],
    queryFn: () => getSongs(params),
  })
}

export function useSong(id: string | undefined) {
  return useQuery({
    queryKey: ['songs', id],
    queryFn: () => getSong(id!),
    enabled: !!id,
  })
}

export function useCreateSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSongData) => createSong(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    },
  })
}

export function useUpdateSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateSongData> }) =>
      updateSong(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      queryClient.invalidateQueries({ queryKey: ['songs', id] })
    },
  })
}

export function useDeleteSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteSong(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    },
  })
}

