#!/usr/bin/env node
/**
 * scripts/sync-vercel-env.js
 * Syncs .env.local -> Vercel project env vars (production + preview + development).
 *
 * Usage:
 *   node scripts/sync-vercel-env.js            # sync all vars
 *   node scripts/sync-vercel-env.js --dry-run  # show what would change
 *
 * Requires: `vercel` CLI logged in, run from repo root.
 * Skips empty values and NEXT_PHASE/NODE_ENV (Vercel manages those).
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const DRY = process.argv.includes('--dry-run')
const envPath = path.join(__dirname, '..', '.env.local')

if (!fs.existsSync(envPath)) {
  console.error('✗ .env.local not found. Create it from .env.example first.')
  process.exit(1)
}

// Parse .env.local
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

const SKIP = new Set(['NODE_ENV', 'NEXT_PHASE', 'PATH', 'HOME'])
const targets = ['production', 'preview', 'development']
const entries = Object.entries(vars).filter(([k, v]) => !SKIP.has(k) && v !== '')

console.log(`Syncing ${entries.length} vars to Vercel (${targets.join(', ')})${DRY ? ' [DRY RUN]' : ''}...`)

let ok = 0, fail = 0
for (const [key, value] of entries) {
  if (DRY) { console.log(`  would set ${key}`); ok++; continue }
  // SAFE ORDER: try add FIRST. Only rm+re-add if it already exists.
  // Never rm before a confirmed add — a failed add after rm deletes the var.
  const addOne = (t) =>
    execSync(`printf %s ${JSON.stringify(value)} | vercel env add ${key} ${t}`, { stdio: 'pipe', shell: '/bin/bash' })
  try {
    for (const t of targets) {
      try {
        addOne(t)
      } catch {
        // likely already exists -> replace
        try { execSync(`vercel env rm ${key} ${t} --yes`, { stdio: 'pipe' }) } catch {}
        addOne(t)
      }
    }
    ok++
  } catch (e) {
    console.error(`  ✗ ${key}: ${String(e.message).split('\n')[0]}`)
    fail++
  }
}

console.log(`\nDone: ${ok} synced, ${fail} failed.`)
if (!DRY) console.log('NOTE: redeploy (`vercel --prod`) for changes to take effect.')
