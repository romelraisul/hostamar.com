// Add ServiceCatalog.sellerId (marketplace ownership). Idempotent.
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
const cols = await db.execute(`PRAGMA table_info("ServiceCatalog")`)
const has = cols.rows.some(r => r.name === 'sellerId')
if (has) console.log('sellerId column already present')
else { await db.execute(`ALTER TABLE "ServiceCatalog" ADD COLUMN sellerId TEXT`); console.log('added sellerId') }
const after = await db.execute(`PRAGMA table_info("ServiceCatalog")`)
console.log('columns:', after.rows.map(r => r.name).join(','))
const n = await db.execute(`SELECT COUNT(*) n FROM "ServiceCatalog" WHERE "sellerId" IS NOT NULL`)
console.log('rows with a seller:', n.rows[0].n)
