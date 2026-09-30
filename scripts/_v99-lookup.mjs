#!/usr/bin/env node
// V99 — locate failed Globalization customer video(s) + their queue rows.
import dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first')
import { createClient } from '@libsql/client'
import { execSync } from 'node:child_process'

const unit = execSync('systemctl --user cat hostamar-next.service', { encoding: 'utf8' })
const m = unit.match(/DATABASE_URL=("[^"]*"|\S+)/)
const raw = m[1].replace(/^"|"$/g, '')
const db = createClient({ url: raw.split('?')[0], authToken: (raw.match(/authToken=([^&\s"]+)/) || [])[1] || '' })

const vids = await db.execute({
  sql: "SELECT id, title, status, duration, language, customerId, createdAt FROM Video WHERE title LIKE '%Globalization%' ORDER BY createdAt DESC LIMIT 12",
  args: [],
})
console.log('=== Globalization videos ===')
for (const v of vids.rows) console.log(JSON.stringify(v))

console.log()
for (const v of vids.rows) {
  const q = await db.execute({
    sql: 'SELECT id, status, attempts, error, renderError, createdAt FROM VideoQueue WHERE videoId = ? ORDER BY createdAt DESC LIMIT 3',
    args: [v.id],
  })
  console.log(`QUEUE ${v.id} [${v.status}]:`, JSON.stringify(q.rows))
}

console.log()
const fails = await db.execute({
  sql: "SELECT id, title, status, createdAt FROM Video WHERE status = 'failed' ORDER BY createdAt DESC LIMIT 15",
  args: [],
})
console.log('=== recent failed videos ===')
for (const v of fails.rows) console.log(JSON.stringify(v))
