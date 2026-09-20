import { Redis } from '@upstash/redis'

// ponytail: Vercel Hobby has no hourly cron — the client (check-models-health.sh
// on WSL, hourly crontab) hits this endpoint with CRON_SECRET. Results go to
// Upstash (TTL 2h) so /api/v1/models serves only verified-healthy models.

const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null

export type HealthEntry = { id: string, latencyMs: number, ok: boolean, error?: string }
export type HealthMap = Record<string, HealthEntry>

export const HEALTH_KEY = 'omnirouter:health'
export const HEALTH_TTL = 7200 // 2h — hourly checks keep it warm

export async function getHealth(): Promise<HealthMap | null> {
  if (!redis) return null
  try { return await redis.get<HealthMap>(HEALTH_KEY) } catch { return null }
}

export async function setHealth(map: HealthMap) {
  if (!redis) return
  try { await redis.set(HEALTH_KEY, JSON.parse(JSON.stringify(map)) as never, { ex: HEALTH_TTL }) } catch { /* ignore */ }
}

/** Ping one model via the real inference path (kilocode gateway). 12s cap. */
export async function pingModel(id: string): Promise<HealthEntry> {
  const start = Date.now()
  try {
    if (!process.env.KILOCODE_API_KEY) return { id, latencyMs: 0, ok: false, error: 'no key' }
    const base = process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway'
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(12_000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.KILOCODE_API_KEY}` },
      body: JSON.stringify({ model: id, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1, thinking: { type: 'disabled' } }),
    })
    const latencyMs = Date.now() - start
    // 200 = healthy. 4xx model-not-found/invalid = dead. Other 4xx/5xx = provider issue, still counts as down for routing.
    if (r.ok) return { id, latencyMs, ok: true }
    const body = await r.text().catch(() => '')
    return { id, latencyMs, ok: false, error: `HTTP ${r.status} ${body.slice(0, 80)}` }
  } catch (e) {
    return { id, latencyMs: Date.now() - start, ok: false, error: (e as Error).message.slice(0, 80) }
  }
}
