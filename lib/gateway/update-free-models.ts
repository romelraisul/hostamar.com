import { isFree, shouldKeep } from './filter'
import { CATALOG_MODELS, CONTEXT_MAP_GENERATED } from './95-models'

export type FreeModel = { id: string; context_length: number; provider: string }

const zenBase = (process.env.OPENCODE_ZEN_BASE_URL || 'https://opencode.ai/zen/v1').replace(/\/+$/, '')

/**
 * Discover free models across ALL upstream gateways (zero-cost rule):
 *   - Kilo gateway      — pricing==0 OR :free/-free suffix
 *   - OpenRouter        — :free suffix
 *   - OpenCode Zen      — -free/x-preview ids (no metadata; contexts from probes)
 * Previously this only queried OpenRouter filtered to 4 hardcoded providers,
 * which is why x-preview-f-free (OpenCode Zen only) never appeared.
 */
export async function fetchLatestFreeModels(): Promise<FreeModel[]> {
  const out = new Map<string, FreeModel>()

  const [orRes, kiloRes, zenRes] = await Promise.all([
    fetch('https://openrouter.ai/api/v1/models', {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null),
    fetch(`${(process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway').replace(/\/+$/, '')}/models`, {
      headers: process.env.KILOCODE_API_KEY ? { Authorization: `Bearer ${process.env.KILOCODE_API_KEY}` } : undefined,
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null),
    fetch(`${zenBase}/models`, {
      headers: {
        ...(process.env.OPENCODE_ZEN_API_KEY ? { Authorization: `Bearer ${process.env.OPENCODE_ZEN_API_KEY}` } : {}),
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null),
  ])

  const orModels: any[] = orRes?.data || []
  const kiloModels: any[] = kiloRes?.data || []
  const zenModels: any[] = zenRes?.data || []

  for (const m of kiloModels) {
    const p = m.pricing
    const pr = p ? parseFloat(p.prompt) : NaN
    const pc = p ? parseFloat(p.completion) : NaN
    const priceZero = !Number.isNaN(pr) && !Number.isNaN(pc) && pr + pc === 0
    if (!isFree(m.id) && !priceZero) continue
    out.set(m.id, {
      id: m.id,
      context_length: m.context_length || m.top_provider?.context_length || 128000,
      provider: 'kilo',
    })
  }
  for (const m of orModels) {
    if (!isFree(m.id)) continue
    out.set(m.id, {
      id: m.id,
      context_length: m.context_length || m.top_provider?.context_length || 128000,
      provider: 'openrouter',
    })
  }
  for (const m of zenModels) {
    if (!isFree(m.id)) continue
    // contexts come from scripts/opencode-ctx.json probes via the generated catalog
    const known = CONTEXT_MAP_GENERATED[`opencode/${m.id}`] || 0
    out.set(`opencode/${m.id}`, { id: `opencode/${m.id}`, context_length: known, provider: 'opencode' })
  }

  return Array.from(out.values()).sort((a, b) => b.context_length - a.context_length)
}

/**
 * Rebuild the full catalog from the generated source of truth. Ordering:
 * hostamar aliases first, then everything else, local ollama models last.
 * Deterministic and safe to run daily from cron.
 */
export async function buildCatalog(): Promise<{
  models: { id: string; provider: string; context: string; context_length: number; displayName: string }[]
  latest1M: string[]
  freeCount: number
}> {
  const [{ fetchLatest1M }] = await Promise.all([import('./hostamar-models')])
  const latest1MArr = await fetchLatest1M()
  const fmt = (n: number) =>
    n >= 1000000 ? `${Math.round((n / 1000000) * 10) / 10}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`
  const kept = CATALOG_MODELS.filter(shouldKeep)
  const models = kept.map(m => ({
    id: m.id,
    provider: m.provider,
    context: fmt(m.context_length),
    context_length: m.context_length,
    displayName: `${m.id} [${fmt(m.context_length)}]`,
  }))
  const first = models.filter(m => m.id.startsWith('hostamar-1m'))
  const last = models.filter(m => m.id === 'hostamar-own' || m.id === 'minimax-m3')
  const middle = models.filter(m => !first.includes(m) && !last.includes(m))
  return {
    models: [...first, ...middle, ...last],
    latest1M: latest1MArr,
    freeCount: kept.filter(m => isFree(m.id)).length,
  }
}
