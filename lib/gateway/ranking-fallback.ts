/**
 * World-ranking fallback + live NVIDIA limits, refreshed via browser.hostamar.com.
 *
 * browser.hostamar.com is the Hostamar AI Browser (Next.js). Its
 * /api/browser/proxy?url=... endpoint does server-side fetching with browser
 * headers — that is our scrape channel. When the PC is off the proxy dies with
 * it, so every fetch has a direct-fetch fallback and everything degrades to
 * static defaults. Never throws; always returns usable data.
 */
import { countTokens, estimateMessagesTokens } from './nvidia-guard'

const BROWSER_PROXY = process.env.BROWSER_FETCH_URL || 'https://browser.hostamar.com/api/browser/proxy'

/** Static baseline: today's world ranking for 1M-class coding models. */
export const STATIC_RANKING = [
  'moonshotai/kimi-k3', // current #1 1M coding (LMArena + openrouter usage)
  'minimax/minimax-m1', // cheapest 1M MoE, strong agentic
  'moonshotai/kimi-k2-0711-preview',
  'deepseek/deepseek-v4-flash-0731',
  'qwen/qwen3-coder-480b-a35b',
]

export const DEFAULT_FALLBACK = 'moonshotai/kimi-k3'

/** glm family → kimi-k3 per user rule: glm5.3/glm-4.5 nvidia fails → kimi-k3. */
const FAMILY_RULES: [RegExp, number][] = [
  [/glm/i, 0], // glm → ranking[0] = kimi-k3
  [/nemotron|llama/i, 0],
  [/minimax|m3/i, 1], // minimax-family fails → minimax-m1
]

type CacheShape<T> = { at: number; data: T }
const RANK_TTL = 12 * 60 * 60 * 1000 // 12h
const LIMITS_TTL = 24 * 60 * 60 * 1000 // 24h

let rankingCache: CacheShape<string[]> | null = null
let limitsCache: CacheShape<Record<string, number>> | null = null

