// scripts/test-billing.mjs — one-time end-to-end billing check (run locally, not deployed):
// 1. create a test Customer + ApiKey in live Turso (clearly marked test rows)
// 2. call https://hostamar.com/api/v1/chat/completions with the Bearer key
// 3. assert the response bills the key owner (credits.charged > 0)
// 4. read back the Customer.credits + CreditTransaction row
// 5. DELETE both test rows (leave no trace)
import { createClient } from '@libsql/client'
import { readFileSync } from 'node:fs'

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

const results = []
const step = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }

try {
  // 1. test customer + key (hash at rest, same as lib/apikey.ts). Prisma
  // defaults (@updatedAt, password default) never fire on raw SQL — pass both.
  await db.execute({ sql: `INSERT INTO "Customer" (id, email, password, name, role, credits, "customerId", "updatedAt", "createdAt") VALUES (?, ?, ?, ?, 'customer', 100, ?, ?, ?)`, args: [TEST_ID, TEST_EMAIL, 'test-billing-no-login-' + TEST_ID, 'Billing Test', TEST_ID, new Date().toISOString(), new Date().toISOString()] })
  await db.execute({ sql: `INSERT INTO "ApiKey" (id, key, name, "customerId", "canGenerateImage", "canGenerateVideo", "canUseChat", "rateLimitPerMinute", "totalRequests", "isActive", "updatedAt", "createdAt") VALUES (?, ?, ?, ?, 1, 1, 1, 60, 0, 1, ?, ?)`, args: [TEST_ID + '_key', KEY_HASH, 'billing-test', TEST_ID, new Date().toISOString(), new Date().toISOString()] })
  step('seed test customer + apikey', true, `credits=100`)

  // 2. real call with the Bearer key
  const r = await fetch('https://hostamar.com/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RAW_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'hostamar-1m-a', messages: [{ role: 'user', content: 'say ok' }] }),
  })
  const body = await r.json().catch(() => ({}))
  step('POST /api/v1/chat/completions', r.status === 200, `HTTP ${r.status}`)
  const charged = body?.credits?.charged ?? null
  step('billed key owner (credits.charged > 0)', typeof charged === 'number' && charged > 0, `charged=${charged}`)

  // 3. read back balance + audit row
  const after = await db.execute({ sql: `SELECT credits FROM "Customer" WHERE id = ?`, args: [TEST_ID] })
  const remaining = Number(after.rows[0]?.credits ?? -1)
  step('customer.credits debited', remaining >= 0 && remaining < 100, `100 -> ${remaining}`)
  const tx = await db.execute({ sql: `SELECT "type", amount, "balanceAfter" FROM "CreditTransaction" WHERE "customerId" = ? ORDER BY rowid DESC LIMIT 1`, args: [TEST_ID] })
  step('CreditTransaction audit row', tx.rows.length > 0, tx.rows[0] ? `${tx.rows[0].type} amount=${tx.rows[0].amount}` : 'none')
} catch (e) {
  step('unexpected', false, e.message)
} finally {
  // 4. cleanup — delete test rows (balance already verified)
  await db.execute({ sql: `DELETE FROM "ApiKey" WHERE "customerId" = ?`, args: [TEST_ID] }).catch(() => {})
  await db.execute({ sql: `DELETE FROM "CreditTransaction" WHERE "customerId" = ?`, args: [TEST_ID] }).catch(() => {})
  await db.execute({ sql: `DELETE FROM "Customer" WHERE id = ?`, args: [TEST_ID] }).catch(() => {})
  console.log('cleanup done — test rows deleted')
}
const failed = results.filter(r => !r.ok)
process.exit(failed.length ? 1 : 0)
