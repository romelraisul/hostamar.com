interface CacheEntry<T> {
  value: T
  expiresAt: number
}

interface LRUCacheOptions {
  max?: number
  ttl?: number
}

export class LRUCache<K = string, V = unknown> {
  private cache: Map<K, CacheEntry<V>>
  private maxEntries: number
  private defaultTTL: number

  constructor(options: LRUCacheOptions = {}) {
    this.cache = new Map()
    this.maxEntries = options.max ?? 1000
    this.defaultTTL = options.ttl ?? 5 * 60 * 1000
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  set(key: K, value: V, ttl?: number): void {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) this.cache.delete(firstKey)
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    })
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: K): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  get size(): number {
    return this.cache.size
  }

  keys(): K[] {
    return Array.from(this.cache.keys())
  }

  stats() {
    const now = Date.now()
    let expired = 0
    let active = 0
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) expired++
      else active++
    }
    return {
      total: this.cache.size,
      active,
      expired,
      maxEntries: this.maxEntries,
      defaultTTL: this.defaultTTL,
    }
  }
}

export const responseCache = new LRUCache<string, { body: string; contentType: string; status: number }>({
  max: 1000,
  ttl: 5 * 60 * 1000,
})
