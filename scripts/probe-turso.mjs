// scripts/probe-turso.mjs — minimal Turso probe: SELECT 1 via the same client the app uses.
import { createClient } from '@libsql/client'
import { readFileSync } from 'node:fs'

const raw = readFileSync('/home/romel/hostamar.com/.env.local', 'utf8')
let AUTH = ''
const env = {}
for (const l of raw.split('\n')) {
  if (!l.includes('=') || l.startsWith('#')) continue
  let k = l.slice(0, l.indexOf('=')).trim()
  let v = l.slice(l.indexOf('=') + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (v.includes('?authToken=')) { const [u, t] = v.split('?authToken='); v = u; if (!AUTH) AUTH = t }
  env[k] = v
}
console.log('url host:', env.DATABASE_URL.split('?')[0])
const db = createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN || AUTH })
const r = await db.execute('SELECT 1 AS ok')
console.log('turso direct SELECT 1:', JSON.stringify(r.rows[0]))
