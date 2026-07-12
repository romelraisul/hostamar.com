// ============================================================================
// lib/api/validator.ts — input validation + sanitization toolkit.
//
// Closes the "API trusts every request" risk. Two ways to use it:
//
//   1. createApiHandler(opts, handler) — full wrapper for NEW / simple JSON
//      routes. Parses query + JSON body, sanitizes, zod-validates, rate-limits
//      (via the Prisma-backed checkRateLimit — NOT redis, which this repo does
//      not run on Vercel), emits a traceId + audit log.
//
//   2. Composable helpers — deepSanitize() + validateBody() + validateQuery()
//      for EXISTING routes that already have bespoke auth / formData / SSO
//      logic we must not rip out (voice sub-gate, tools circuit-breaker, login
//      SSO-enforce redirect, SAML formData, admin self-guard). These routes
//      keep their shape and just gain strict input validation.
//
// Rate limiting reuses lib/rate-limit.ts (checkRateLimit + RATE_LIMITS). There
// is no @/lib/redis in this project — rate limiting is Postgres-backed and
// free-tier friendly, and that is intentional.
// ============================================================================
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { NextResponse } from 'next/server'

export const DEFAULT_MAX_STRING = 10_000

const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
// Post-sanitization tripwire. DOMPurify already strips <script> / event
// handlers, but we hard-reject anything that still smells like an injection
// vector (defence in depth + explicit 400 for audit trails).
const MALICIOUS_RE = /<script|javascript:|data:text\/html|vbscript:|onerror=|onload=/i

export class ValidationError extends Error {
  status: number
  code: string
  issues?: unknown
  constructor(code: string, message: string, status = 400, issues?: unknown) {
    super(message)
    this.name = 'ValidationError'
    this.code = code
    this.status = status
    this.issues = issues
  }
}

/**
 * Recursively sanitize every string in a parsed JSON value:
 *  - reject strings longer than `max` (STRING_TOO_LONG)
 *  - trim + DOMPurify.sanitize each string
 *  - reject residual injection vectors (MALICIOUS_STRING)
 *  - drop prototype-pollution keys (__proto__, constructor, prototype)
 *
 * Returns a NEW object (null-prototype) — never mutates the input.
 */
export function deepSanitize<T = unknown>(input: T, max: number = DEFAULT_MAX_STRING): T {
  if (typeof input === 'string') {
    if (input.length > max) {
      throw new ValidationError('STRING_TOO_LONG', `string exceeds ${max} chars`)
    }
    const cleaned = DOMPurify.sanitize(input.trim())
    if (MALICIOUS_RE.test(cleaned)) {
      throw new ValidationError('MALICIOUS_STRING', 'input rejected by sanitizer')
    }
    return cleaned as unknown as T
  }
  if (Array.isArray(input)) {
    return input.map((v) => deepSanitize(v, max)) as unknown as T
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (PROTO_KEYS.has(k)) continue // strip prototype-pollution keys
      out[k] = deepSanitize(v, max)
    }
    return out as unknown as T
  }
  // number / boolean / null / undefined — passthrough
  return input
}

/** Parse a raw JSON string safely; empty -> {}. Throws ValidationError on bad JSON. */
export function parseJson(text: string | null | undefined): unknown {
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new ValidationError('INVALID_JSON', 'request body is not valid JSON')
  }
}

/**
 * Sanitize + zod-validate an already-parsed body. Use inside existing routes:
 *   const parsed = validateData(schema, rawBody)   // throws ValidationError
 */
export function validateData<S extends z.ZodTypeAny>(
  schema: S,
  raw: unknown,
  max: number = DEFAULT_MAX_STRING
): z.infer<S> {
  const sanitized = deepSanitize(raw, max)
  const result = schema.safeParse(sanitized)
  if (!result.success) {
    throw new ValidationError('VALIDATION_FAILED', 'schema validation failed', 400, result.error.issues)
  }
  return result.data
}

/** Read + parse + sanitize + validate a JSON request body in one call. */
export async function validateBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
  max: number = DEFAULT_MAX_STRING
): Promise<z.infer<S>> {
  const text = await req.text()
  const raw = parseJson(text)
  return validateData(schema, raw, max)
}

