#!/usr/bin/env node
/**
 * RECOVERY: restore the 4 critical vars my buggy sync deleted from Vercel prod.
 * Reads real values from legacy-env-archive (on disk, never printed).
 *   DATABASE_URL    <- env.migrate (Neon pooler — the cloud DB Vercel reaches)
 *   JWT_SECRET      <- env.production.local (real 64-char prod secret)
 *   NEXTAUTH_SECRET <- env.production.local
 *   NEXTAUTH_URL    <- https://hostamar.com
 * Adds to production ONLY (one env per call — the multi-target form is broken).
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const archive = path.join(__dirname, '..', 'legacy-env-archive')

function readVar(file, key) {
  const p = path.join(archive, file)
  if (!fs.existsSync(p)) return null
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(new RegExp(`^${key}=(.*)$`))
    if (m) {
      let v = m[1].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      return v
    }
  }
  return null
}

const plan = [
  { key: 'DATABASE_URL', file: 'env.migrate' },
  { key: 'JWT_SECRET', file: 'env.production.local' },
  { key: 'NEXTAUTH_SECRET', file: 'env.production.local' },
]

let ok = 0, fail = 0
for (const { key, file } of plan) {
  const value = readVar(file, key)
  if (!value) { console.error(`  ✗ ${key}: not found in ${file}`); fail++; continue }
  try {
    // add to production only (do NOT rm first — avoid another delete window)
    execSync(`printf %s ${JSON.stringify(value)} | vercel env add ${key} production`, { stdio: 'pipe', shell: '/bin/bash' })
    console.log(`  ✓ ${key} restored (${value.length} chars) from ${file}`)
    ok++
  } catch (e) {
    // If it already exists, rm then re-add
    try {
      execSync(`vercel env rm ${key} production --yes`, { stdio: 'pipe' })
      execSync(`printf %s ${JSON.stringify(value)} | vercel env add ${key} production`, { stdio: 'pipe', shell: '/bin/bash' })
      console.log(`  ✓ ${key} restored (replaced) from ${file}`)
      ok++
    } catch (e2) {
      console.error(`  ✗ ${key}: ${String(e2.message).split('\n')[0]}`)
      fail++
    }
  }
}

// NEXTAUTH_URL is a known constant
try {
  execSync(`printf %s "https://hostamar.com" | vercel env add NEXTAUTH_URL production`, { stdio: 'pipe', shell: '/bin/bash' })
  console.log('  ✓ NEXTAUTH_URL restored')
  ok++
} catch (e) {
  try {
    execSync(`vercel env rm NEXTAUTH_URL production --yes`, { stdio: 'pipe' })
    execSync(`printf %s "https://hostamar.com" | vercel env add NEXTAUTH_URL production`, { stdio: 'pipe', shell: '/bin/bash' })
    console.log('  ✓ NEXTAUTH_URL restored (replaced)')
    ok++
  } catch (e2) {
    console.error(`  ✗ NEXTAUTH_URL: ${String(e2.message).split('\n')[0]}`)
    fail++
  }
}

console.log(`\nRecovery: ${ok} restored, ${fail} failed.`)
console.log('NEXT: redeploy with `vercel --prod --yes` to activate.')
