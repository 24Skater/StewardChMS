/**
 * Single sign-on, as a client of one OIDC provider.
 *
 * Two routes. `GET /api/auth/sso/start` sends the browser to the identity
 * provider; `GET /api/auth/sso/callback` takes it back, and — if everything
 * holds — mints **the session this application already issues**. Nothing
 * downstream of that cookie knows or cares which route produced it.
 *
 * That is the whole design. SSO answers "who is this human". This application
 * still answers "what may they do here", from the church the hostname resolved
 * to and the membership and role grants in its own database. The identity is
 * portable; the membership is not.
 *
 * What is deliberately absent:
 *
 * - **No user is created.** Congregation memberships are granted by an
 *   administrator. A federated identity that matches nobody here is refused,
 *   with the same answer a wrong password gets.
 * - **No password is touched.** `passwordHash` is never read, written or
 *   dropped by this file. Email and password is still there afterwards.
 * - **No org is inferred from the token.** `req.org` comes from the hostname,
 *   exactly as it does for a password sign-in.
 */

import { Router, Request, Response } from 'express'
import * as client from 'openid-client'
import prisma from '../lib/prisma.js'
import { signToken, COOKIE_OPTIONS, COOKIE_NAME } from '../lib/auth.js'
import { createAuditLog } from '../lib/audit.js'
import { ssoConfig, decideSsoSignIn, type SsoProfileClaims } from '../lib/sso.js'
import { loginRateLimiter } from '../middleware/rateLimiter.js'

const router = Router()

/** How long the browser has to come back from the identity provider. */
const HANDOFF_MAX_AGE_MS = 10 * 60 * 1000

const VERIFIER_COOKIE = 'steward_sso_verifier'
const STATE_COOKIE = 'steward_sso_state'
const NONCE_COOKIE = 'steward_sso_nonce'

/**
 * Cookies for the round trip to the identity provider.
 *
 * `sameSite: 'lax'`, unlike the session cookie's `strict`, and that is not an
 * oversight. A Strict cookie is not sent on the top-level navigation *back*
 * from another site, so the callback would find no verifier and every sign-in
 * would fail. Lax is sent on exactly that navigation and nothing riskier — and
 * these three are useless to an attacker anyway: they are the halves of a
 * handshake that only completes against a code the attacker does not have.
 */
const HANDOFF_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: HANDOFF_MAX_AGE_MS,
}

/**
 * The discovered provider metadata, fetched once and kept.
 *
 * Discovery is a network call to somebody else's server. Doing it per sign-in
 * puts their availability in front of ours for no benefit — the document
 * changes approximately never, and a restart re-reads it.
 */
let discovered: Promise<client.Configuration> | null = null

function providerConfiguration(): Promise<client.Configuration> | null {
  const sso = ssoConfig()
  if (!sso) return null

  if (!discovered) {
    discovered = client
      .discovery(new URL(sso.issuer), sso.clientId, sso.clientSecret)
      .catch((error) => {
        // Clear the cache so the next attempt retries rather than replaying a
        // failure for the life of the process.
        discovered = null
        throw error
      })
  }

  return discovered
}

/** This application's own origin, as the browser reached it. */
function selfOrigin(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? req.protocol
  const host = req.headers.host ?? ''
  return `${proto}://${host}`
}

function redirectUri(req: Request): string {
  return `${selfOrigin(req)}/api/auth/sso/callback`
}

/** Where the browser lands after the handshake, successful or not. */
function frontendUrl(path: string): string {
  const base = (process.env.CORS_ORIGIN || 'http://localhost').replace(/\/+$/, '')
  return `${base}${path}`
}

function clearHandoffCookies(res: Response): void {
  for (const name of [VERIFIER_COOKIE, STATE_COOKIE, NONCE_COOKIE]) {
    res.clearCookie(name, { path: '/' })
  }
}

