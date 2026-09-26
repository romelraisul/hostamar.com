import { createClient } from '@libsql/client'
const raw = process.env.DATABASE_URL
if (!raw) { console.error('NO DATABASE_URL in env'); process.exit(1) }
const db = createClient({ url: raw.split('?')[0], authToken: raw.includes('authToken=') ? raw.split('authToken=')[1] : undefined })
const v = await db.execute('SELECT * FROM Video ORDER BY createdAt DESC LIMIT 4')
console.log('--- VIDEO COLS:', v.columns.join(','))
for (const r of v.rows) {
  const o = {}
  v.columns.forEach((c, i) => { o[c] = r[i] })
  console.log(JSON.stringify({ id: o.id, title: o.title?.slice(0, 40), status: o.status, duration: o.duration, script: (o.prompt || o.script || o.content || 'NO SCRIPT FIELD').slice(0, 150), url: o.url?.slice(0, 70), createdAt: o.createdAt }, null, 1))
}
const q = await db.execute('SELECT * FROM VideoQueue ORDER BY createdAt DESC LIMIT 4')
console.log('--- QUEUE COLS:', q.columns.join(','))
for (const r of q.rows) {
  const o = {}
  q.columns.forEach((c, i) => { o[c] = r[i] })
  console.log(JSON.stringify({ id: o.id, videoId: o.videoId, status: o.status, topic: (o.topic || '').slice(0, 100), prompt: (o.prompt || '').slice(0, 100), attempts: o.attempts, promptId: o.comfyuiPromptId }, null, 1))
}
