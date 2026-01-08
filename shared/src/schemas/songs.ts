import { z } from 'zod'

// ============================================
// Song Schemas
// ============================================

export const createSongSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  artist: z.string().nullable().optional(),
  defaultKey: z.string().nullable().optional(),
  bpm: z.number().int().positive().nullable().optional(),
  lyrics: z.string().nullable().optional(),
})

export type CreateSongRequest = z.infer<typeof createSongSchema>

export const updateSongSchema = createSongSchema.partial()

export type UpdateSongRequest = z.infer<typeof updateSongSchema>

export const songResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string().nullable(),
  defaultKey: z.string().nullable(),
  bpm: z.number().nullable(),
  lyrics: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type SongResponse = z.infer<typeof songResponseSchema>

export const songSearchParamsSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

export type SongSearchParams = z.infer<typeof songSearchParamsSchema>

