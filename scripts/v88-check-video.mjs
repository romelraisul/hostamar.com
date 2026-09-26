import { createClient } from '@libsql/client'
const raw = process.env.DATABASE_URL
const db = createClient({ url: raw.split('?')[0], authToken: decodeURIComponent(raw.split('authToken=')[1] || '') })
const r = await db.execute("SELECT id, topic, title, status, length(script) as scriptLen, length(description) as descLen, substr(script,1,400) as scriptHead, substr(description,1,400) as descHead FROM Video WHERE id='cmui1gra00001qcn0s9f6sjlc'")
console.log(JSON.stringify(r.rows, null, 1))
