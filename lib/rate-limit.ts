// Simple in-memory rate limiter
const rateMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  limit: number = 30,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  entry.count++
  if (entry.count > limit) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: limit - entry.count }
}

export function rateLimitMiddleware(handler: Function, limit?: number) {
  return async (request: Request, ...args: any[]) => {
    const ip = request.headers.get('x-forwarded-for') || 'localhost'
    const result = rateLimit(ip, limit)

    if (!result.allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0',
        },
      })
    }

    return handler(request, ...args)
  }
}