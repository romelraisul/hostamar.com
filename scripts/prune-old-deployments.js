#!/usr/bin/env node
/**
 * V23 — Prune old Vercel deployments (keep newest N).
 * Usage: VERCEL_TOKEN=<token> PROJECT_ID=<hostamar-build-id> node scripts/prune-old-deployments.js [keep=15]
 * Deletes deployment storage (old builds) — the 6.12GB sitting in the dashboard.
 * NOTE: run only when usage pressure matters; Vercel keeps prod aliases safe
 * (deleting a deployment that is aliased will fail harmlessly).
 */
const KEEP = parseInt(process.argv[2] || '15', 10)
const TOKEN = process.env.VERCEL_TOKEN
const PROJECT = process.env.PROJECT_ID
if (!TOKEN || !PROJECT) {
  console.error('Set VERCEL_TOKEN and PROJECT_ID (hostamar-build project id).')
  process.exit(1)
}

async function main() {
  const H = { Authorization: `Bearer ${TOKEN}` }
  const list = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${PROJECT}&limit=100`,
    { headers: H }
  ).then(r => r.json())
  const deps = list.deployments || []
  console.log(`Found ${deps.length} deployments; keeping newest ${KEEP}.`)
  const victims = deps.slice(KEEP)
  let deleted = 0
  for (const d of victims) {
    const r = await fetch(`https://api.vercel.com/v13/deployments/${d.uid}`, { method: 'DELETE', headers: H })
    if (r.ok) { deleted++; console.log(`  deleted ${d.uid} (${d.state})`) }
    else console.log(`  skip ${d.uid}: HTTP ${r.status} (aliased/protected — fine)`)
  }
  console.log(`Done. Deleted ${deleted}/${victims.length}.`)
}
main().catch(e => { console.error(e); process.exit(1) })
