#!/usr/bin/env node
/**
 * scripts/vercel-guard.mjs — V86: Vercel usage watchdog (GitHub Actions).
 *
 * Checks Functions Storage, Deployment Storage, and Fluid Active CPU.
 * If storage > 5GB → bulk delete deployments older than 48h (keeps newest 3).
 * If Fluid Active CPU > 3h → Telegram alert.
 *
 * Runs on GitHub Actions daily (zero Vercel CPU).
 * Requires VERCEL_TOKEN in GitHub Secrets.
 */
const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const PROJECT_ID = 'prj_WwYkMz8Kk75NN573skKxxWcuMVYi' // hostamar-build only
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT = process.env.TELEGRAM_ADMIN_CHAT_ID || ''

const GB = 1024 * 1024 * 1024
const STORAGE_LIMIT = 5 * GB
const CPU_LIMIT = 3 * 3600 // 3 hours
const KEEP_LAST_N = 3
const MAX_AGE_MS = 48 * 3600 * 1000

async function vercelApi(path, method = 'GET') {
  const r = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  })
  if (!r.ok) throw new Error(`Vercel API ${r.status} ${path}`)
  return r.json()
}

async function listAllDeployments() {
  const all = []
  let url = `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=100`
  for (let i = 0; i < 20 && url; i++) {
    const d = await vercelApi(url)
    const deps = d.deployments || []
    if (!deps.length) break
    all.push(...deps)
    const nxt = d.pagination?.next
    url = nxt ? `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=100&until=${nxt}` : ''
  }
  return all
}

async function deleteDeployment(uid) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await vercelApi(`/v13/deployments/${uid}`, 'DELETE')
      return true
    } catch (e) {
      if (e.message?.includes('404')) return true
      if (e.message?.includes('429')) {
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)))
        continue
      }
      return false
    }
  }
  return false
}

async function sendTelegram(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return false
  try {
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text }),
    })
    return r.ok
  } catch {
    return false
  }
}

async function main() {
  if (!VERCEL_TOKEN) {
    console.log('VERCEL_TOKEN not set, skipping')
    process.exit(0)
  }

  console.log('V86 guard: checking Vercel usage...')

  // Get deployment count as storage proxy (usage API may not be available on free plan)
  const deployments = await listAllDeployments()
  const totalDeployments = deployments.length
  console.log(`Total deployments: ${totalDeployments}`)

  // Estimate: each deployment ~150-500MB function bundle. If > 15 deployments, likely > 5GB.
  // More accurate: check actual usage if available
  let usage = { functionsStorage: 0, deploymentStorage: 0, fluidActiveCPU: 0 }
  try {
    const u = await vercelApi(`/v1/projects/${PROJECT_ID}/usage?mode=total&from=${Date.now() - 86400000}&to=${Date.now()}`)
    usage = {
      functionsStorage: u.functionsStorage || 0,
      deploymentStorage: u.deploymentStorage || 0,
      fluidActiveCPU: u.fluidActiveCPU || u.activeCPU || 0,
    }
    console.log(`Usage: functionsStorage=${(usage.functionsStorage/GB).toFixed(2)}GB deploymentStorage=${(usage.deploymentStorage/GB).toFixed(2)}GB fluidCPU=${(usage.fluidActiveCPU/3600).toFixed(2)}h`)
  } catch (e) {
    console.log('Usage API unavailable, using deployment count proxy')
  }

  const storageOver = usage.functionsStorage > STORAGE_LIMIT || usage.deploymentStorage > STORAGE_LIMIT
  const deploymentProxyOver = totalDeployments > 15 // fallback when usage API unavailable

  let deleted = 0
  const alerts = []

  if (storageOver || deploymentProxyOver) {
    console.log('Storage over threshold, cleaning old deployments...')
    const now = Date.now()
    const sorted = deployments.sort((a, b) => (b.created || 0) - (a.created || 0))
    const toDelete = []
    let kept = 0
    for (const dep of sorted) {
      if (kept < KEEP_LAST_N) { kept++; continue }
      if (now - (dep.created || 0) < MAX_AGE_MS) continue
      toDelete.push(dep.uid)
    }
    console.log(`Deleting ${toDelete.length} deployments...`)
    for (const uid of toDelete) {
      const ok = await deleteDeployment(uid)
      if (ok) deleted++
      if (deleted % 50 === 0) console.log(`  deleted ${deleted}/${toDelete.length}`)
    }
    alerts.push(`storage cleanup: ${deleted} deployments deleted`)
  }

  if (usage.fluidActiveCPU > CPU_LIMIT) {
    alerts.push(`Fluid CPU ${(usage.fluidActiveCPU/3600).toFixed(1)}h over 3h threshold`)
  }

  if (alerts.length) {
    const msg = `🛡 V86 guard: ${alerts.join('; ')}`
    console.log(msg)
    await sendTelegram(msg)
  } else {
    console.log('V86 guard: clean — within limits')
  }

  console.log(`Done. deleted=${deleted}`)
}

main().catch(e => { console.error(e); process.exit(1) })
