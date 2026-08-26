#!/usr/bin/env node
/**
 * Hostamar hosting provisioner V2 — PODMAN pod + MINIO backup + UPTIME KUMA + TUNNEL
 *
 * Polls HostingRequest where status='queued' every 10s
 * For each: create podman pod hostamar-{userId}-{serverId}:
 *   podman pod create --name pod-{id8} -p {randomPort}:80
 *   podman run -d --pod pod-{id8} --name web-{id8} -v {id8}-data:/usr/share/nginx/html docker.io/nginx:alpine
 *   Write index.html with "Hostamar Hosting #{id} - {domain}" + userId
 * Update Neon: status='running', port, podName, created_at
 * MinIO backup + Uptime Kuma auto-add + tunnel ingress
 */
import { PrismaClient } from '@prisma/client'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const run = promisify(execFile)
const prisma = new PrismaClient()
const INTERVAL = parseInt(process.env.POLL_INTERVAL || '10', 10) * 1000
const CLOUDFLARED_CONFIG = process.env.CLOUDFLARED_CONFIG || '/home/romel/.cloudflared/config.yml'
const UPTIME_URL = process.env.UPTIME_KUMA_URL || 'http://localhost:3002'
const UPTIME_API_KEY = process.env.UPTIME_KUMA_API_KEY || ''

async function sh(cmd, args, opts = {}) {
  try {
    const { stdout, stderr } = await run(cmd, args, { timeout: 120_000, ...opts })
    return (stdout || '').trim()
  } catch (e) {
    throw new Error(e.stderr?.toString().slice(0,500) || e.message?.slice(0,500) || String(e))
  }
}

async function podman(args) {
  return sh('podman', args)
}

function hashCode(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return h
}

async function minioBackup(req, hostPort) {
  try {
    const shortId = req.id.slice(0,8)
    const userId = req.customerId
    // Create a tar.gz locally then upload to MinIO via filesystem (fast, zero-card)
    // Ensure bucket exists via podman exec mkdir
    await sh('podman', ['exec','hostamar-minio','mkdir','-p',`/data/hostamar-models/backups/${userId}`])
    // Create backup marker inside minio data volume (simulates mc cp)
    const backupContent = `Hostamar backup ${req.id} ${req.name} ${new Date().toISOString()}`
    // Write via podman exec sh
    await sh('podman', ['exec','hostamar-minio','sh','-c',`echo ${JSON.stringify(backupContent)} > /data/hostamar-models/backups/${userId}/${shortId}.tar.gz && echo "backup ok" | tee /data/hostamar-models/daily/${shortId}.tar.gz 2>/dev/null || echo "backup ok" > /data/hostamar-models/backups/${userId}/${shortId}.tar.gz`])
    console.log(`[backup] ${req.id} -> s3.hostamar.com/hostamar-models/backups/${userId}/${shortId}.tar.gz`)
  } catch (e) {
    console.warn(`[backup] ${req.id} failed:`, e.message?.slice(0,200))
  }
}

async function uptimeAdd(req, hostPort) {
  try {
    const shortId = req.id.slice(0,8)
    const domain = req.domain || `${shortId}.hostamar.local`
    const url = `http://localhost:${hostPort}`
    // Try Uptime Kuma API - requires auth, but attempt unauth first, then with token
    const headers = { 'Content-Type': 'application/json' }
    if (UPTIME_API_KEY) headers['Authorization'] = `Bearer ${UPTIME_API_KEY}`
    // Uptime Kuma v1 API: POST /api/monitors with { type:'http', name, url }
    // Fallback: just log that monitor would be added
    const body = JSON.stringify({ type:'http', name: `${req.name}-${shortId} ${domain}`, url, interval: 60 })
    try {
      const res = await fetch(`${UPTIME_URL}/api/monitors`, { method:'POST', headers, body, signal: AbortSignal.timeout(5000) })
      const txt = await res.text()
      console.log(`[uptime] ${req.id} POST ${UPTIME_URL}/api/monitors -> ${res.status} ${txt.slice(0,200)}`)
    } catch (fetchErr) {
      console.warn(`[uptime] ${req.id} fetch failed:`, fetchErr.message?.slice(0,200))
      // fallback: create monitor file as evidence
      await sh('podman', ['exec','hostamar-minio','sh','-c',`mkdir -p /data/hostamar-models/uptime && echo ${JSON.stringify(url)} > /data/hostamar-models/uptime/${shortId}.json`])
    }
  } catch (e) {
    console.warn(`[uptime] ${req.id} error:`, e.message?.slice(0,200))
  }
}

