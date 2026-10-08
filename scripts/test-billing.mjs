// scripts/test-billing.mjs — end-to-end billing check (run locally, not deployed):
// 1. create a test Customer + ApiKey in live Turso (clearly marked test rows)
// 2. POST /api/v1/chat/completions     → must bill the key owner
// 3. POST /api/generate                → must bill (no "FULL FREE" bypass, no phantom row)
// 4. POST /api/v1/embeddings           → customer key = 1cr
// 5. credits=0 → every endpoint must answer 402 with the bKash number
// 6. DELETE all test rows (leave no trace)
// Usage: node scripts/test-billing.mjs           (tests https://hostamar.com)
//        BILLING_TEST_BASE=http://localhost:3011 node scripts/test-billing.mjs
import { createClient } from '@libsql/client'
import { readFileSync } from 'node:fs'

const BASE = process.env.BILLING_TEST_BASE || 'https://hostamar.com'
const ENV_RAW = readFileSync('/home/romel/hostamar.com/.env.local', 'utf8')
let AUTH_TOKEN = ''
const env = Object.fromEntries(ENV_RAW.split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => {
    let k = l.slice(0, l.indexOf('=')).trim()
    let v = l.slice(l.indexOf('=') + 1).trim()
    // strip surrounding quotes .env style
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    // DATABASE_URL carries ?authToken=... — split it out
    if (v.includes('?authToken=')) { const [u, t] = v.split('?authToken='); v = u; if (!AUTH_TOKEN) AUTH_TOKEN = t }
    return [k, v]
  }))
const db = createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN || AUTH_TOKEN })

const TEST_ID = 'test_billing_' + Date.now().toString(36)
const TEST_EMAIL = TEST_ID + '@hostamar-test.invalid'
const RAW_KEY = 'hk_live_test_' + Date.now().toString(36)
const { createHash } = await import('node:crypto')
const KEY_HASH = createHash('sha256').update(RAW_KEY).digest('hex')
const AUTH = { 'Authorization': `Bearer ${RAW_KEY}`, 'Content-Type': 'application/json' }

const results = []
const step = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }
const credits = async () => Number((await db.execute({ sql: `SELECT credits FROM "Customer" WHERE id = ?`, args: [TEST_ID] })).rows[0]?.credits ?? -1)
const post = (path, body) => fetch(BASE + path, { method: 'POST', headers: AUTH, body: JSON.stringify(body) })

