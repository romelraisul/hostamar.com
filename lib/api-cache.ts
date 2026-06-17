import { redis, getCached, setCache, deleteCache, invalidatePattern, CACHE_KEYS, CACHE_TTL } from '@/lib/redis-cache'

export async function getCachedCustomer(id: string) {
  const cached = await getCached(CACHE_KEYS.CUSTOMER(id))
  if (cached) return cached
  return null
}

export async function setCachedCustomer(id: string, data: any, ttl = CACHE_TTL.LONG) {
  await setCache(CACHE_KEYS.CUSTOMER(id), data, ttl)
}

export async function invalidateCustomerCache(id: string) {
  await deleteCache(CACHE_KEYS.CUSTOMER(id))
}

export async function getCachedAnalytics(key: string) {
  const cached = await getCached(CACHE_KEYS.ANALYTICS(key))
  if (cached) return cached
  return null
}

export async function setCachedAnalytics(key: string, data: any, ttl = CACHE_TTL.MEDIUM) {
  await setCache(CACHE_KEYS.ANALYTICS(key), data, ttl)
}