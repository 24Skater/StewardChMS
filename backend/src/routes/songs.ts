import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireOrgId } from '../lib/org-context.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const createSongSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  artist: z.string().nullable().optional(),
  defaultKey: z.string().nullable().optional(),
  bpm: z.number().int().positive().nullable().optional(),
  lyrics: z.string().nullable().optional(),
})

const updateSongSchema = createSongSchema.partial()

const songSearchParamsSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

// ============================================
// Helper: Format song response
// ============================================

function formatSongResponse(song: {
  id: string
  title: string
  artist: string | null
  defaultKey: string | null
  bpm: number | null
  lyrics: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    defaultKey: song.defaultKey,
    bpm: song.bpm,
    lyrics: song.lyrics,
    createdAt: song.createdAt.toISOString(),
    updatedAt: song.updatedAt.toISOString(),
  }
}

// ============================================
// POST /api/songs - Create song
// ============================================

router.post('/', requireAuth, requirePermission('worship.write'), async (req: Request, res: Response) => {
  try {
    const parseResult = createSongSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    const song = await prisma.song.create({
      data: {
        orgId: requireOrgId(),
        title: data.title,
        artist: data.artist ?? null,
        defaultKey: data.defaultKey ?? null,
        bpm: data.bpm ?? null,
        lyrics: data.lyrics ?? null,
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'SONG_CREATED',
      entityType: 'Song',
      entityId: song.id,
      metadata: { title: song.title },
    })

    res.status(201).json(formatSongResponse(song))
  } catch (error) {
    console.error('Create song error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/songs - List/search songs
// ============================================

router.get('/', requireAuth, requirePermission('worship.read'), async (req: Request, res: Response) => {
  try {
    const parseResult = songSearchParamsSchema.safeParse(req.query)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { search, page, limit } = parseResult.data
    const skip = (page - 1) * limit

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { artist: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        skip,
        take: limit,
        orderBy: { title: 'asc' },
      }),
      prisma.song.count({ where }),
    ])

    res.json({
      songs: songs.map(formatSongResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('List songs error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/songs/:id - Get single song
// ============================================

router.get('/:id', requireAuth, requirePermission('worship.read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const song = await prisma.song.findUnique({ where: { id } })
    if (!song) {
      res.status(404).json({ error: 'Song not found' })
      return
    }

    res.json(formatSongResponse(song))
  } catch (error) {
    console.error('Get song error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /api/songs/:id - Update song
// ============================================

router.put('/:id', requireAuth, requirePermission('worship.write'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.song.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Song not found' })
      return
    }

    const parseResult = updateSongSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    const song = await prisma.song.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.artist !== undefined && { artist: data.artist ?? null }),
        ...(data.defaultKey !== undefined && { defaultKey: data.defaultKey ?? null }),
        ...(data.bpm !== undefined && { bpm: data.bpm ?? null }),
        ...(data.lyrics !== undefined && { lyrics: data.lyrics ?? null }),
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'SONG_UPDATED',
      entityType: 'Song',
      entityId: song.id,
      metadata: { changes: Object.keys(data) },
    })

    res.json(formatSongResponse(song))
  } catch (error) {
    console.error('Update song error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// DELETE /api/songs/:id - Delete song
// ============================================

router.delete('/:id', requireAuth, requirePermission('worship.write'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.song.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Song not found' })
      return
    }

    await prisma.song.delete({ where: { id } })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'SONG_DELETED',
      entityType: 'Song',
      entityId: id,
      metadata: { title: existing.title },
    })

    res.json({ message: 'Song deleted successfully' })
  } catch (error) {
    console.error('Delete song error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

