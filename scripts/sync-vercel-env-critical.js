#!/usr/bin/env node
/** Sync ONLY the critical new Phase 2/4 vars to Vercel (fast, targeted). */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
const vars = {}
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const m = t.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (!m) continue
  let v = m[2].trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  vars[m[1]] = v
}

const WANTED = [
  'BKASH_PERSONAL_NUMBER', 'NAGAD_PERSONAL_NUMBER', 'ROCKET_PERSONAL_NUMBER',
  'PERSONAL_PAYMENT_ENABLED', 'SMS_WEBHOOK_SECRET', 'CRON_SECRET',
  'TV_AUTO_GENERATE_ENABLED', 'TV_CHANNEL_NAME', 'RSS_FEEDS',
  'YOUTUBE_RTMP_URL', 'FACEBOOK_RTMP_URL', 'TWITCH_RTMP_URL',
]
const targets = ['production']
let ok = 0, fail = 0, skip = 0
for (const key of WANTED) {
  const value = vars[key]
  if (!value) { console.log(`  - ${key}: empty locally, skipping`); skip++; continue }
  try {
    for (const t of targets) {
      try { execSync(`vercel env rm ${key} ${t} --yes`, { stdio: 'pipe' }) } catch {}
      execSync(`printf %s ${JSON.stringify(value)} | vercel env add ${key} ${t}`, { stdio: 'pipe', shell: '/bin/bash' })
    }
    console.log(`  ✓ ${key}`)
    ok++
  } catch (e) {
    console.error(`  ✗ ${key}: ${String(e.message).split('\n')[0]}`)
    fail++
  }
}
console.log(`\nDone: ${ok} synced, ${skip} skipped (empty), ${fail} failed.`)
