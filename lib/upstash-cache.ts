import { Redis } from '@upstash/redis'

// ponytail: no Upstash REST creds yet — every call degrades to a plain fetch.
// Redis.fromEnv() throws at import if UPSTASH_REDIS_REST_URL is unset, so guard it.
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null

/** Cache-aside for Turso reads. Falls through to the fetcher on any cache miss/error. */
export async function cachedTurso<T>(key: string, ttlSec: number, fetcher: () => Promise<T>): Promise<T> {
  if (redis) {
    try {
      const cached = await redis.get<T>(key)
      if (cached !== null) return cached
    } catch { /* fall through */ }
  }
  const fresh = await fetcher()
  if (redis) {
    try { await redis.set(key, JSON.parse(JSON.stringify(fresh)) as never, { ex: ttlSec }) } catch { /* ignore */ }
  }
  return fresh
}

export { redis }
