// Regenerate lib/gateway/model-catalog.generated.ts from LIVE upstream catalogs.
// Sources (authoritative context windows):
//   - Kilo gateway      (context_length + pricing per model)
//   - OpenRouter        (context_length + pricing per model)
//   - NVIDIA NIM        (ids only — contexts from NV_CTX docs table below)
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

const nvData = await getJson('https://integrate.api.nvidia.com/v1/models', { Authorization: `Bearer ${env.NVIDIA_API_KEY}` })
const nvIds = new Set((nvData?.data || []).map(m => m.id))

const zenBase = (env.OPENCODE_ZEN_BASE_URL || 'https://opencode.ai/zen/v1').replace(/\/+$/, '')
const zenData = await getJson(`${zenBase}/models`, { Authorization: `Bearer ${env.OPENCODE_ZEN_API_KEY}`, 'User-Agent': 'Mozilla/5.0' })
const zenModels = zenData?.data || []

let probed = {}
try { probed = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/opencode-ctx.json'), 'utf8')) } catch {}

console.log(`upstreams: openrouter=${orModels.length} kilo=${kiloModels.length} nvidia=${nvIds.size} zen=${zenModels.length}`)

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

// NVIDIA official-docs context lengths for NIM catalog ids (static, docs-sourced;
// used because integrate.api.nvidia.com /models exposes no metadata).
const NV_CTX = {
  '01-ai/yi-large': 32000, 'ai21labs/jamba-1.5-large-instruct': 256000,
  'aisingapore/sea-lion-7b-instruct': 4000, 'bigcode/starcoder2-15b': 16000,
  'databricks/dbrx-instruct': 32000, 'deepseek-ai/deepseek-coder-6.7b-instruct': 16000,
  'deepseek-ai/deepseek-v4-flash-0731': 163840, 'google/codegemma-1.1-7b': 8000,
  'google/codegemma-7b': 8000, 'google/gemma-2b': 8000, 'google/recurrentgemma-2b': 8000,
  'ibm/granite-3.0-3b-a800m-instruct': 4000, 'ibm/granite-3.0-8b-instruct': 128000,
  'ibm/granite-34b-code-instruct': 8000, 'ibm/granite-8b-code-instruct': 128000,
  'meta/codellama-70b': 16000, 'meta/llama-3.1-70b-instruct': 128000,
  'meta/llama-3.1-8b-instruct': 128000, 'meta/llama-3.2-1b-instruct': 128000,
  'meta/llama-3.2-3b-instruct': 128000, 'meta/llama-3.3-70b-instruct': 128000,
  'microsoft/phi-3.5-moe-instruct': 128000, 'mistralai/mistral-7b-instruct-v0.3': 32000,
  'mistralai/mixtral-8x22b-v0.1': 64000, 'nv-mistralai/mistral-nemo-12b-instruct': 128000,
  'nvidia/cosmos-reason2-8b': 128000, 'nvidia/llama-3.1-nemotron-51b-instruct': 128000,
  'nvidia/llama-3.1-nemotron-70b-instruct': 128000, 'nvidia/llama-3.1-nemotron-nano-8b-v1': 128000,
  'nvidia/llama-3.1-nemotron-nano-vl-8b-v1': 128000, 'nvidia/llama-3.1-nemotron-ultra-253b-v1': 128000,
  'nvidia/llama-3.3-nemotron-super-49b-v1': 128000, 'nvidia/llama-3.3-nemotron-super-49b-v1.5': 128000,
  'nvidia/llama3-chatqa-1.5-70b': 8000, 'nvidia/mistral-nemo-minitron-8b-8k-instruct': 8000,
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning': 256000, 'nvidia/nemotron-3.5-lightning-30b-a3b': 128000,
  'nvidia/nemotron-4-340b-instruct': 4000, 'nvidia/nemotron-4-340b-reward': 4000,
  'nvidia/nemotron-mini-4b-instruct': 4000, 'nvidia/nemotron-nano-12b-v2-vl': 128000,
  'nvidia/nemotron-nano-3-30b-a3b': 128000, 'nvidia/nemotron-parse': 8000,
  'nvidia/neva-22b': 4000, 'nvidia/nvidia-nemotron-nano-9b-v2': 128000,
  'nvidia/riva-translate-4b-instruct': 4000, 'nvidia/riva-translate-4b-instruct-v1.1': 4000,
  'nvidia/riva-translate-4b-instruct-v2': 4000, 'nvidia/vila': 128000,
 'writer/palmyra-creative-122b': 128000, 'writer/palmyra-fin-70b-32k': 32000,
 'writer/palmyra-med-70b': 128000, 'writer/palmyra-med-70b-32k': 32000,
 // second wave of NIM ids seen on the live /models list
 'google/gemma-3-12b-it': 131072, 'google/gemma-3-4b-it': 131072,
 'meta/llama2-70b': 4096, 'minimaxai/minimax-m3': 1048576,
 'mistralai/codestral-22b-instruct-v0.1': 32000, 'mistralai/mistral-large': 128000,
 'mistralai/mistral-large-2-instruct': 128000, 'mistralai/mistral-nemotron': 128000,
 'nvidia/nemotron-3-nano-30b-a3b': 262144, 'nvidia/nemotron-3-super-120b-a12b': 1000000,
 'nvidia/nemotron-3-ultra-550b-a55b': 512288, 'stepfun-ai/step-3.7-flash': 32000,
 'zyphra/zamba2-7b-instruct': 128000, 'adept/fuyu-8b': 4096,
 'microsoft/phi-3-vision-128k-instruct': 128000, 'meta/llama-3.2-11b-vision-instruct': 128000,
 'meta/llama-3.2-90b-vision-instruct': 128000, 'microsoft/kosmos-2': 4096,
 }

 // non-chat NIM endpoints (embeddings, rerankers, guards, detectors, CLIP) —
 // they cannot serve /chat/completions so they must not appear in the catalog
 const NON_CHAT_NVIDIA = /(embed|rerank|retriever|guard|safety|topic-control|nvclip|detector|calibration|deplot|diffusion|fuyu)/i

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

// 3) nvidia NIM catalog (paid, own key). Live /models exposes no metadata, so
// contexts come from official NIM docs; previous served value as fallback.
for (const id of nvIds) {
  if (entries.has(id)) continue
  if (NON_CHAT_NVIDIA.test(id)) continue
  const ctx = NV_CTX[id] || prevMap[id] || 0
  add(id, 'nvidia', ctx, 'nvidia-docs', isFreeId(id))
}

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
lines.push(`//   openrouter=${orModels.length} kilo=${kiloModels.length} nvidia=${nvIds.size} zen=${zenModels.length}`)
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
