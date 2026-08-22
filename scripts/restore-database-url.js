#!/usr/bin/env node
/** Restore the VERIFIED working DATABASE_URL to Vercel production.
 * Reads from /tmp/neon_winner.txt (tested live against Neon). Add-first, safe. */
const { execSync } = require('child_process')
const fs = require('fs')

const url = fs.readFileSync('/tmp/neon_winner.txt', 'utf8').trim()
if (!url.startsWith('postgresql://')) { console.error('Invalid winner file'); process.exit(1) }

const add = () =>
  execSync(`printf %s ${JSON.stringify(url)} | vercel env add DATABASE_URL production`, { stdio: 'pipe', shell: '/bin/bash' })

try {
  add()
  console.log('✓ DATABASE_URL added to production')
} catch {
  try { execSync('vercel env rm DATABASE_URL production --yes', { stdio: 'pipe' }) } catch {}
  add()
  console.log('✓ DATABASE_URL replaced in production')
}
console.log('NEXT: redeploy with `vercel --prod --yes`')
