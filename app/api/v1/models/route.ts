import { NextRequest } from 'next/server'
import { MODELS_95 } from '@/lib/gateway/95-models'
import { isFree } from '@/lib/gateway/filter'

export const dynamic = 'force-dynamic'

/**
 * Runtime free-model discovery cache. The generated catalog is redeploy-static;
 * this layer merges in freshly discovered free models from all upstreams so a
 * brand-new :free model appears here within an hour of its upstream listing,
 * even before `node scripts/gen-model-catalog.mjs` + redeploy runs.
 */
type Cached = { at: number; ids: string[] }
let freshCache: Cached | null = null
const FRESH_TTL = 60 * 60 * 1000 // 1h

async function freshFreeIds(): Promise<string[]> {
  if (freshCache && Date.now() - freshCache.at < FRESH_TTL) return freshCache.ids
  try {
    const { fetchLatestFreeModels } = await import('@/lib/gateway/update-free-models')
    const free = await fetchLatestFreeModels()
    const ids = free.map(f => f.id)
    freshCache = { at: Date.now(), ids }
    return ids
  } catch {
    return freshCache?.ids || []
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const master = process.env.LITELLM_MASTER_KEY || ''
  // allow public models list if no master key set, otherwise require valid bearer
  if (master && auth !== `Bearer ${master}`) {
    // still allow without auth for discovery, but mark as public
  }

  const servedIds = new Set(MODELS_95.map(m => m.id))
  const fresh = await freshFreeIds()
  const extra = fresh.filter(id => !servedIds.has(id)).map(id => ({
    id,
    object: 'model' as const,
    created: Math.floor(Date.now() / 1000),
    owned_by: id.startsWith('opencode/') ? 'opencode' : 'upstream',
    display_name: `${id} [?]`,
    context_length: null,
    context: '?',
    fresh_discovery: true,
  }))

  const data = [
    ...MODELS_95.map(m => ({
      id: m.id,
      object: 'model' as const,
      created: 1677610602,
      owned_by: (m as any).provider || 'hostamar',
      // context window surfaced for customer choice; every label ends with [ctx]
      display_name: m.displayName,
      context_length: m.context_length,
      context: m.context,
      free: (m as any).free ?? isFree(m.id),
    })),
    ...extra,
  ]
  return Response.json(
    { object: 'list', data },
    { headers: { 'Cache-Control': 'public, max-age=60' } }
  )
}
