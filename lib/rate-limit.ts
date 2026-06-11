// ⚠️ In-Memory Rate Limiter (Serverless Warning)
// On Vercel/ serverless, each invocation has its own memory.
// This limiter only works per-instance, NOT globally.
// For production scaling, replace with Vercel KV or Edge Config:
//   https://vercel.com/docs/storage/edge-config
// Or use the @upstash/ratelimit package with Redis.

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitInfo {
  requests: number[];
}

const store = new Map<string, RateLimitInfo>();

export function rateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs } = config;

  return function rateLimitMiddleware(
    req: { ip: string },
    res: {
      statusCode: number;
      setHeader: (key: string, value: string) => void;
      end: (data?: string) => void;
    },
    next: () => void
  ) {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = store.get(ip);

    if (!entry) {
      entry = { requests: [] };
      store.set(ip, entry);
    }

    // Remove timestamps outside the current window
    entry.requests = entry.requests.filter(
      (timestamp) => timestamp > windowStart
    );

    if (entry.requests.length >= maxRequests) {
      const oldestInWindow = entry.requests[0];
      const retryAfterMs = oldestInWindow + windowMs - now;
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);

      res.setHeader('Retry-After', String(retryAfterSec));
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(oldestInWindow + windowMs));
      res.statusCode = 429;
      res.end(
        JSON.stringify({
          error: 'Too Many Requests',
          retryAfter: retryAfterSec,
        })
      );
      return;
    }

    entry.requests.push(now);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(maxRequests - entry.requests.length)
    );
    res.setHeader(
      'X-RateLimit-Reset',
      String(now + windowMs)
    );

    next();
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store.entries()) {
    const hasRecentRequests = entry.requests.some(
      (ts) => ts > now - 86400000
    );
    if (!hasRecentRequests) {
      store.delete(ip);
    }
  }
}, 60000);
