import { createClient } from '@libsql/client'
const raw = process.env.DATABASE_URL
if (!raw) { console.error('NO DATABASE_URL'); process.exit(1) }
const db = createClient({ url: raw.split('?')[0], authToken: decodeURIComponent(raw.split('authToken=')[1] || '') })
const s = await db.execute("SELECT sql FROM sqlite_master WHERE tbl_name='Video' AND sql IS NOT NULL")
console.log('=== Video schema ===')
console.log(s.rows.map(r => r.sql).join('\n'))
const r = await db.execute("SELECT * FROM Video ORDER BY createdAt DESC LIMIT 2")
for (const row of r.rows) {
  const o = {}
  for (const [k, v] of Object.entries(row)) {
    if (v === null) { o[k] = null; continue }
    const str = String(v)
    o[k] = str.length > 500 ? str.slice(0, 500) + ` ...[+${str.length - 500} chars]` : str
  }
  console.log('=== row ===')
  console.log(JSON.stringify(o, null, 1))
}