try {
  // 1. test customer + key (hash at rest, same as lib/apikey.ts). Prisma
  // defaults (@updatedAt, password default) never fire on raw SQL — pass both.
  await db.execute({ sql: `INSERT INTO "Customer" (id, email, password, name, role, credits, "customerId", "updatedAt", "createdAt") VALUES (?, ?, ?, ?, 'customer', 100, ?, ?, ?)`, args: [TEST_ID, TEST_EMAIL, 'test-billing-no-login-' + TEST_ID, 'Billing Test', TEST_ID, new Date().toISOString(), new Date().toISOString()] })
  await db.execute({ sql: `INSERT INTO "ApiKey" (id, key, name, "customerId", "canGenerateImage", "canGenerateVideo", "canUseChat", "rateLimitPerMinute", "totalRequests", "isActive", "updatedAt", "createdAt") VALUES (?, ?, ?, ?, 1, 1, 1, 60, 0, 1, ?, ?)`, args: [TEST_ID + '_key', KEY_HASH, 'billing-test', TEST_ID, new Date().toISOString(), new Date().toISOString()] })
  step('seed test customer + apikey', true, `credits=100 @ ${BASE}`)

  // 2. chat — must bill
  const r = await post('/api/v1/chat/completions', { model: 'hostamar-1m-a', messages: [{ role: 'user', content: 'say ok' }] })
  const body = await r.json().catch(() => ({}))
  const charged = body?.credits?.charged ?? null
  step('POST /api/v1/chat/completions', r.status === 200, `HTTP ${r.status}`)
  step('chat billed the key owner', typeof charged === 'number' && charged > 0, `charged=${charged}`)
  const afterChat = await credits()
  step('chat debited Customer.credits', afterChat >= 0 && afterChat < 100, `100 -> ${afterChat}`)

  // 3. /api/generate — real charge, no free bypass. Exactly ONE new audit row
  // (a phantom second row was the old "FULL FREE" bug signature).
  const rowsBefore = (await db.execute({ sql: `SELECT COUNT(*) n FROM "CreditTransaction" WHERE "customerId" = ?`, args: [TEST_ID] })).rows[0].n
  const g = await post('/api/generate', { serviceId: 'logo-design', prompt: 'billing test' })
  const gb = await g.json().catch(() => ({}))
  step('POST /api/generate', g.status === 200 && gb.charged > 0, `HTTP ${g.status} charged=${gb.charged}`)
  step('/api/generate not free', gb.isFree === false, `isFree=${gb.isFree}`)
  const afterGen = await credits()
  step('/api/generate debited Customer.credits', afterGen === afterChat - (gb.charged || 0), `${afterChat} - ${gb.charged} -> ${afterGen}`)
  const rowsAfter = (await db.execute({ sql: `SELECT COUNT(*) n FROM "CreditTransaction" WHERE "customerId" = ?`, args: [TEST_ID] })).rows[0].n
  step('/api/generate wrote exactly 1 audit row', Number(rowsAfter) - Number(rowsBefore) === 1, `${rowsBefore} -> ${rowsAfter}`)

  // 4. embeddings — 1cr for customer keys (master key path stays free)
  const e = await post('/api/v1/embeddings', { model: 'text-embedding-3-small', input: 'hello' })
  const afterEmb = await credits()
  step('POST /api/v1/embeddings (upstream may 500, debit precedes it)', e.status === 200 || e.status === 500, `HTTP ${e.status}`)
  step('/api/v1/embeddings debited 1cr', afterEmb === afterGen - 1, `${afterGen} -> ${afterEmb}`)

  // 5. exhausted wallet → 402 + bKash, on every charged endpoint
  await db.execute({ sql: `UPDATE "Customer" SET credits = 0 WHERE id = ?`, args: [TEST_ID] })
  for (const [name, path, payload] of [
    ['chat/completions', '/api/v1/chat/completions', { model: 'hostamar-1m-a', messages: [{ role: 'user', content: 'hi' }] }],
    ['generate', '/api/generate', { serviceId: 'logo-design', prompt: 'x' }],
    ['embeddings', '/api/v1/embeddings', { model: 'text-embedding-3-small', input: 'x' }],
  ]) {
    const z = await post(path, payload)
    const zb = await z.json().catch(() => ({}))
    step(`${name}: 0 credits -> 402 + bKash`, z.status === 402 && (zb.bkash === '01822417463'), `HTTP ${z.status} bkash=${zb.bkash}`)
  }
  step('402 left credits untouched (no negative balance)', (await credits()) === 0, `credits=${await credits()}`)
} catch (e) {
  step('unexpected', false, e.message)
} finally {
  // 6. cleanup — delete test rows (balance already verified)
  await db.execute({ sql: `DELETE FROM "ApiKey" WHERE "customerId" = ?`, args: [TEST_ID] }).catch(() => {})
  await db.execute({ sql: `DELETE FROM "CreditTransaction" WHERE "customerId" = ?`, args: [TEST_ID] }).catch(() => {})
  await db.execute({ sql: `DELETE FROM "Video" WHERE "customerId" = ?`, args: [TEST_ID] }).catch(() => {})
  await db.execute({ sql: `DELETE FROM "Customer" WHERE id = ?`, args: [TEST_ID] }).catch(() => {})
  console.log('cleanup done — test rows deleted')
}
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} PASS`)
process.exit(failed.length ? 1 : 0)
