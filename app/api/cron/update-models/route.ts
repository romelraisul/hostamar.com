import { NextRequest } from 'next/server'
import { fetchLatestFreeModels, buildCatalog } from '@/lib/gateway/update-free-models'
import { fetchLatest1M } from '@/lib/gateway/hostamar-models'
import { getWorldRanking, getNvidiaLimits, getFallbackForModel, getTopModel } from '@/lib/gateway/ranking-fallback'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * GET /api/cron/update-models
 * Daily Vercel Cron: re-checks :free catalogs across ALL upstream gateways
 * (openrouter, kilo, opencode zen) plus nvidia and the newest 1M models,
 * returning a fresh catalog snapshot. The static generated list
 * (lib/gateway/model-catalog.generated.ts) is the served catalog; this endpoint
 * reports drift so stale entries are caught without a redeploy.
 * Regenerate after reviewing drift: node scripts/gen-model-catalog.mjs
 */
export async function GET(req: NextRequest) {
  // Vercel-scheduled cron calls carry x-vercel-cron — always trusted.
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  if (!isVercelCron && CRON_SECRET) {
    const auth = req.headers.get('authorization') || ''
    const q = req.nextUrl.searchParams.get('secret') || ''
    if (auth !== `Bearer ${CRON_SECRET}` && q !== CRON_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const [free, latest1M, catalog, ranking, nvidiaLimits] = await Promise.all([
    fetchLatestFreeModels(),
    fetchLatest1M(),
    buildCatalog(),
    getWorldRanking(true),
    getNvidiaLimits(true),
  ])

  // World-ranking fallback snapshot: what each failing family reroutes to today
  const fallbackMap = {
    'glm-family (nvidia/glm-4.5, glm-5.3)': await getFallbackForModel('nvidia/glm-4.5'),
    'nemotron/llama-family': await getFallbackForModel('nvidia/nemotron-4-340b'),
    'default': await getTopModel(),
  }

  // Drift check: ids present in the live free catalogs but missing from the
  // served 95 (or vice versa) — surfaced for the operator to refresh the list.
  const servedIds = new Set(catalog.models.map(m => m.id))
  const newFree = free.filter(f => !servedIds.has(f.id)).map(f => f.id)
  const goneFree = [...servedIds].filter(id => id.includes(':free') && !free.some(f => f.id === id))

  return Response.json({
    ok: true,
    at: new Date().toISOString(),
    servedCount: catalog.models.length,
    freeAvailable: free.length,
    freeKept: catalog.freeCount,
    latest1M,
    hostamarAliases: {
      'hostamar-1m-a': latest1M[0] || 'moonshotai/kimi-k3',
      'hostamar-1m-b': latest1M[1] || 'minimax/minimax-m1',
    },
    worldRanking: ranking.slice(0, 5),
    fallbackMap,
    nvidiaLimitsKnown: Object.keys(nvidiaLimits).length,
    drift: { newFreeModels: newFree, removedFreeModels: goneFree },
  })
}
