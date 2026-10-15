// Regenerate lib/gateway/model-catalog.generated.ts from LIVE upstream catalogs.
// Sources (authoritative context windows):
//   - Kilo gateway      (context_length + pricing per model)
//   - OpenRouter        (context_length + pricing per model)
//   - OpenCode Zen      (ids only — contexts from scripts/opencode-ctx.json probes)
// Rules:
//   - zero-cost: every free model from ANY provider is included
//   - paid models kept only if routable (present on a real upstream)
//   - phantom ids (no upstream) are dropped and reported
// Run: node scripts/gen-model-catalog.mjs   (reads .env itself)
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)

function loadEnv() {
  const env = {}
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}
const env = loadEnv()

async function getJson(url, headers = {}) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ---------- fetch upstreams ----------
const orData = await getJson('https://openrouter.ai/api/v1/models')
const orModels = orData?.data || []

const kiloBase = (env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway').replace(/\/+$/, '')
const kiloData = await getJson(`${kiloBase}/models`, { Authorization: `Bearer ${env.KILOCODE_API_KEY}` })
const kiloModels = kiloData?.data || []


const zenBase = (env.OPENCODE_ZEN_BASE_URL || 'https://opencode.ai/zen/v1').replace(/\/+$/, '')
const zenData = await getJson(`${zenBase}/models`, { Authorization: `Bearer ${env.OPENCODE_ZEN_API_KEY}`, 'User-Agent': 'Mozilla/5.0' })
const zenModels = zenData?.data || []

let probed = {}
try { probed = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/opencode-ctx.json'), 'utf8')) } catch {}

console.log(`upstreams: openrouter=${orModels.length} kilo=${kiloModels.length} zen=${zenModels.length}`)

// ---------- indexes ----------
const byId = arr => Object.fromEntries(arr.map(m => [m.id, m]))
const OR = byId(orModels)
const KILO = byId(kiloModels)

const ctxOf = m => m?.context_length || m?.top_provider?.context_length || null
const priceOf = m => {
  const p = m?.pricing
  if (!p) return null
  const pr = parseFloat(p.prompt ?? 'NaN')
  const pc = parseFloat(p.completion ?? 'NaN')
  if (Number.isNaN(pr) || Number.isNaN(pc)) return null
  return pr + pc
}



const fmt = n => (n >= 1_000_000 ? `${Math.round((n / 1_000_000) * 10) / 10}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`)
const isFreeId = id => /(:free$|\/free$|-free$)/i.test(id)

// ---------- build unified entries ----------
// entry: { id, route, context_length, source, free }
const entries = new Map()
const add = (id, route, ctx, source, free) => {
  if (!id) return
  entries.set(id, { id, route, context_length: ctx || 0, source, free: free ?? isFreeId(id) })
}

// 1) free models from EVERY provider — the zero-cost rule
// NON_CHAT: generation/embedding/rerank models can't serve /chat/completions
const NON_CHAT = /(lyria|image|video|embed|rerank|-tts$|whisper|speech|seedream|hailuo|kling)/i
for (const m of kiloModels) {
  const free = isFreeId(m.id) || priceOf(m) === 0
  if (!free || NON_CHAT.test(m.id)) continue
  add(m.id, 'kilo', ctxOf(m), 'kilo', true)
}
for (const m of orModels) {
  if (isFreeId(m.id)) add(m.id, 'openrouter', ctxOf(m), 'openrouter', true)
}
for (const m of zenModels) {
  // skip models that failed even minimal probes (upstream unavailable right now)
  if (isFreeId(m.id) && probed[m.id] && !probed[m.id].min_context) continue
  const id = `opencode/${m.id}` // explicit route prefix; chat strips it when forwarding
  if (isFreeId(m.id)) add(id, 'opencode', probed[m.id]?.min_context || 0, 'zen-probe', true)
}

// 2) paid models already served / proven workhorses.
// ZERO-COST RULE: paid ids never route to the free-only gateways (kilo,
// opencode, tokenrouter) — they stay on openrouter/nvidia where the operator
// explicitly holds billing. Kilo-only paid models are therefore NOT listed
// (they would be blocked by the chat-route free filter anyway).
const SERVED_PAID = [
  'moonshotai/kimi-k3', 'moonshotai/kimi-k2.6', 'minimax/minimax-m1',
  'deepseek/deepseek-v4-flash-0731',
]
const EXTRA_PAID = [
  // world-ranking fallback targets + proven workhorses (openrouter-hosted)
  'z-ai/glm-5.3', 'qwen/qwen3.8-max', 'qwen/qwen3.7-flash', 'meta/muse-spark-1.2',
  'thinkingmachines/inkling', 'thinkingmachines/inkling-small', 'poolside/laguna-xs-2.1',
  'poolside/laguna-s-2.1', 'x-ai/grok-4.6', 'google/gemma-4-31b-it', 'openai/gpt-oss-120b',
  'openai/gpt-oss-20b', 'meta/muse-glimmer-30b',
]
const droppedPaidKiloOnly = []
for (const id of [...SERVED_PAID, ...EXTRA_PAID]) {
  if (OR[id]) add(id, 'openrouter', ctxOf(OR[id]), 'openrouter', false)
  else if (KILO[id]) droppedPaidKiloOnly.push(id)
}

// ---------- previously served map (docs-sourced fallback + phantom report) ----------
// Read from git HEAD so the shim never breaks regeneration after a redeploy.
function readPrevMap() {
  try {
    const { execSync } = require('node:child_process')
    const head = execSync('git show HEAD:lib/gateway/95-models.ts', {
      cwd: ROOT, encoding: 'utf8', timeout: 10_000,
    })
    return Object.fromEntries(
      [...head.matchAll(/"([^"]+)":\s*(\d+)/g)].map(m => [m[1], parseInt(m[2])])
        .filter(([id]) => !id.startsWith('hostamar') && id !== 'minimax-m3'))
  } catch {
    return {}
  }
}
const prevMap = { ...readPrevMap() }


// 4) hostamar aliases (stable customer-facing ids)
add('hostamar-1m-a', 'hostamar-alias', 1_048_576, 'alias', false)
add('hostamar-1m-b', 'hostamar-alias', 1_048_576, 'alias', false)
add('hostamar-own', 'ollama-local', 32_768, 'local', false)
add('minimax-m3', 'ollama-local', 32_768, 'local', false)

const dropped = []
for (const [id, oldCtx] of Object.entries(prevMap)) {
  if (!entries.has(id)) dropped.push(`${id} (was ${fmt(oldCtx)})`)
}

// ---------- order + emit ----------
const fmtCtx = e => (e.context_length ? `[${fmt(e.context_length)}]` : '')
const list = [...entries.values()].sort((a, b) => {
  const tier = e => (e.id.startsWith('hostamar-1m') ? 0 : e.free && e.context_length >= 900_000 ? 1 : e.free ? 2 : e.context_length >= 900_000 ? 3 : 4)
  return tier(a) - tier(b) || b.context_length - a.context_length || a.id.localeCompare(b.id)
})

const lines = []
lines.push('// GENERATED by scripts/gen-model-catalog.mjs — DO NOT EDIT BY HAND')
lines.push(`// Generated ${new Date().toISOString()} from live upstream catalogs:`)
lines.push(`//   openrouter=${orModels.length} kilo=${kiloModels.length} zen=${zenModels.length}`)
lines.push('// Re-run: node scripts/gen-model-catalog.mjs && npm run build')
lines.push('')
lines.push('export type CatalogModel = {')
lines.push('  id: string')
lines.push('  provider: string')
lines.push('  context: string')
lines.push('  context_length: number')
lines.push('  displayName: string')
lines.push('  free: boolean')
lines.push('}')
lines.push('')
lines.push('export const CATALOG_MODELS: CatalogModel[] = [')
for (const e of list) {
  const prov = e.id.startsWith('opencode/') ? 'opencode' : e.id.startsWith('hostamar') || e.id === 'minimax-m3' ? 'hostamar' : e.route
  const disp = `${e.id}${e.context_length ? ` [${fmt(e.context_length)}]` : ''}`
  lines.push(`  { id: ${JSON.stringify(e.id)}, provider: ${JSON.stringify(prov)}, context: ${JSON.stringify(e.context_length ? fmt(e.context_length) : '?')}, context_length: ${e.context_length}, free: ${e.free}, displayName: ${JSON.stringify(disp)} },`)
}
lines.push(']')
lines.push('')
lines.push('export const CONTEXT_MAP_GENERATED: Record<string, number> = {')
for (const e of list) lines.push(`  ${JSON.stringify(e.id)}: ${e.context_length},`)
lines.push('}')
lines.push('')
lines.push('// Deterministic upstream routing: id -> provider used by /api/v1/chat/completions.')
lines.push('export const ROUTE_MAP: Record<string, string> = {')
for (const e of list) lines.push(`  ${JSON.stringify(e.id)}: ${JSON.stringify(e.route)},`)
lines.push('}')
lines.push('')

fs.writeFileSync(path.join(ROOT, 'lib/gateway/model-catalog.generated.ts'), lines.join('\n'))

console.log(`\nwrote model-catalog.generated.ts: ${list.length} models`)
console.log(`free: ${list.filter(e => e.free).length} | 1M+: ${list.filter(e => e.context_length >= 900_000).length}`)
console.log(`dropped phantoms (${dropped.length}):`)
for (const d of dropped) console.log(`  - ${d}`)
const fixed = list.filter(e => prevMap[e.id] && prevMap[e.id] !== e.context_length)
console.log(`context corrections (${fixed.length}):`)
for (const e of fixed.slice(0, 20)) console.log(`  ~ ${e.id}: ${prevMap[e.id]} -> ${e.context_length}`)
