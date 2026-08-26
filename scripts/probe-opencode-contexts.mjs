// Empirically probe real context windows of OpenCode Zen free models.
// These upstream /models endpoints expose NO context metadata, so we send
// oversized prompts (free tier = zero cost) and record pass/fail thresholds.
// Result: scripts/opencode-ctx.json — consumed by gen-model-catalog.mjs
import fs from 'node:fs'

const BASE = (process.env.OPENCODE_ZEN_BASE_URL || 'https://opencode.ai/zen/v1').replace(/\/+$/, '')
const KEY = process.env.OPENCODE_ZEN_API_KEY

if (!KEY) {
  console.error('OPENCODE_ZEN_API_KEY not set')
  process.exit(1)
}

async function probe(model, approxTokens) {
  // 'word ' ≈ 5 chars ≈ 1.25 tokens → tokens*4 chars is conservative-safe
  const text = 'word '.repeat(Math.floor(approxTokens * 0.8))
  const t0 = Date.now()
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: text }], max_tokens: 1 }),
      signal: AbortSignal.timeout(120_000),
    })
    const dt = ((Date.now() - t0) / 1000).toFixed(1)
    if (res.ok) return { ok: true, dt }
    const body = (await res.text()).slice(0, 200)
    return { ok: false, status: res.status, body, dt }
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200), dt: ((Date.now() - t0) / 1000).toFixed(1) }
  }
}

// discover free-ish models on zen
const mres = await fetch(`${BASE}/models`, {
  headers: { Authorization: `Bearer ${KEY}`, 'User-Agent': 'Mozilla/5.0' },
})
if (!mres.ok) { console.error('models list failed', mres.status); process.exit(1) }
const mdata = await mres.json()
const targets = mdata.data.map(m => m.id).filter(id => /-free$|x-preview/i.test(id))
console.log(`probing ${targets.length} free models:`, targets.join(', '))

const TIERS = [131_072, 262_144, 524_288, 1_048_576]
const out = {}

for (const id of targets) {
  out[id] = { probed_at: new Date().toISOString(), tiers: {} }
  let lastPass = 0
  let stop = false
  for (const tk of TIERS) {
    if (stop) break
    const r = await probe(id, Math.round(tk * 0.75))
    out[id].tiers[tk] = r
    console.log(`${id} @${tk}: ${r.ok ? 'PASS' : 'FAIL'} (${r.dt}s)`)
    if (r.ok) lastPass = tk
    else stop = true
  }
  out[id].min_context = lastPass || null
}

fs.writeFileSync(new URL('./opencode-ctx.json', import.meta.url), JSON.stringify(out, null, 2))
console.log('wrote scripts/opencode-ctx.json')
