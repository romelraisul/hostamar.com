import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key)
    return data as T | null
  } catch {
    return null
  }
}

export async function setCache<T>(key: string, value: T, ttl = 3600): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value))
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (error) {
    console.error('Cache delete error:', error)
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error('Cache invalidate error:', error)
  }
}

// Cache keys
export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  CUSTOMER: (id: string) => `customer:${id}`,
  PRODUCT: (id: string) => `product:${id}`,
  VIDEO: (id: string) => `video:${id}`,
  PAYMENT: (id: string) => `payment:${id}`,
  ANALYTICS: (id: string) => `analytics:${id}`,
  SETTINGS: () => 'settings',
  FEATURE_FLAGS: () => 'feature_flags',
} as const

// TTL constants (seconds)
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
  DAY: 86400,          // 1 day
  WEEK: 604800,        // 1 week
} as const