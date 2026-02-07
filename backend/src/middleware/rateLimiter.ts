import rateLimit from 'express-rate-limit'

/**
 * Rate limiter for authentication endpoints.
 * More restrictive to prevent brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    error: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
})

/**
 * Rate limiter for login specifically.
 * Even more restrictive.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
})

/**
 * Rate limiter for general API endpoints.
 * More permissive for authenticated users.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter for bulk operations (imports, exports).
 */
export const bulkOperationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bulk operations per hour
  message: {
    error: 'Too many bulk operations. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter for password reset requests.
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset requests per hour
  message: {
    error: 'Too many password reset requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

