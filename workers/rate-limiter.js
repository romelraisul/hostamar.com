// Cloudflare Worker for API Rate Limiting
// Deploy with: wrangler deploy

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    
    // Skip rate limiting for static assets
    if (isStaticAsset(url.pathname)) {
      return fetch(request)
    }
    
    // Rate limit key
    const rateLimitKey = `ratelimit:${ip}:${url.pathname}`
    
    // Check rate limit from KV
    const rateLimitData = await env.RATE_LIMIT_KV.get(rateLimitKey, { type: 'json' })
    const now = Date.now()
    const windowMs = 60000 // 1 minute
    const maxRequests = 100
    
    let rateLimit = rateLimitData || { count: 0, resetAt: now + 60000 }
    
    // Reset window if expired
    if (now > rateLimit.resetAt) {
      rateLimit = { count: 0, resetAt: now + 60000 }
    }
    
    rateLimit.count++
    
    // Save updated rate limit
    await env.RATE_LIMIT_KV.put(rateLimitKey, JSON.stringify(rateLimit), {
      expirationTtl: 120 // 2 minutes
    })
    
    // Check if rate limited
    if (rateLimit.count > 100) {
      return new Response(JSON.stringify({ 
        error: 'Too many requests',
        retryAfter: Math.ceil((rateLimit.resetAt - now) / 1000)
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimit.resetAt - now) / 1000),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000))
        }
      })
    }
    
    // Continue to origin
    const response = await fetch(request)
    
    // Add rate limit headers
    const headers = new Headers(response.headers)
    headers.set('X-RateLimit-Limit', '100')
    headers.set('X-RateLimit-Remaining', String(100 - rateLimit.count))
    headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetAt / 1000)))
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  }
}

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2|ico|woff2)$/i.test(pathname)
}