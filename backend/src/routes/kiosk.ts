import { Router, Request, Response } from 'express'
import { signToken } from '../lib/auth.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

const KIOSK_TOKEN_EXPIRES_IN = '8h'

// ============================================
// POST /api/kiosk/activate
// Exchange staff credentials for a long-lived kiosk token.
// The calling staff member must have checkin.operate permission.
// The returned token is scoped to kiosk-only permissions and
// is safe to store on a shared kiosk device.
// ============================================
router.post(
  '/activate',
  requireAuth,
  requirePermission('checkin.operate'),
  (req: Request, res: Response) => {
    // A kiosk token is long-lived and lives on a shared device in a hallway.
    // It carries the organization of the staff member who activated it, so a
    // device in one church's foyer cannot be walked over to another church's
    // hostname and still work.
    const orgId = req.user?.orgId ?? req.org?.orgId
    if (!orgId) {
      res.status(400).json({ error: 'No organization for this host' })
      return
    }

    const { accessToken, expiresAt } = signToken(
      {
        userId: 'kiosk',
        email: 'kiosk@internal',
        orgId,
        roles: ['kiosk'],
        permissions: ['checkin.view', 'checkin.operate'],
      },
      KIOSK_TOKEN_EXPIRES_IN
    )

    res.json({
      token: accessToken,
      expiresAt: expiresAt.toISOString(),
    })
  }
)

// ============================================
// GET /api/kiosk/status
// Validate that the kiosk token is still active.
// Accepts any valid JWT (standard staff tokens work here too).
// ============================================
router.get('/status', requireAuth, (req: Request, res: Response) => {
  res.json({
    active: true,
    roles: req.user!.roles,
  })
})

export default router