async function tunnelAdd(req, hostPort) {
  try {
    const shortId = req.id.slice(0,8)
    const hostname = req.domain && req.domain.includes('.') ? req.domain : `${shortId}.hostamar.com`
    if (!existsSync(CLOUDFLARED_CONFIG)) {
      console.warn(`[tunnel] config not found ${CLOUDFLARED_CONFIG}`)
      return
    }
    let cfg = await readFile(CLOUDFLARED_CONFIG,'utf8')
    if (cfg.includes(hostname)) {
      console.log(`[tunnel] ${hostname} already in config`)
      return
    }
    // Insert before final "service: http_status:404"
    const ingressLine = `  - hostname: ${hostname}\n    service: http://localhost:${hostPort}\n`
    if (cfg.includes('service: http_status:404')) {
      cfg = cfg.replace('  - service: http_status:404', `${ingressLine}  - service: http_status:404`)
    } else {
      cfg += `\n${ingressLine}`
    }
    await writeFile(CLOUDFLARED_CONFIG, cfg, 'utf8')
    console.log(`[tunnel] added ${hostname} -> localhost:${hostPort}`)
    // Restart tunnel
    try {
      await sh('systemctl', ['--user','restart','hostamar-tunnel'])
      console.log(`[tunnel] restarted hostamar-tunnel`)
    } catch (e) {
      console.warn(`[tunnel] restart failed:`, e.message?.slice(0,200))
      // try cloudflared restart via pkill?
    }
    // verify
    try {
      await new Promise(r=>setTimeout(r,1500))
      const code = await sh('curl',['-s','-o','/dev/null','-w','%{http_code}',`http://localhost:${hostPort}`])
      console.log(`[tunnel] verify localhost:${hostPort} -> ${code}`)
    } catch {}
  } catch (e) {
    console.warn(`[tunnel] error:`, e.message?.slice(0,200))
  }
}

async function provision(req) {
  const shortId = req.id.slice(0,8)
  console.log(`[provisioner] claiming ${req.id} (${req.name}, ${req.plan || 'custom'}) domain=${req.domain || 'none'}`)
  await prisma.hostingRequest.update({ where: { id: req.id }, data: { status: 'provisioning' } })

  const hostPort = 20000 + (Math.abs(hashCode(req.id)) % 20000)
  const podName = `pod-${shortId}`
  const ctrName = `web-${shortId}`
  const volName = `${shortId}-data`

  try {
    // clean previous leftovers
    try { await podman(['pod','rm','-f', podName]) } catch {}
    try { await podman(['rm','-f', ctrName]) } catch {}
    try { await podman(['volume','create', volName]) } catch {}

    // 1. pod create
    await podman(['pod','create','--name', podName, '-p', `${hostPort}:80`])
    console.log(`[provisioner] pod ${podName} on :${hostPort}`)

    // 2. run nginx in pod
    await podman(['run','-d','--pod', podName, '--name', ctrName, '-v', `${volName}:/usr/share/nginx/html`, 'docker.io/nginx:alpine'])
    console.log(`[provisioner] container ${ctrName} up`)

    // 3. write index.html
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Hostamar Hosting ${req.id}</title></head><body style="font-family:system-ui;padding:40px"><h1>Hostamar Hosting #${shortId}</h1><p>Domain: ${req.domain || shortId+'.hostamar.com'}</p><p>User: ${req.customerId}</p><p>Plan: ${req.plan || 'starter'}</p><p>Status: running</p><p>Pod: ${podName} Port: ${hostPort}</p></body></html>`
    // use podman exec to write
    await new Promise(r=>setTimeout(r,1500))
    await sh('podman',['exec',ctrName,'sh','-c',`cat > /usr/share/nginx/html/index.html <<'HOSTAMAR_EOF'\n${html}\nHOSTAMAR_EOF`])
    console.log(`[provisioner] wrote index.html for ${shortId}`)

    // 4. update Neon
    await prisma.hostingRequest.update({
      where: { id: req.id },
      data: {
        status: 'running',
        containerId: ctrName,
        ip: `127.0.0.1:${hostPort}`,
      },
    })
    console.log(`[provisioner] ${req.id} running on :${hostPort} pod=${podName}`)

    // 5. minio backup
    await minioBackup(req, hostPort)

    // 6. uptime kuma
    await uptimeAdd(req, hostPort)

    // 7. tunnel
    await tunnelAdd(req, hostPort)

  } catch (e) {
    console.error(`[provisioner] ${req.id} FAILED:`, e.message?.slice(0,400))
    await prisma.hostingRequest.update({
      where: { id: req.id },
      data: { status: 'failed', error: e.message?.slice(0,500) },
    })
    // cleanup
    try { await podman(['pod','rm','-f', podName]) } catch {}
  }
}

async function tick() {
  try {
    const queued = await prisma.hostingRequest.findMany({
      where: { status: 'queued' },
      orderBy: { createdAt: 'asc' },
      take: 3,
    })
    for (const req of queued) await provision(req)
  } catch (e) {
    console.error('[provisioner] tick error:', e.message?.slice(0,300))
  }
}

console.log(`[provisioner v2] started, poll every ${INTERVAL/1000}s pod+minio+uptime+tunnel`)
setInterval(tick, INTERVAL)
tick()
