import { isFree } from './gateway/filter'

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
 * The hourly refresh is the CDN TTL on the routes that consume this
 * (max-age=3600) — Vercel Hobby cannot run hourly crons, so cache expiry
 * IS the hourly check. A local WSL cron (model-router.sh) snapshots
 * ~/memories/models/ for the FleetReport log.
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

/** Fetch every free source, merge, dedupe, score, sort. One call = one hourly snapshot. */
export async function fetchAllFreeModels(): Promise<FreeModel[]> {
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

/** Top-N free models — the "free top quality" shortlist the fleet routes to. */
export async function topFreeModels(n = 15): Promise<FreeModel[]> {
  const all = await fetchAllFreeModels()
  return all.slice(0, n)
}
