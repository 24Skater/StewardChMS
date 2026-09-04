import { JwtPayload } from '../lib/auth.js'
import { OrgContext } from '../lib/org-context.js'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
      /** The church this request belongs to, decided by its hostname. */
      org?: OrgContext
    }
  }
}

export {}