/** Validate URL query params against a schema (query values are always strings). */
export function validateQuery<S extends z.ZodTypeAny>(req: Request, schema: S): z.infer<S> {
  const url = new URL(req.url)
  const raw = Object.fromEntries(url.searchParams.entries())
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new ValidationError('VALIDATION_FAILED', 'query validation failed', 400, result.error.issues)
  }
  return result.data
}

/** Turn any thrown error into a JSON NextResponse. Use in route catch blocks. */
export function toErrorResponse(e: unknown, traceId?: string): NextResponse {
  if (e instanceof ValidationError) {
    return NextResponse.json(
      { error: e.code, message: e.message, issues: e.issues, traceId },
      { status: e.status }
    )
  }
  if (e && typeof e === 'object' && (e as any).name === 'ZodError') {
    return NextResponse.json(
      { error: 'VALIDATION_FAILED', issues: (e as any).issues, traceId },
      { status: 400 }
    )
  }
  console.error('[api_error]', { traceId, err: (e as any)?.message, stack: (e as any)?.stack?.slice(0, 500) })
  return NextResponse.json({ error: 'INTERNAL', traceId }, { status: 500 })
}

// --- shared zod fragments reused across routes -----------------------------
export const zTenantSlug = z.string().regex(/^[a-z0-9-]+$/, 'invalid tenant slug').max(64)
export const zEmail = z.string().email().max(254)

// ============================================================================
// createApiHandler — full wrapper for NEW / simple JSON routes.
// Rate limiting delegates to checkRateLimit (Postgres-backed). Pass a
// RATE_LIMITS config via rateLimit; if omitted, no limiting is applied.
// ============================================================================
import { checkRateLimit, getClientIp, type RateLimitConfig } from '@/lib/rate-limit'

export interface CreateApiHandlerOpts<TBody extends z.ZodTypeAny, TQuery extends z.ZodTypeAny> {
  body?: TBody
  query?: TQuery
  rateLimit?: RateLimitConfig
  maxStringLength?: number
}

export interface ApiHandlerCtx<TBody, TQuery> {
  body: TBody
  query: TQuery
  ip: string
  traceId: string
  req: Request
}

export function createApiHandler<
  TBody extends z.ZodTypeAny = z.ZodTypeAny,
  TQuery extends z.ZodTypeAny = z.ZodTypeAny
>(
  opts: CreateApiHandlerOpts<TBody, TQuery>,
  handler: (ctx: ApiHandlerCtx<z.infer<TBody>, z.infer<TQuery>>) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    const ip = getClientIp(req)
    const traceId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const start = Date.now()
    const pathname = new URL(req.url).pathname
    try {
      // Query
      const url = new URL(req.url)
      const rawQuery = Object.fromEntries(url.searchParams.entries())
      const query = (opts.query ? opts.query.parse(rawQuery) : rawQuery) as z.infer<TQuery>

      // Body (only for methods that carry one)
      let body = {} as z.infer<TBody>
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const raw = parseJson(await req.text())
        const sanitized = deepSanitize(raw, opts.maxStringLength ?? DEFAULT_MAX_STRING)
        body = (opts.body ? opts.body.parse(sanitized) : sanitized) as z.infer<TBody>
      }

      // Rate limit (Postgres-backed sliding window)
      if (opts.rateLimit) {
        const rl = await checkRateLimit(ip, opts.rateLimit, pathname, req.method)
        if (!rl.allowed) {
          return NextResponse.json(
            { error: 'RATE_LIMITED', traceId },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': String(opts.rateLimit.limit),
                'X-RateLimit-Remaining': String(rl.remaining),
                'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
              },
            }
          )
        }
      }

      return await handler({ body, query, ip, traceId, req })
    } catch (e) {
      // zod .parse throws ZodError -> normalize to 400
      return toErrorResponse(e, traceId)
    } finally {
      console.log('[api_audit]', { path: pathname, method: req.method, ms: Date.now() - start, ip, traceId })
    }
  }
}
