#!/usr/bin/env node
// V99 — requeue v98 test video for CosyVoice VO integration test (no GPU: clips reused from disk).
import dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first')
const { createClient } = await import('/home/romel/hostamar.com/node_modules/@libsql/client/lib-esm/node.js')
const { execSync } = await import('node:child_process')
const unit = execSync('systemctl --user cat hostamar-next.service', { encoding: 'utf8' })
const m = unit.match(/DATABASE_URL=("[^"]*"|\S+)/)
const raw = m[1].replace(/^"|"$/g, '')
const db = createClient({ url: raw.split('?')[0], authToken: (raw.match(/authToken=([^&\s"]+)/) || [])[1] || '' })

const VID = 'v98mulwlicrjv4fhb'
let r = await db.execute({ sql: "SELECT id,status FROM VideoQueue WHERE videoId=?", args: [VID] })
console.log('before:', JSON.stringify(r.rows))

if (r.rows.length === 0) {
  await db.execute({ sql: "INSERT INTO VideoQueue (id, videoId, status, attempts, createdAt) VALUES (?, ?, 'pending', 0, datetime('now'))", args: ['v99test' + Date.now(), VID] })
  console.log('inserted new queue row')
} else {
  await db.execute({ sql: "UPDATE VideoQueue SET status='pending', attempts=0, error=NULL WHERE videoId=?", args: [VID] })
  console.log('reset queue row to pending')
}
await db.execute({ sql: "UPDATE Video SET status='queued' WHERE id=?", args: [VID] })

r = await db.execute({ sql: "SELECT id,status,attempts FROM VideoQueue WHERE videoId=?", args: [VID] })
console.log('after queue:', JSON.stringify(r.rows))
r = await db.execute({ sql: "SELECT id,status FROM Video WHERE id=?", args: [VID] })
console.log('after video:', JSON.stringify(r.rows))
