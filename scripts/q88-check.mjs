import { createClient } from '@libsql/client'
const url = process.env.DATABASE_URL
const db = createClient({ url: url.split('?')[0], authToken: decodeURIComponent((url.match(/authToken=([^&]+)/)||[])[1]||'') })
const v = await db.execute({ sql: "SELECT id, title, topic, language, status, LENGTH(prompt) as prompt_len, LENGTH(description) as desc_len FROM Video WHERE id = ?", args: ['cmui1gra00001qcn0s9f6sjlc'] })
console.log(JSON.stringify(v.rows, null, 1))
const q = await db.execute({ sql: "SELECT id, videoId, topic, status, attempts, renderError FROM VideoQueue WHERE videoId = ? ORDER BY createdAt DESC", args: ['cmui1gra00001qcn0s9f6sjlc'] })
console.log(JSON.stringify(q.rows, null, 1))
const pend = await db.execute("SELECT COUNT(*) as n FROM VideoQueue WHERE status = 'pending'")
console.log('pending rows:', pend.rows[0].n)
