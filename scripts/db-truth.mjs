// scripts/db-truth.mjs — schema + row truth for the store/credit work.
import { createClient } from '@libsql/client'
import { readFileSync } from 'node:fs'
const raw = readFileSync('/home/romel/hostamar.com/.env.local', 'utf8')
let tok = ''
const env = Object.fromEntries(raw.split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => {
  let k = l.slice(0, l.indexOf('=')).trim(); let v = l.slice(l.indexOf('=') + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (v.includes('?authToken=')) { const [u, t] = v.split('?authToken='); v = u; if (!tok) tok = t }
  return [k, v]
}))
const db = createClient({ url: env.DATABASE_URL, authToken: tok })
const t = await db.execute(`SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name`)
console.log('tables:', t.rows.map(r => r.name).join(' '))
for (const tbl of ['Customer', 'CreditTransaction', 'ServiceCatalog', 'Referral']) {
  const r = t.rows.find(x => x.name === tbl)
  console.log(`\n--- ${tbl} ${r ? '' : '(MISSING)'}`)
  if (r) console.log(String(r.sql).replace(/\s+/g, ' ').slice(0, 900))
}
const q = async (sql) => { try { const r = await db.execute(sql); return JSON.stringify(r.rows) } catch (e) { return 'ERR ' + e.message } }
console.log('\nserviceCatalog count:', await q(`SELECT COUNT(*) n FROM ServiceCatalog`))
console.log('serviceCatalog active:', await q(`SELECT COUNT(*) n FROM ServiceCatalog WHERE isActive = 1`))
console.log('customers:', await q(`SELECT COUNT(*) n FROM Customer`))
console.log('recent CreditTransaction types:', await q(`SELECT type, COUNT(*) n FROM CreditTransaction GROUP BY type ORDER BY n DESC LIMIT 12`))
if (t.rows.some(r => r.name === 'Referral')) console.log('referrals:', await q(`SELECT COUNT(*) n FROM Referral`))
