#!/usr/bin/env node
// V98 — cinema test enqueue (WSL only). Creates Video + VideoQueue rows for the
// local Hunyuan worker. Prints schema first (drift check), then inserts. Never prints secrets.
import dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first') // WSL v6 egress dead — Turso connect timeouts without this
import { createClient } from '@libsql/client'
import { execSync } from 'node:child_process'

const unit = execSync('systemctl --user cat hostamar-next.service', { encoding: 'utf8' })
const m = unit.match(/DATABASE_URL=("[^"]*"|\S+)/)
if (!m) { console.error('NO_DATABASE_URL'); process.exit(1) }
const raw = m[1].replace(/^"|"$/g, '')
const url = raw.split('?')[0]
const token = (raw.match(/authToken=([^&\s"]+)/) || [])[1] || ''
const db = createClient({ url, authToken: token })

for (const t of ['Video', 'VideoQueue']) {
  const r = await db.execute({ sql: `PRAGMA table_info(${t})`, args: [] })
  console.log(`--- ${t} columns:`, r.rows.map((x) => x.name).join(','))
}

const cust = await db.execute({ sql: 'SELECT id, email FROM Customer WHERE email = ? LIMIT 1', args: ['romelraisul@gmail.com'] })
if (!cust.rows.length) { console.error('ADMIN_NOT_FOUND'); process.exit(1) }
const customerId = cust.rows[0].id
console.log('admin:', cust.rows[0].email, '| id:', String(customerId).slice(0, 10) + '…')

const now = new Date().toISOString()
const rid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
const videoId = rid('v98')
const queueId = rid('q98')
const title = 'Globalization Cinema Test'
const topic = 'Globalization FAILED! 70 bochor OLD WORLD IS BREAKING'
const prompt = 'HOOK 0-3s Globalization FAILED! PROBLEM Asia Factory Japan Lender SOLUTION Hostamar.com VO: "Globalization is breaking"'
const description = 'Cinema test 768x1344'
const script = 'HOOK: Globalization FAILED!'

await db.execute({
  sql: 'INSERT INTO Video (id, customerId, title, description, prompt, script, duration, format, resolution, topic, language, status, url, fileSize, downloads, views, shares, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
  args: [videoId, customerId, title, description, prompt, script, 60, 'webm', '720p', topic, 'en', 'processing', '', 0, 0, 0, 0, now, now],
})
await db.execute({
  sql: 'INSERT INTO VideoQueue (id, customerId, topic, priority, status, type, attempts, maxAttempts, videoId, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)',
  args: [queueId, customerId, topic, 5, 'pending', 'video', 0, 3, videoId, now],
})

const v = await db.execute({ sql: 'SELECT id, status FROM Video WHERE id=?', args: [videoId] })
const q = await db.execute({ sql: 'SELECT id, status, priority FROM VideoQueue WHERE id=?', args: [queueId] })
console.log('VERIFY video:', JSON.stringify(v.rows), '| queue:', JSON.stringify(q.rows))
console.log(JSON.stringify({ ok: true, videoId, queueId }))
