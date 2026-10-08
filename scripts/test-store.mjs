// scripts/test-store.mjs — end-to-end AI Store money test (run locally, not deployed):
//   1. seed buyer/seller/referrer + a REAL marketplace listing (ServiceCatalog.sellerId)
//   2. POST /api/generate on that listing → 80/20 split: buyer −, seller +80%, platform +20%
//   3. admin-approve a bKash TrxID → plan credits + first-purchase 6000cr bonus + referral 10%
//   4. re-approve the same TrxID → idempotent (no double grant)
//   5. delete every test row (incl. the platform commission leg, reverted exactly)
// Usage: node scripts/test-store.mjs            (tests https://hostamar.com)
//        STORE_TEST_BASE=http://localhost:3011 node scripts/test-store.mjs
import { createClient } from '@libsql/client'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import jwt from 'jsonwebtoken'

const BASE = process.env.STORE_TEST_BASE || 'https://hostamar.com'
const RAW = readFileSync('/home/romel/hostamar.com/.env.local', 'utf8')
let AUTH_TOKEN = ''
const env = Object.fromEntries(RAW.split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => {
  let k = l.slice(0, l.indexOf('=')).trim(); let v = l.slice(l.indexOf('=') + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (v.includes('?authToken=')) { const [u, t] = v.split('?authToken='); v = u; if (!AUTH_TOKEN) AUTH_TOKEN = t }
  return [k, v]
}))
const db = createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN || AUTH_TOKEN })
const JWT_SECRET = env.JWT_SECRET || env.NEXTAUTH_SECRET || env.AUTH_SECRET

const TS = Date.now().toString(36)
const BUYER = 'test_store_buyer_' + TS, SELLER = 'test_store_seller_' + TS, REFERRER = 'test_store_ref_' + TS
const PLANBUYER = 'test_store_planbuyer_' + TS
const SERVICE = 'test_store_svc_' + TS, TXN = 'test_store_txn_' + TS, TXN2 = 'test_store_txn2_' + TS
const RAWKEY = 'hk_live_storetest_' + TS
const KEYHASH = createHash('sha256').update(RAWKEY).digest('hex')
const now = new Date().toISOString()

const results = []
const step = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }
const one = async (sql, args = []) => (await db.execute({ sql, args })).rows[0]
const num = async (id) => Number((await one(`SELECT credits FROM "Customer" WHERE id = ?`, [id]))?.credits ?? -1)
const rows = async (sql, args = []) => Number((await one(sql, args))?.n ?? 0)
const post = (path, body, headers = {}) => fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

const admin = await one(`SELECT id, email, name FROM "Customer" WHERE role IN ('admin','superadmin') ORDER BY "createdAt" ASC LIMIT 1`).catch(() => null)
const adminBefore = admin ? await num(admin.id) : -1
let platformDelta = 0

