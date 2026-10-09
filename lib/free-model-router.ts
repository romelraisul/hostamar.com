import { isFree } from './gateway/filter'
import { catalogKv } from './catalog-kv'

/**
 * free-model-router.ts — V74 free-model discovery + quality ranking.
 *
 * Sources (all listable WITHOUT an API key — verified 2026-09-13):
 *   - kilocode gateway : https://api.kilo.ai/api/gateway/models   (377 models, :free set)
 *   - openrouter       : https://openrouter.ai/api/v1/models     (445 models, :free set)
 *   - opencode zen     : https://opencode.ai/zen/v1/models       (free ids, User-Agent required)
 *   - nvidia NIM       : https://integrate.api.nvidia.com/v1/models (public list; free 1M tok/mo tier)
 * tokenrouter free set is small and stable (z-ai/glm-5.3-free,
 * nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free) — kept as a static map
 * because its /models requires a key we do not ship to Vercel.
 *
 * Refresh cadence: the WSL hourly cron (scripts/model-router.sh →
 * scripts/kv-seed-free-models.ts) writes HOSTAMAR_CATALOG.FREE_MODELS, and the
 * Worker reads that. The merge is ~1.25MB of upstream JSON = 26-363ms CPU, which
 * exceeded the Worker's CPU budget on a cache miss and 1102'd the whole site
 * (Ray a47d58db1eb8db4f) — so it must not run per request. KV read is <1ms;
 * a cold/empty KV still computes and persists, so the routes never hard-fail.
 */

export type FreeModel = {
  id: string
  provider: string
  quality_score: number
  free: true
  context: number
  price: 0
}

const UA = { 'User-Agent': 'Mozilla/5.0 (hostamar-model-router)' }

async function getJson(url: string, ms = 8000, headers: Record<string, string> = {}) {
  try {
    const r = await fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(ms), cache: 'no-store' })
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}

/** Deterministic quality score — higher is better, 0-100 range. */
export function qualityScore(id: string, provider: string, ctx: number): number {
  const s = id.toLowerCase()
  let score = 40
  // scale: bigger params / flagship tiers rank higher
  if (/ultra|550b|405b|397b/.test(s)) score += 30
  else if (/\bpro\b|max|large|70b|72b|a95b/.test(s)) score += 22
  else if (/plus|turbo/.test(s)) score += 12
  if (/flash|lightning|lite/.test(s)) score += 8 // fast tiers: practical for 24/7 fleet
  if (/nano|mini|small/.test(s)) score -= 8
  if (/preview|exp/.test(s)) score -= 5
  // trusted free capacity: kilo gateway serves opencode/nemotron pools at 0 cost
  if (provider === 'kilo' || provider === 'opencode') score += 8
  if (provider === 'openrouter') score += 6
  score += Math.min(10, Math.round(ctx / 100000)) // up to +10 for >=1M context
  return Math.max(0, Math.min(100, score))
}

const TOKENROUTER_STATIC: FreeModel[] = [
  { id: 'z-ai/glm-5.3-free', provider: 'tokenrouter', quality_score: 78, free: true, context: 128000, price: 0 },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', provider: 'tokenrouter', quality_score: 60, free: true, context: 128000, price: 0 },
]

/**
 * Fetch every free source, merge, dedupe, score, sort.
 * This is the expensive part (26-363ms CPU) — call it from WSL/cron, not per
 * request. Routes go through fetchAllFreeModels() (KV-first).
 */
export async function computeFreeModels(): Promise<FreeModel[]> {
  const out = new Map<string, FreeModel>()

  const [kilo, or, zen] = await Promise.all([
    getJson('https://api.kilo.ai/api/gateway/models'),
    getJson('https://openrouter.ai/api/v1/models'),
    getJson('https://opencode.ai/zen/v1/models'),
  ])

  for (const m of kilo?.data ?? []) {
    if (!isFree(m.id) && !(parseFloat(m.pricing?.prompt ?? '1') + parseFloat(m.pricing?.completion ?? '1') === 0)) continue
    const ctx = m.context_length || m.top_provider?.context_length || 128000
    out.set(`kilo/${m.id}`, { id: `kilo/${m.id}`, provider: 'kilo', quality_score: qualityScore(m.id, 'kilo', ctx), free: true, context: ctx, price: 0 })
  }
  for (const m of or?.data ?? []) {
    if (!isFree(m.id)) continue
    const ctx = m.context_length || m.top_provider?.context_length || 128000
    out.set(m.id, { id: m.id, provider: 'openrouter', quality_score: qualityScore(m.id, 'openrouter', ctx), free: true, context: ctx, price: 0 })
  }
  for (const m of zen?.data ?? []) {
    if (!isFree(m.id)) continue
    const id = `opencode/${m.id}`
    out.set(id, { id, provider: 'opencode', quality_score: qualityScore(m.id, 'opencode', 128000), free: true, context: 128000, price: 0 })
  }
  for (const m of TOKENROUTER_STATIC) out.set(`tokenrouter/${m.id}`, { ...m, id: `tokenrouter/${m.id}` })

  return Array.from(out.values()).sort((a, b) => b.quality_score - a.quality_score || b.context - a.context)
}

const FREE_KEY = 'FREE_MODELS'

/**
 * KV-first free list: <1ms edge read instead of a 26-363ms upstream merge.
 * No TTL on purpose — a stale shortlist beats a 1102'd site; the hourly WSL
 * seeder overwrites it. A cold KV computes once and persists (waitUntil), so
 * freshness converges without ever failing the request.
 */
export async function fetchAllFreeModels(): Promise<FreeModel[]> {
  const ctx = await catalogKv()
  if (ctx) {
    try {
      const hit = await ctx.kv.get(FREE_KEY, 'json')
      if (Array.isArray(hit) && hit.length) return hit as FreeModel[]
    } catch {
      /* unbound or unreadable KV -> compute below, never fail the route */
    }
  }
  const fresh = await computeFreeModels()
  if (ctx && fresh.length) ctx.waitUntil(ctx.kv.put(FREE_KEY, JSON.stringify(fresh)))
  return fresh
}

/** Top-N free models — the "free top quality" shortlist the fleet routes to. */
export async function topFreeModels(n = 15): Promise<FreeModel[]> {
  const all = await fetchAllFreeModels()
  return all.slice(0, n)
}
