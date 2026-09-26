import { createClient } from '@libsql/client'
const url = process.env.DATABASE_URL
const db = createClient({ url: url.split('?')[0], authToken: decodeURIComponent((url.match(/authToken=([^&]+)/)||[])[1]||'') })
const t = await db.execute("PRAGMA table_info(VideoQueue)")
console.log('=== VideoQueue columns ===')
for (const r of t.rows) console.log(r.name, r.type)
const v = await db.execute("PRAGMA table_info(Video)")
console.log('=== Video columns (prompt/script/description only) ===')
for (const r of v.rows) if (/prompt|script|description|language|title|topic/i.test(r.name)) console.log(r.name, r.type)
