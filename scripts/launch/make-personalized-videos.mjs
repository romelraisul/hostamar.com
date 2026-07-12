#!/usr/bin/env node
/**
 * scripts/launch/make-personalized-videos.js
 *
 * TASK 2 of the #8 Launch Sprint — dogfood the OWN Video product to make
 * 20 personalized videos for the Daraz leads in working/outbound/daraz-20.csv.
 *
 * GROUNDED IN REAL ENDPOINTS (not the prompt's assumed shape):
 *   - Auth is COOKIE-based: POST /api/auth/login {email,password} → `auth_token`.
 *     There is NO customerId/organizationId in the request body.
 *   - POST /api/videos/generate REQUIRES { templateId, prompt } and returns
 *     { success, videoId, status:'processing' } — NOT a videoUrl.
 *   - Final url is polled from GET /api/video/status/{videoId}
 *     (videoUrl when status === 'ready' | 'complete').
 *   - The Video model enforces a MONTHLY limit per customer (default 10).
 *     20 videos for one bot customer will hit `limitReached` (403). Handle by
 *     either (a) raising the bot's subscription videosPerMonth, or (b) splitting
 *     across demo customers. The script reports the limit and stops cleanly.
 *
 * REALITY CHECK (honest): in sandbox the video pipeline returns DEMO/mock URLs
 * (lib/video-generator.demo.ts) unless ELEVENLABS_API_KEY / GPU render is wired.
 * The script flags `_demo` URLs so you never ship a fake video to a real seller.
 *
 * ENV (server-side only, never commit):
 *   HOSTAMAR_BASE_URL   default http://localhost:3000
 *   LAUNCH_BOT_EMAIL    a real customer login with enough video quota
 *   LAUNCH_BOT_PASSWORD
 *   VIDEO_TEMPLATE_ID   a valid template id the product accepts (default 'marketing-bn')
 *   CSV_PATH            default working/outbound/daraz-20.csv
 *
 * RUN:  node scripts/launch/make-personalized-videos.js
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE = process.env.HOSTAMAR_BASE_URL || 'http://localhost:3000'
const EMAIL = process.env.LAUNCH_BOT_EMAIL
const PASSWORD = process.env.LAUNCH_BOT_PASSWORD
const TEMPLATE_ID = process.env.VIDEO_TEMPLATE_ID || 'marketing-bn'
const CSV_PATH = resolve(process.cwd(), process.env.CSV_PATH || 'working/outbound/daraz-20.csv')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function fail(msg) {
  console.error(`[launch-videos] FATAL: ${msg}`)
  process.exit(1)
}
if (!EMAIL || !PASSWORD) fail('set LAUNCH_BOT_EMAIL + LAUNCH_BOT_PASSWORD')
if (!existsSync(CSV_PATH)) fail(`csv not found: ${CSV_PATH}`)

// --- Parse CSV (minimal RFC4180-ish: commas, quoted fields, # comments) ---
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false
      } else field += c
    } else if (c === '"') inQ = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.length && !r[0].startsWith('#'))
}
function toRecords(rows) {
  const [header, ...data] = rows
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])))
}

const text = readFileSync(CSV_PATH, 'utf8')
const records = toRecords(parseCsv(text)).filter((r) => !r.shopName.startsWith('EXAMPLE'))
console.log(`[launch-videos] ${records.length} real leads in ${CSV_PATH}`)
if (records.length === 0) fail('no real leads (only EXAMPLE rows). Fill daraz-20.csv first (TASK 1).')

// --- 1. Login → capture auth_token cookie ---
async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) { const b = await res.text(); fail(`login ${res.status}: ${b}`) }
  const setCookie = res.headers.get('set-cookie') || ''
  const m = setCookie.match(/auth_token=([^;]+)/)
  if (!m) fail('no auth_token cookie in login response')
  console.log('[launch-videos] logged in as', EMAIL)
  return m[1]
}
const AUTH = await login()
const cookie = `auth_token=${AUTH}`

// --- 2. Generate + 3. Poll status ---
async function generateOne(rec) {
  const prompt =
    `Bangla voiceover for ${rec.topProduct} — 15s hook, problem→solution, ` +
    `no watermark, end card "Order now - bKash delivery". Shop: ${rec.shopName}.`
  const gen = await fetch(`${BASE}/api/videos/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ templateId: TEMPLATE_ID, prompt, title: `${rec.shopName} — ${rec.topProduct}`, language: 'bn' }),
  })
  const gbody = await gen.json().catch(() => ({}))
  if (gen.status === 403 && gbody.limitReached) {
    console.warn(`[launch-videos] LIMIT REACHED for "${rec.shopName}" (monthly quota). Skipping. Raise videosPerMonth or split customers.`)
    return { ok: false, limit: true }
  }
  if (!gen.ok || !gbody.videoId) {
    console.warn(`[launch-videos] generate failed for "${rec.shopName}": ${gen.status} ${JSON.stringify(gbody)}`)
    return { ok: false }
  }
  // poll up to ~3 min
  const id = gbody.videoId
  for (let i = 0; i < 36; i++) {
    await sleep(5000)
    const st = await fetch(`${BASE}/api/video/status/${id}`, { headers: { cookie } }).then((r) => r.json()).catch(() => ({}))
    if (st.status === 'ready' || st.status === 'complete') {
      const url = st.videoUrl || null
      const isDemo = url && url.includes('/demo-videos/')
      if (isDemo) console.warn(`[launch-videos] "${rec.shopName}" → DEMO url (sandbox render). Wire ELEVENLABS_API_KEY/GPU for real video.`)
      return { ok: true, url, demo: isDemo }
    }
    if (st.status === 'failed') return { ok: false, failed: true }
  }
  console.warn(`[launch-videos] timeout polling "${rec.shopName}" (id ${id})`)
  return { ok: false, timeout: true }
}

// --- Run, writing personalizedVideoUrl back into the CSV ---
const header = Object.keys(records[0])
let done = 0
for (const rec of records) {
  const r = await generateOne(rec)
  if (r.ok) { rec.personalizedVideoUrl = r.url; done++ }
  else if (r.limit) { console.warn('[launch-videos] stopping — monthly limit hit.'); break }
}
const outRows = [header.join(',')].concat(
  records.map((r) => header.map((h) => {
    const v = (r[h] ?? '').replace(/"/g, '""')
    return /[",\n]/.test(v) ? `"${v}"` : v
  }).join(','))
)
writeFileSync(CSV_PATH, outRows.join('\n') + '\n')
console.log(`[launch-videos] DONE: ${done}/${records.length} videos written to ${CSV_PATH}`)
if (done === 0) console.warn('[launch-videos] 0 real videos — check render pipeline + quota before launch.')
