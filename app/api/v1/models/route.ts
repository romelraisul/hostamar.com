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

export async function GET(_req: NextRequest) {
  // Tier 1: worker KV — the same 120-model catalog ai.hostamar.com serves
  try {
    const r = await fetch(EDGE_MODELS_URL, { signal: AbortSignal.timeout(4000), cache: 'no-store' })
    if (r.ok) {
      const d: any = await r.json()
      if (Array.isArray(d?.data) && d.data.length) {
        return NextResponse.json(
          { object: 'list', data: d.data, source: d.source || 'kv' },
          { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400', 'Access-Control-Allow-Origin': '*' } }
        )
      }
    }
  } catch {
    /* fall through */
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
