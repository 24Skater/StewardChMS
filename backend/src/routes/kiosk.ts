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
  (_req: Request, res: Response) => {
    const { accessToken, expiresAt } = signToken(
      {
        userId: 'kiosk',
        email: 'kiosk@internal',
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
