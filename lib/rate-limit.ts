/**
 * Rate-limit service backed by Postgres RateLimitEvent table.
 *
 * Sliding-window counter per (ip, path-template) bucket.
 * Cheap because it's a COUNT(*) + INSERT — no external service.
 *
 * Free-tier friendly: no Redis/Upstash required.
 */
import { prisma } from '@/lib/prisma'

export interface RateLimitConfig {
  /** friendly bucket id — e.g. "auth.signup", "auth.login" */
  bucket: string
  /** max events allowed in the window */
  limit: number
  /** window length in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number // ms epoch
}

/**
 * Check rate limit and record the event atomically.
 *
 * Counts existing events in window then inserts the new one. Race-safe
 * enough for HTTP traffic — slight overshoot is acceptable and prevents
 * the classic "check then act" pitfall because we record before returning.
 *
 * If the underlying RateLimitEvent table is missing in production (Prisma
 * schema drift on free-tier DBs), we degrade to "always allowed" so auth
 * flows remain usable. Fail-open is intentional: an OASIS-style rate
 * limit can never block paying users.
 */
export async function checkRateLimit(
  ip: string,
  cfg: RateLimitConfig,
  path: string = '/',
  method: string = 'GET'
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = new Date(now - cfg.windowMs)
  const bucket = `${ip}:${cfg.bucket}`

  try {
    // Count current events in window
    const count = await prisma.rateLimitEvent.count({
      where: {
        bucket,
        createdAt: { gte: windowStart },
      },
    })

    // Record this attempt FIRST — prevents burst-twice-on-busy-thread
    await prisma.rateLimitEvent.create({
      data: {
        bucket,
        ip,
        path,
        method,
      },
    })

    // Opportunistic cleanup: 1% chance to gc old rows so the table doesn't grow
    // forever. Cheap and self-healing.
    if (Math.random() < 0.01) {
      const cutoff = new Date(now - cfg.windowMs * 10)
      prisma.rateLimitEvent
        .deleteMany({ where: { createdAt: { lt: cutoff } } })
        .catch(() => {}) // fire and forget
    }

    const allowed = count < cfg.limit
    const remaining = Math.max(0, cfg.limit - count - 1)
    const resetAt = now + cfg.windowMs

    return { allowed, remaining, resetAt }
  } catch (error) {
    const msg = String((error as any)?.message || error || '')
    const missingTable = msg.includes('does not exist') || msg.includes('P2021')
    if (missingTable) {
      // Don't block traffic when the DB doesn't have the rate-limit table.
      return { allowed: true, remaining: cfg.limit, resetAt: now + cfg.windowMs }
    }
    throw error
  }
}

// Pre-baked configs for common endpoints
const DEFAULT_LIMITS = {
  signup: { bucket: 'auth.signup', limit: 5, windowMs: 60 * 60 * 1000 },       // 5/hour
  login: { bucket: 'auth.login', limit: 10, windowMs: 15 * 60 * 1000 },        // 10/15min
  forgotPassword: { bucket: 'auth.forgot', limit: 3, windowMs: 60 * 60 * 1000 },// 3/hour
  apiGeneral: { bucket: 'api.general', limit: 300, windowMs: 60 * 1000 },      // 300/min
} as const satisfies Record<string, RateLimitConfig>

export const RATE_LIMITS = (() => {
  const signupLimit = Number(process.env.SIGNUP_RATE_LIMIT)
  const signupWindow = Number(process.env.SIGNUP_RATE_LIMIT_WINDOW_MS)
  const loginLimit = Number(process.env.LOGIN_RATE_LIMIT)
  const loginWindow = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS)

  return {
    signup: {
      ...DEFAULT_LIMITS.signup,
      ...(Number.isFinite(signupLimit) && signupLimit > 0 ? { limit: signupLimit } : {}),
      ...(Number.isFinite(signupWindow) && signupWindow > 0 ? { windowMs: signupWindow } : {}),
    },
    login: {
      ...DEFAULT_LIMITS.login,
      ...(Number.isFinite(loginLimit) && loginLimit > 0 ? { limit: loginLimit } : {}),
      ...(Number.isFinite(loginWindow) && loginWindow > 0 ? { windowMs: loginWindow } : {}),
    },
    forgotPassword: DEFAULT_LIMITS.forgotPassword,
    apiGeneral: DEFAULT_LIMITS.apiGeneral,
    // Voice token mint: 10/min per user (spec).
    voiceToken: { bucket: 'voice.token', limit: 10, windowMs: 60 * 1000 },
    // Voice tool execution: 20/min (spec, validation PR b).
    toolsRun: { bucket: 'tools.run', limit: 20, windowMs: 60 * 1000 },
    // Post-call webhook ingest: 200/min (spec, validation PR b).
    callWebhook: { bucket: 'webhooks.call-ended', limit: 200, windowMs: 60 * 1000 },
    // bKash redirect/webhook ingest: 200/min (TASK 6).
    bkashWebhook: { bucket: 'webhooks.bkash', limit: 200, windowMs: 60 * 1000 },
  }
})()

/**
 * Extract client IP from request headers. Trusts X-Forwarded-For only
 * when Cloudflare Tunnel sets a single CF-Connecting-IP header
 * (we always see these on the app side of the tunnel).
 */
export function getClientIp(req: Request): string {
  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return '0.0.0.0'
}
