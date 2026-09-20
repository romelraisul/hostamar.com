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

export const maxDuration = 15

export async function GET(_req: NextRequest) {
  // V74: KV catalog + live free-model discovery in parallel — the 120-model
  // catalog is enriched with the hourly free shortlist (kilo/openrouter/
  // opencode zen/tokenrouter) so /api/v1 lists ALL free top-quality models.
  const [edgeP, freeP, healthP] = await Promise.all([
    fetch(EDGE_MODELS_URL, { signal: AbortSignal.timeout(4000), cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null),
    fetchAllFreeModels().catch(() => [] as Awaited<ReturnType<typeof fetchAllFreeModels>>),
    getHealth(),
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
    return NextResponse.json(
      { object: 'list', data, source: edgeP.source || 'kv', freeAdded: extras.length, healthFiltered: down.size },
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
