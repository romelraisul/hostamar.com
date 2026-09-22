import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/v1/models — PUBLIC OpenAI-compatible model list (no auth).
 * Tier 1: Cloudflare Worker KV catalog (120 models, always-on, no home VPS).
 * Tier 2: MODELS_95 generated catalog (local, no network).
 * This is the same-domain customer base URL (hostamar.com/api/v1) so the
 * dashboard chat and external CLIs (codex/claude/hermes with
 * OPENAI_BASE_URL=https://hostamar.com/api/v1) work even when the home
 * computer is off — unlike the /v1 rewrite → ai.hostamar.com tunnel.
 */
const EDGE_MODELS_URL = process.env.EDGE_GATEWAY_URL
  ? `${process.env.EDGE_GATEWAY_URL.replace(/\/+$/, '')}/models`
  : 'https://hostamar-ai-gateway.romelraisul.workers.dev/v1/models'

import { MODELS_95 } from '@/lib/gateway/95-models'
import { fetchAllFreeModels } from '@/lib/free-model-router'
import { getHealth } from '@/lib/model-health'

// V47: also pull the hourly self-healed "good models" list (live 200-OK verified)
import { Redis } from '@upstash/redis'
const modelRedis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null
const GOOD_MODELS_KEY = 'omnirouter:good-models'
type GoodEntry = { id: string; ms: number; base: string }
async function getGoodModels(): Promise<GoodEntry[]> {
  if (!modelRedis) return []
  try { return await modelRedis.get<GoodEntry[]>(GOOD_MODELS_KEY) ?? [] } catch { return [] }
}

export const maxDuration = 15

export async function GET(_req: NextRequest) {
  // V74: KV catalog + live free-model discovery in parallel — the 120-model
  // catalog is enriched with the hourly free shortlist (kilo/openrouter/
  // opencode zen/tokenrouter) so /api/v1 lists ALL free top-quality models.
  // V47: goodModels = hourly self-healed verified-working models (brand promise).
  const [edgeP, freeP, healthP, goodModels] = await Promise.all([
    fetch(EDGE_MODELS_URL, { signal: AbortSignal.timeout(4000), cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null),
    fetchAllFreeModels().catch(() => [] as Awaited<ReturnType<typeof fetchAllFreeModels>>),
    getHealth(),
    getGoodModels(),
  ])
  // V41: filter out models the hourly health-checker marked down.
  // Unknown models (not yet probed) stay listed — probe is rotating, absence of data ≠ down.
  // Circuit breaker: if >50% of probed models are down, it's a PROVIDER outage
  // (e.g. kilocode daily quota exhausted) — don't nuke the catalog, serve it all.
  const entries = healthP ? Object.values(healthP) : []
  const downRatio = entries.length ? entries.filter(e => !e.ok).length / entries.length : 0
  const down = new Set(downRatio > 0.5 ? [] : entries.filter(e => !e.ok).map(e => e.id))
  const onlyHealthy = (list: any[]) => list.filter((m: any) => !down.has(m.id))
  if (edgeP && Array.isArray(edgeP?.data) && edgeP.data.length) {
    const kvIds = new Set(edgeP.data.map((m: any) => m.id))
    const extras = (freeP || [])
      .filter(m => !kvIds.has(m.id) && !kvIds.has(`kilo/${m.id}`))
      .slice(0, 50)
      .map(m => ({
        id: m.id,
        object: 'model',
        owned_by: m.provider,
        display_name: m.id,
        context: m.context,
        context_length: m.context,
        free: true,
        quality_score: m.quality_score,
        price: 0,
      }))
    const data = onlyHealthy([...edgeP.data, ...extras])
    // V47: merge verified-good models (hourly self-healed) and add brand
    const goodExtras = goodModels
      .filter((g: GoodEntry) => !kvIds.has(g.id) && !data.find((m: any) => m.id === g.id))
      .map((g: GoodEntry) => ({
        id: g.id,
        object: 'model',
        owned_by: 'hostamar',
        display_name: g.id,
        context: 32768,
        context_length: 32768,
        free: true,
        verified_ms: g.ms,
      }))
    const merged = [...data, ...goodExtras]
    return NextResponse.json(
      { object: 'list', data: merged, source: edgeP.source || 'kv', freeAdded: extras.length, healthFiltered: down.size, brand: 'hostamar.com', goodAdded: goodExtras.length },
      { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400', 'Access-Control-Allow-Origin': '*' } }
    )
  }
  // Tier 2: generated catalog — always available offline
  const data = (MODELS_95 as any[]).map(m => ({
    id: m.id,
    object: 'model',
    owned_by: m.provider || 'hostamar',
    display_name: m.displayName || m.id,
    context: m.context,
    context_length: m.context_length || 0,
    free: !!m.free,
  }))
  return NextResponse.json(
    { object: 'list', data, source: 'local-catalog' },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400', 'Access-Control-Allow-Origin': '*' } }
  )
}
