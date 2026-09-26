import { createClient } from '@libsql/client'
const url = process.env.DATABASE_URL
const db = createClient({ url: url.split('?')[0], authToken: decodeURIComponent((url.match(/authToken=([^&]+)/)||[])[1]||'') })
const v = await db.execute({ sql: "SELECT description, script FROM Video WHERE id = ?", args: ['cmui1gra00001qcn0s9f6sjlc'] })
console.log('=== description (first 800 chars) ===')
console.log(String(v.rows[0].description).slice(0, 800))
console.log('=== script ===')
console.log(v.rows[0].script ? String(v.rows[0].script).slice(0, 400) : 'NULL')