// ============================================
// GET /api/auth/sso/start
// ============================================
router.get('/start', loginRateLimiter, async (req: Request, res: Response) => {
  const configuration = providerConfiguration()
  if (!configuration) {
    // 404 rather than 501: with no identity provider configured, this route
    // does not exist on this deployment, and saying so plainly is honest to a
    // church running Congregation on its own server.
    res.status(404).json({ error: 'Single sign-on is not configured' })
    return
  }

  if (!req.org) {
    res.status(400).json({ error: 'No organization for this host' })
    return
  }

  try {
    const config = await configuration
    const codeVerifier = client.randomPKCECodeVerifier()
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
    const state = client.randomState()
    const nonce = client.randomNonce()

    res.cookie(VERIFIER_COOKIE, codeVerifier, HANDOFF_COOKIE_OPTIONS)
    res.cookie(STATE_COOKIE, state, HANDOFF_COOKIE_OPTIONS)
    res.cookie(NONCE_COOKIE, nonce, HANDOFF_COOKIE_OPTIONS)

    const authorizationUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri(req),
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    })

    res.redirect(authorizationUrl.href)
  } catch (error) {
    console.error('SSO start error:', error)
    res.redirect(frontendUrl('/login?error=sso_unavailable'))
  }
})

// ============================================
// GET /api/auth/sso/callback
// ============================================
router.get('/callback', loginRateLimiter, async (req: Request, res: Response) => {
  const configuration = providerConfiguration()
  if (!configuration) {
    res.status(404).json({ error: 'Single sign-on is not configured' })
    return
  }

  const org = req.org
  if (!org) {
    res.status(400).json({ error: 'No organization for this host' })
    return
  }

  const codeVerifier = req.cookies?.[VERIFIER_COOKIE]
  const expectedState = req.cookies?.[STATE_COOKIE]
  const expectedNonce = req.cookies?.[NONCE_COOKIE]
  clearHandoffCookies(res)

  if (!codeVerifier || !expectedState || !expectedNonce) {
    // Usually a bookmarked callback or a handshake that took longer than the
    // cookies live. Never treated as a reason to skip the checks.
    res.redirect(frontendUrl('/login?error=sso_expired'))
    return
  }

  try {
    const config = await configuration
    const tokens = await client.authorizationCodeGrant(
      config,
      new URL(req.originalUrl, selfOrigin(req)),
      { pkceCodeVerifier: codeVerifier, expectedState, expectedNonce }
    )

    const claims = tokens.claims() as SsoProfileClaims | undefined
    const decision = decideSsoSignIn(claims)
    if (!decision.ok) {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        entityType: 'User',
        metadata: { method: 'sso', reason: decision.reason },
      })
      res.redirect(frontendUrl('/login?error=sso_unverified'))
      return
    }

    const email = String(claims?.email).toLowerCase()

    // The same shape the password login reads, for the same reason: the user
    // row is global, and the role grants are filtered to this church here
    // because a nested include is invisible to the tenancy guard.
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: { where: { orgId: org.orgId }, select: { id: true } },
        userRoles: {
          where: { orgId: org.orgId },
          include: {
            role: { include: { rolePermissions: { include: { permission: true } } } },
          },
        },
      },
    })

    // Three different refusals, one answer. A person who has no account, whose
    // account is switched off, or who simply does not serve at this church all
    // get "we could not sign you in" — anything more specific answers the
    // question "does this person attend that church?" to whoever asks.
    if (!user || !user.isActive || user.memberships.length === 0) {
      await createAuditLog({
        actorUserId: user?.id,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user?.id,
        metadata: {
          method: 'sso',
          reason: !user
            ? 'No account for this address'
            : !user.isActive
              ? 'Account inactive'
              : 'Not a member of this organization',
        },
      })
      res.redirect(frontendUrl('/login?error=sso_no_account'))
      return
    }

    const roles: string[] = user.userRoles.map((ur: { role: { name: string } }) => ur.role.name)
    const permissionKeys = user.userRoles.flatMap(
      (ur: { role: { rolePermissions: Array<{ permission: { key: string } }> } }) =>
        ur.role.rolePermissions.map((rp: { permission: { key: string } }) => rp.permission.key)
    )
    const permissions: string[] = Array.from(new Set(permissionKeys))

    const { accessToken } = signToken({
      userId: user.id,
      email: user.email,
      orgId: org.orgId,
      roles,
      permissions,
      isPrimaryAdmin: user.isPrimaryAdmin,
    })

    await createAuditLog({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      metadata: { method: 'sso', roles, permissions, isPrimaryAdmin: user.isPrimaryAdmin },
    })

    res.cookie(COOKIE_NAME, accessToken, COOKIE_OPTIONS)
    res.redirect(frontendUrl('/'))
  } catch (error) {
    // A failed state or nonce check lands here, as does a refused code. The
    // person sees one message; the reason goes to the log.
    console.error('SSO callback error:', error)
    res.redirect(frontendUrl('/login?error=sso_failed'))
  }
})

export default router
