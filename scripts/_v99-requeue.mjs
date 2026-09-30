#!/usr/bin/env node
// V99 — requeue the customer's failed "Globalization শেষ" video (cmui1gra…).
// Resets the failed VideoQueue row to pending + Video to processing. Worker
// claims <=10s. Run after archiving old artifacts (stale pre-V89 clips).
import dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first')
import { createClient } from '@libsql/client'
import { execSync } from 'node:child_process'

const unit = execSync('systemctl --user cat hostamar-next.service', { encoding: 'utf8' })
const m = unit.match(/DATABASE_URL=("[^"]*"|\S+)/)
const raw = m[1].replace(/^"|"$/g, '')
const db = createClient({ url: raw.split('?')[0], authToken: (raw.match(/authToken=([^&\s"]+)/) || [])[1] || '' })

const QID = 'cmui1grat0003qcn0r5o67sqi'
const VID = 'cmui1gra00001qcn0s9f6sjlc'

await db.execute({
  sql: "UPDATE VideoQueue SET status='pending', attempts=0, error=NULL, renderStatus=NULL, renderError=NULL, processedAt=NULL, videoUrl=NULL WHERE id=?",
  args: [QID],
})
await db.execute({ sql: "UPDATE Video SET status='processing' WHERE id=?", args: [VID] })

const q = await db.execute({ sql: 'SELECT id, status, attempts FROM VideoQueue WHERE id=?', args: [QID] })
const v = await db.execute({ sql: 'SELECT id, status FROM Video WHERE id=?', args: [VID] })
console.log('queue:', JSON.stringify(q.rows), '| video:', JSON.stringify(v.rows))
