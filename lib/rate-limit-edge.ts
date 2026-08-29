/**
 * Zero-cost rate limiting — two layers, no new deps, no paid services.
 *
 * L1: in-process sliding window (works per serverless instance; stops the
 *     burst-abuse case even when the DB layer fails open). Zero allocation
 *     per request beyond a Map lookup.
 * L2: the existing DB-backed checkRateLimit (lib/rate-limit.ts) — durable
 *     across instances, used by auth routes; currently fails OPEN when the
 *     RateLimitEvent table is missing, which is why 20 rapid signups all
 *     returned 200 in the audit.
 *
 * Usage:
 *   const rl = slidingWindow(`chat:${ip}`, 100, 60_000)
 *   if (!rl.ok) return 429
 */
const buckets = new Map<string, number[]>()

export function slidingWindow(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; resetInMs: number } {
  const now = Date.now()
  let hits = buckets.get(key) || []
  hits = hits.filter(t => now - t < windowMs)
  const ok = hits.length < limit
  if (ok) hits.push(now)
  if (buckets.size > 5000) buckets.clear() // crude memory guard on long-lived instances
  buckets.set(key, hits)
  return { ok, remaining: Math.max(0, limit - hits.length), resetInMs: windowMs - (now - (hits[0] || now)) }
}

export function getClientIpEdge(req: Request): string {
  const h = (req as any).headers?.get?.bind((req as any).headers)
  const cf = h && h('cf-connecting-ip')
  if (cf) return cf
  const xff = h && h('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return '0.0.0.0'
}
