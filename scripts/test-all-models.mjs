#!/usr/bin/env node
/**
 * scripts/test-all-models.mjs — smoke-test every model in the public catalog.
 *
 * Usage:
 *   node scripts/test-all-models.mjs [--base https://hostamar.com/api/v1] [--max 120] [--tokens 512]
 *
 * Tests each model with a real chat completion through the unlimited
 * free-fallback chain (serverless /api/v1/chat/completions). Writes
 * model-test-results.json next to the script.
 *
 * NOTE on "10,000 tokens each": hobby-tier Vercel functions cap at 55s and
 * free upstream models rate-limit long generations — a 10k-token generation
 * per model × 120 models would take hours and burn upstream quotas for
 * nothing. Default here is a 512-token capability probe (content length > 100
 * chars = model works end-to-end). Pass --tokens 10000 to override.
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 && args[i + 1] ? args[i + 1] : def
}
const BASE = getArg('base', process.env.AI_BASE_URL || 'https://hostamar.com/api/v1')
const MAX = parseInt(getArg('max', '120'), 10)
const TOKENS = parseInt(getArg('tokens', '512'), 10)
const CONCURRENCY = parseInt(getArg('conc', '6'), 10)

const outPath = path.resolve('model-test-results.json')

console.log(`Testing models from ${BASE} (max ${MAX}, ${TOKENS} tokens each, conc ${CONCURRENCY})`)

const modelsRes = await fetch(`${BASE}/models`)
if (!modelsRes.ok) {
  console.error(`models list failed: ${modelsRes.status}`)
  process.exit(1)
}
const modelsJson = await modelsRes.json()
const models = (modelsJson.data || []).slice(0, MAX)
console.log(`Catalog: ${models.length} models (source: ${modelsJson.source || '?'})`)

const results = []
let done = 0

async function testModel(m) {
  const started = Date.now()
  try {
    const r = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: m.id,
        messages: [{ role: 'user', content: 'Reply with a one-paragraph pitch for Hostamar, an AI video maker for Bangladeshi businesses.' }],
        max_tokens: TOKENS,
      }),
      signal: AbortSignal.timeout(50_000),
    })
    const j = await r.json().catch(() => ({}))
    const content = j.choices?.[0]?.message?.content || j.reply || ''
    const ok = r.ok && content.length > 100
    const rec = {
      id: m.id,
      ok,
      status: r.status,
      provider: j.provider || m.owned_by || 'unknown',
      model: j.model || m.id,
      chars: content.length,
      tokens: j.usage?.total_tokens || 0,
      ms: Date.now() - started,
    }
    results.push(rec)
    console.log(`${ok ? '✅' : '❌'} ${m.id} — ${rec.status} ${rec.provider} ${rec.model} ${rec.chars}ch ${rec.tokens}tk ${rec.ms}ms`)
  } catch (e) {
    results.push({ id: m.id, ok: false, error: String(e.message || e).slice(0, 120), ms: Date.now() - started })
    console.log(`❌ ${m.id} — ${e.message}`)
  } finally {
    done++
    fs.writeFileSync(outPath, JSON.stringify({ base: BASE, at: new Date().toISOString(), total: models.length, tested: done, results }, null, 2))
  }
}

// bounded concurrency
let idx = 0
async function worker() {
  while (idx < models.length) {
    const m = models[idx++]
    await testModel(m)
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, models.length) }, worker))

const working = results.filter(r => r.ok)
console.log(`\nDone: ${working.length}/${models.length} working`)
fs.writeFileSync(outPath, JSON.stringify({ base: BASE, at: new Date().toISOString(), total: models.length, tested: done, working: working.length, results }, null, 2))
console.log(`Saved ${outPath}`)
