
import { createClient } from '@libsql/client'
const url = process.env.DATABASE_URL
const db = createClient({ url: url.split('?')[0], authToken: decodeURIComponent((url.match(/authToken=([^&]+)/)||[])[1]||'') })
const q = await db.execute("SELECT id, videoId, status, attempts, substr(renderError,1,150) AS err FROM VideoQueue ORDER BY createdAt DESC LIMIT 8")
console.log('=== VideoQueue last 8 ===')
for (const r of q.rows) console.log(JSON.stringify(r))
const p = await db.execute("SELECT count(*) AS n FROM VideoQueue WHERE status='pending'")
console.log('PENDING_QUEUE:', p.rows[0].n)
const d = await db.execute("SELECT description FROM Video WHERE id='cmui1gra00001qcn0s9f6sjlc'")
console.log('=== FULL DESCRIPTION ===')
console.log(d.rows[0].description)
