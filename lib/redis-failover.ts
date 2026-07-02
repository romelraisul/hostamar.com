/**
 * Redis with failover.
 *
 * Primary: wss://redis.hostamar.com — Cloudflare Tunnel → WSL bridge → in-network Redis.
 * Fallback: rediss://<upstash-url> — always-on public Redis (Upstash free tier).
 *
 * The worker pings the active connection every 10s. If 3 consecutive pings
 * miss, we swap connections and drain the BullMQ queue (BullMQ retries
 * automatically on disconnect with attempts:3 + exponential backoff).
 *
 * This is intentionally minimal: BullMQ owns retry semantics. We just
 * swap the connection on failure.
 */
import Redis from 'ioredis'

// Inline logger to avoid pulling in server-side modules from redis-bridge/
const TAG = '[redis-failover]'
const log = {
  info: (msg: string, meta?: unknown) => console.log(`${TAG} ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg: string, meta?: unknown) => console.warn(`${TAG} ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg: string, meta?: unknown) => console.error(`${TAG} ${msg}`, meta ? JSON.stringify(meta) : ''),
}

const PRIMARY_URL = process.env.REDIS_URL || ''          // wss://... or rediss://...
const FALLBACK_URL = process.env.REDIS_FALLBACK_URL || '' // rediss://default:***@...upstash.io
const HEARTBEAT_MS = parseInt(process.env.REDIS_HEARTBEAT_MS || '10000', 10)
const MAX_FAILS = parseInt(process.env.REDIS_MAX_FAILS || '3', 10)

let primary: Redis | null = null
let fallback: Redis | null = null
let fails = 0
let onFailover: ((url: string) => void) | null = null

type UrlKind = 'primary' | 'fallback'

function make(url: string, kind: UrlKind): Redis {
  if (!url) throw new Error(`Empty URL for ${kind}`)
  // BullMQ-compatible settings: maxRetriesPerRequest=null, no ready check
  const r = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    connectTimeout: 3000,
    retryStrategy(times) {
      // 1s, 2s, 4s, 8s — capped at 30s
      return Math.min(times * 1000, 30_000)
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE']
      return targetErrors.some((e) => err.message.includes(e))
    },
  })
  r.on('error', (err) => log.error(`${kind} error`, { message: err.message }))
  r.on('connect', () => log.info(`${kind} connected`, { url }))
  return r
}

/**
 * Start both connections. Whichever connects first is "active".
 * Heartbeat thread pings every 10s; on 3 fails, swap active connection.
 */
export async function startRedisFailover(): Promise<Redis> {
  if (primary && fallback) return primary
  if (!PRIMARY_URL && !FALLBACK_URL) throw new Error('No Redis URLs configured')

  if (PRIMARY_URL) {
    try { primary = make(PRIMARY_URL, 'primary') } catch (e) { log.error('primary init failed', { url: PRIMARY_URL }) }
  }
  if (FALLBACK_URL) {
    try { fallback = make(FALLBACK_URL, 'fallback') } catch (e) { log.error('fallback init failed', { url: FALLBACK_URL }) }
  }

  // Wait briefly for at least one to be ready
  const start = Date.now()
  while (Date.now() - start < 5000) {
    const pReady = primary && primary.status === 'ready'
    const fReady = fallback && fallback.status === 'ready'
    if (pReady || fReady) break
    await new Promise((r) => setTimeout(r, 100))
  }

  const active = activeConnection()
  log.info('active redis chosen', { kind: active === primary ? 'primary' : 'fallback', status: active?.status })

  startHeartbeat()
  return active as Redis
}

function activeConnection(): Redis {
  if (primary && primary.status === 'ready') return primary
  if (fallback && fallback.status === 'ready') return fallback
  // Neither ready: fall back to one that exists (it will reconnect)
  return (primary || fallback) as Redis
}

function startHeartbeat() {
  setInterval(async () => {
    const conn = activeConnection()
    if (!conn) return
    try {
      const t = await conn.ping()
      if (t === 'PONG') {
        if (fails > 0) log.info(`recovered after ${fails} fails`)
        fails = 0
      } else {
        fails++
      }
    } catch (err) {
      fails++
      log.warn('ping failed', { count: fails, err: (err as Error).message })
    }
    if (fails >= MAX_FAILS) {
      const before = conn === primary ? 'primary' : 'fallback'
      log.warn(`failover trigger — ${before} failed ${fails}x, swapping`)
      // Force-quit so the next active selection lands on the other
      if (conn === primary) primary?.disconnect()
      else fallback?.disconnect()
      const next = activeConnection()
      const after = next === primary ? 'primary' : 'fallback'
      log.warn(`failover done — now on ${after}`)
      fails = 0
      onFailover?.(after === 'primary' ? PRIMARY_URL : FALLBACK_URL)
    }
  }, HEARTBEAT_MS)
}

export function onFailoverEvent(cb: (url: string) => void) {
  onFailover = cb
}

export async function closeRedisFailover() {
  primary?.disconnect()
  fallback?.disconnect()
  primary = null
  fallback = null
}

export function getActiveRedis(): Redis {
  return activeConnection() as Redis
}
