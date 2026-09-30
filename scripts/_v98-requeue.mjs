#!/usr/bin/env node
// V98 — requeue the cinema test after OOM kill. Resets Video+VideoQueue rows to
// pending so the restarted worker claims them. Run AFTER stopping the worker.
import dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first')
import { createClient } from '@libsql/client'
import { execSync } from 'node:child_process'

const unit = execSync('systemctl --user cat hostamar-next.service', { encoding: 'utf8' })
const m = unit.match(/DATABASE_URL=("[^"]*"|\S+)/)
const raw = m[1].replace(/^"|"$/g, '')
const db = createClient({ url: raw.split('?')[0], authToken: (raw.match(/authToken=([^&\s"]+)/) || [])[1] || '' })

const VIDEO = 'v98mulwlicrjv4fhb'
const QUEUE = 'q98mulwlicriaywek'

await db.execute({
  sql: "UPDATE VideoQueue SET status='pending', attempts=0, error=NULL, renderStatus=NULL, renderError=NULL, processedAt=NULL WHERE id=?",
  args: [QUEUE],
})
await db.execute({
  sql: "UPDATE Video SET status='processing' WHERE id=?",
  args: [VIDEO],
})
const q = await db.execute({ sql: 'SELECT id, status, attempts FROM VideoQueue WHERE id=?', args: [QUEUE] })
console.log('queue reset:', JSON.stringify(q.rows))