try {
  // 1. seed
  for (const [id, credits, role] of [[BUYER, 1000, 'customer'], [SELLER, 0, 'customer'], [REFERRER, 0, 'customer'], [PLANBUYER, 0, 'customer']]) {
    await db.execute({ sql: `INSERT INTO "Customer" (id, email, password, name, role, credits, "customerId", "updatedAt", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [id, id + '@hostamar-test.invalid', 'test-no-login-' + id, 'Store Test', role, credits, id, now, now] })
  }
  await db.execute({ sql: `INSERT INTO "ApiKey" (id, key, name, "customerId", "canGenerateImage", "canGenerateVideo", "canUseChat", "rateLimitPerMinute", "totalRequests", "isActive", "updatedAt", "createdAt") VALUES (?, ?, ?, ?, 1, 1, 1, 60, 0, 1, ?, ?)`, args: [BUYER + '_key', KEYHASH, 'store-test', BUYER, now, now] })
  // real marketplace listing owned by SELLER (100cr)
  await db.execute({ sql: `INSERT INTO "ServiceCatalog" (id, name, nameBn, category, categoryBn, "creditCost", benefit, benefitBn, "perfectFor", "perfectForBn", "promptTemplate", icon, "isActive", "sellerId", "createdAt") VALUES (?, 'Store Test Service', 'স্টোর টেস্ট সার্ভিস', 'test', 'টেস্ট', 100, 'b', 'ব', 'p', 'প', 'test {{prompt}}', '🧪', 1, ?, ?)`, args: [SERVICE, SELLER, now] })
  // pending referral: REFERRER referred BUYER
  await db.execute({ sql: `INSERT INTO "Referral" (id, "referrerId", "referredId", status, "bonusAmount", "createdAt") VALUES (?, ?, ?, 'PENDING', 0, ?)`, args: [TXN + '_ref', REFERRER, PLANBUYER, now] })
  // pending bKash payment for the buyer: starter = 6000cr
  await db.execute({ sql: `INSERT INTO "Transaction" (id, "customerId", amount, currency, status, gateway, "gatewayTrxId", "videoPackage", "creditsAdded", "createdAt", "updatedAt") VALUES (?, ?, 990, 'BDT', 'pending_verification', 'bkash_personal', ?, 'starter', 6000, ?, ?)`, args: [TXN, PLANBUYER, 'STORETEST' + TS.toUpperCase(), now, now] })
  step('seed buyer(1000cr) + seller + referrer + listing + pending referral + pending bKash', true, `service=${SERVICE}`)

  // 2. marketplace purchase → 80/20 split
  const g = await post('/api/generate', { serviceId: SERVICE, prompt: 'store test' }, { Authorization: `Bearer ${RAWKEY}` })
  const gb = await g.json().catch(() => ({}))
  const buyerAfter = await num(BUYER), sellerAfter = await num(SELLER)
  step('POST /api/generate on a seller listing', g.status === 200, `HTTP ${g.status} ${gb.error || ''}`)
  step('buyer paid full 100cr', buyerAfter === 900, `1000 -> ${buyerAfter}`)
  step('seller got 80% (80cr)', sellerAfter === 80, `0 -> ${sellerAfter}`)
  const buyerRows = await rows(`SELECT COUNT(*) n FROM "CreditTransaction" WHERE "customerId" = ? AND type = 'purchase'`, [BUYER])
  const sellerRows = await rows(`SELECT COUNT(*) n FROM "CreditTransaction" WHERE "customerId" = ? AND type = 'sale'`, [SELLER])
  step('buyer+seller audit rows written', buyerRows === 1 && sellerRows === 1, `purchase=${buyerRows} sale=${sellerRows}`)
  if (admin) {
    const adminAfter = await num(admin.id)
    platformDelta = adminAfter - adminBefore
    const commRows = await rows(`SELECT COUNT(*) n FROM "CreditTransaction" WHERE "customerId" = ? AND type = 'commission' AND description LIKE ?`, [admin.id, '%' + SERVICE + '%'])
    step('platform got 20% (20cr) + commission row', platformDelta === 20 && commRows === 1, `admin +${platformDelta} rows=${commRows}`)
  } else step('platform commission', false, 'no admin customer to credit')

  // 3. admin approve the pending bKash payment → plan credits + bonus + referral
  if (!JWT_SECRET) throw new Error('no JWT_SECRET/NEXTAUTH_SECRET in .env.local — cannot call the admin route')
  const adminToken = jwt.sign({ id: admin.id, email: admin.email, name: admin.name || admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '10m' })
  const a = await post(`/api/admin/payments/approve/${TXN}`, {}, { Authorization: `Bearer ${adminToken}` })
  const ab = await a.json().catch(() => ({}))
  step('POST /api/admin/payments/approve', a.status === 200 && ab.success === true, `HTTP ${a.status} ${ab.error || ''}`)
  const bAfter = await num(PLANBUYER), rAfter = await num(REFERRER)
  step('plan buyer got plan credits 6000', bAfter === 12000, `0 -> ${bAfter} (6000 plan + 6000 first-purchase bonus)`)
  const bonusRows = await rows(`SELECT COUNT(*) n FROM "CreditTransaction" WHERE "customerId" = ? AND type = 'bonus'`, [PLANBUYER])
  step('first-purchase bonus 6000cr written', bonusRows === 1 && bAfter === 12000, `bonus rows=${bonusRows} credits=${bAfter}`)
  step('referrer got 10% (600cr)', rAfter === 600, `0 -> ${rAfter}`)
  const ref = await one(`SELECT status, "bonusAmount" FROM "Referral" WHERE "referrerId" = ?`, [REFERRER])
  step('Referral row marked paid with bonusAmount 600', String(ref?.status).toLowerCase() === 'paid' && Number(ref?.bonusAmount) === 600, `status=${ref?.status} bonus=${ref?.bonusAmount}`)

  // 4. idempotency — a second approve must not double-grant
  const a2 = await post(`/api/admin/payments/approve/${TXN}`, {}, { Authorization: `Bearer ${adminToken}` })
  const a2b = await a2.json().catch(() => ({}))
  const bAfter2 = await num(PLANBUYER), rAfter2 = await num(REFERRER)
  step('re-approve is idempotent (no double grant)', a2b.alreadyCompleted === true && bAfter2 === bAfter && rAfter2 === rAfter, `HTTP ${a2.status} credits=${bAfter2}`)

  // 5. the bonus is once per customer: BUYER already bought on the marketplace
  //    (a 'purchase' row exists), so approving a plan payment must NOT re-bonus.
  await db.execute({ sql: `INSERT INTO "Transaction" (id, "customerId", amount, currency, status, gateway, "gatewayTrxId", "videoPackage", "creditsAdded", "createdAt", "updatedAt") VALUES (?, ?, 990, 'BDT', 'pending_verification', 'bkash_personal', ?, 'starter', 6000, ?, ?)`, args: [TXN2, BUYER, 'STORETEST2' + TS.toUpperCase(), now, now] })
  const a3 = await post(`/api/admin/payments/approve/${TXN2}`, {}, { Authorization: `Bearer ${adminToken}` })
  const bAfter3 = await num(BUYER)
  const buyerBonusRows = await rows(`SELECT COUNT(*) n FROM "CreditTransaction" WHERE "customerId" = ? AND type = 'bonus'`, [BUYER])
  step('bonus is once per customer (no second bonus)', a3.status === 200 && bAfter3 === 6900 && buyerBonusRows === 0, `HTTP ${a3.status} 900 -> ${bAfter3} bonusRows=${buyerBonusRows}`)
} catch (e) {
  step('unexpected', false, e.message)
} finally {
  await db.execute({ sql: `DELETE FROM "CreditTransaction" WHERE "customerId" IN (?, ?, ?, ?)`, args: [BUYER, SELLER, REFERRER, PLANBUYER] }).catch(() => {})
  await db.execute({ sql: `DELETE FROM "ApiKey" WHERE "customerId" = ?`, args: [BUYER] }).catch(() => {})
  await db.execute({ sql: `DELETE FROM "Video" WHERE "customerId" = ?`, args: [BUYER] }).catch(() => {})
  await db.execute({ sql: `DELETE FROM "Notification" WHERE "customerId" = ?`, args: [BUYER] }).catch(() => {})
  await db.execute({ sql: `DELETE FROM "ActivityLog" WHERE "customerId" = ?`, args: [BUYER] }).catch(() => {})
  await db.execute({ sql: `DELETE FROM "Subscription" WHERE "customerId" = ?`, args: [BUYER] }).catch(() => {})
  await db.execute({ sql: `DELETE FROM "Referral" WHERE "id" = ?`, args: [TXN + '_ref'] }).catch(() => {})
  for (const t of [TXN, TXN2]) await db.execute({ sql: `DELETE FROM "Transaction" WHERE "id" = ?`, args: [t] }).catch(() => {})
  await db.execute({ sql: `DELETE FROM "ServiceCatalog" WHERE id = ?`, args: [SERVICE] }).catch(() => {})
  // revert the platform commission leg exactly (real admin customer — no residue)
  if (admin && platformDelta) {
    await db.execute({ sql: `DELETE FROM "CreditTransaction" WHERE "customerId" = ? AND type = 'commission' AND description LIKE ?`, args: [admin.id, '%' + SERVICE + '%'] }).catch(() => {})
    await db.execute({ sql: `UPDATE "Customer" SET credits = credits - ? WHERE id = ?`, args: [platformDelta, admin.id] }).catch(() => {})
  }
  for (const id of [BUYER, SELLER, REFERRER, PLANBUYER]) await db.execute({ sql: `DELETE FROM "Customer" WHERE id = ?`, args: [id] }).catch(() => {})
  const adm = admin ? await num(admin.id) : -1
  console.log(`cleanup done — test rows deleted (admin balance ${adminBefore} -> ${adm})`)
}
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} PASS`)
process.exit(failed.length ? 1 : 0)
