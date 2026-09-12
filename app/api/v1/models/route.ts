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

export const maxDuration = 15

export async function GET(_req: NextRequest) {
  // V74: KV catalog + live free-model discovery in parallel — the 120-model
  // catalog is enriched with the hourly free shortlist (kilo/openrouter/
  // opencode zen/tokenrouter) so /api/v1 lists ALL free top-quality models.
  const [edgeP, freeP] = await Promise.all([
    fetch(EDGE_MODELS_URL, { signal: AbortSignal.timeout(4000), cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null),
    fetchAllFreeModels().catch(() => [] as Awaited<ReturnType<typeof fetchAllFreeModels>>),
  ])
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
    return NextResponse.json(
      { object: 'list', data: [...edgeP.data, ...extras], source: edgeP.source || 'kv', freeAdded: extras.length },
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