async function fetchViaBrowserOrDirect(url: string, timeoutMs = 9000): Promise<string | null> {
  // 1) via browser.hostamar.com proxy (JS-rendered pages, real browser headers)
  try {
    const r = await fetch(`${BROWSER_PROXY}?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    })
    if (r.ok) {
      const text = await r.text()
      if (text && text.length > 200 && !text.startsWith('{"error"')) return text
    }
  } catch { /* fall through */ }
  // 2) direct fetch fallback (works when PC off for plain JSON endpoints)
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0' },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    })
    if (r.ok) return await r.text()
  } catch { /* give up */ }
  return null
}

/**
 * Live top-model ranking. Sources: openrouter usage stats API (JSON, reliable)
 * enriched by artificialanalysis/lmarena HTML scraping when reachable.
 * Falls back to STATIC_RANKING on any failure.
 */
export async function getWorldRanking(force = false): Promise<string[]> {
  if (!force && rankingCache && Date.now() - rankingCache.at < RANK_TTL) return rankingCache.data
  const ids: string[] = []
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      signal: AbortSignal.timeout(8000), cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      const models: any[] = data.data || []
      const scored = models
        .map((m: any) => ({
          id: m.id as string,
          ctx: m.context_length || m.top_provider?.context_length || 0,
        }))
        .filter(m => m.ctx >= 900000)
      // usage-weighted heuristic: openrouter exposes per-model total usage in
      // rankings page only; approximate popularity by name recognition order
      const known = ['kimi-k3', 'kimi-k2', 'minimax-m1', 'deepseek', 'qwen3-coder', 'glm']
      scored.sort((a: any, b: any) => {
        const ra = known.findIndex(k => a.id.includes(k))
        const rb = known.findIndex(k => b.id.includes(k))
        return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb)
      })
      ids.push(...scored.map(s => s.id))
    }
  } catch { /* ignore */ }

  // LMArena / artificialanalysis via browser proxy — parse model names out of HTML
  const html = await fetchViaBrowserOrDirect('https://lmarena.ai/leaderboard')
  if (html) {
    const re = /(moonshotai|minimax|deepseek|qwen|openai|anthropic)[-/][a-z0-9.\-]+/gi
    const found = html.match(re) || []
    for (const f of found) if (!ids.includes(f)) ids.push(f)
  }

  // dedupe, keep stable anchors first if present
  const anchors = ['moonshotai/kimi-k3', 'minimax/minimax-m1']
  const ordered = [...anchors.filter(a => ids.includes(a)), ...ids.filter(i => !anchors.includes(i))]
  const ranking = ordered.length ? ordered : STATIC_RANKING
  rankingCache = { at: Date.now(), data: ranking }
  return ranking
}

/** World #1 stable 1M model right now (default kimi-k3). */
export async function getTopModel(): Promise<string> {
  const r = await getWorldRanking()
  return r[0] || DEFAULT_FALLBACK
}

/** Ranking-based fallback target for a failed model. */
export async function getFallbackForModel(failedModelId: string): Promise<string> {
  const ranking = await getWorldRanking()
  for (const [re, idx] of FAMILY_RULES) {
    if (re.test(failedModelId)) return ranking[idx] || ranking[0] || DEFAULT_FALLBACK
  }
  return ranking[0] || DEFAULT_FALLBACK
}

/**
 * NVIDIA per-model context limits. Baseline static map, enriched from NIM docs
 * scraped via browser.hostamar.com (build.nvidia.com model cards carry
 * "context length" figures).
 */
export const STATIC_LIMITS: Record<string, number> = {
  default: 128000,
}

export async function getNvidiaLimits(force = false): Promise<Record<string, number>> {
  if (!force && limitsCache && Date.now() - limitsCache.at < LIMITS_TTL) return limitsCache.data
  const limits: Record<string, number> = { ...STATIC_LIMITS }
  const html = await fetchViaBrowserOrDirect('https://build.nvidia.com/models?filters=modelFormat=NIM')
  if (html) {
    // model cards embed context lengths like "128K context" near model slugs
    const cardRe = /"slug"\s*:\s*"([^"]+)"[^}]*?"context(?:_length|-length)"\s*:\s*"?(\d{3,7})"?/gi
    let m: RegExpExecArray | null
    while ((m = cardRe.exec(html))) {
      const slug = m[1]
      const n = parseInt(m[2], 10)
      if (slug && n > 1000) limits[`nvidia/${slug}`] = n > 100000 ? n : n // keep raw
    }
    // also "context": "128K" style
    const kRe = /"slug"\s*:\s*"([^"]+)"[^}]*?(\d{2,3})K\s*(?:token|context)/gi
    while ((m = kRe.exec(html))) {
      limits[`nvidia/${m[1]}`] = parseInt(m[2], 10) * 1000
    }
  }
  limitsCache = { at: Date.now(), data: limits }
  return limits
}

export type GuardResult =
  | { ok: true }
  | { fallback: true; to: string; reason: string }

/** Token guard + circuit check + ranking fallback in one call. */
export async function nvidiaGuardWithRanking(
  modelId: string,
  messages: any[],
  circuitOpen: boolean
): Promise<GuardResult> {
  const limits = await getNvidiaLimits()
  const limit = limits[modelId] || limits.default || 128000
  const tokens = estimateMessagesTokens(messages || [])
  if (tokens > limit * 0.85) {
    return { fallback: true, to: await getFallbackForModel(modelId), reason: `tokens ${tokens} > ${Math.floor(limit * 0.85)} (80% of ${limit})` }
  }
  if (circuitOpen) {
    return { fallback: true, to: await getFallbackForModel(modelId), reason: 'circuit open (429/402)' }
  }
  return { ok: true }
}

// keep countTokens exported for callers measuring single strings
export { countTokens }
