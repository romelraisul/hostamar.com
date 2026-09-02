#!/usr/bin/env node
/**
 * scripts/cloud-tracker.mjs — V31 PC-as-Cloud tracker.
 *
 * THE NO-MONEY PLAN: this Windows PC IS the cloud. When it's on, every core
 * service is up; the dashboard at hostamar.com/dashboard/cloud shows live
 * status. When it's off, /api/cloud/status on Vercel reports an HONEST
 * pcOn:false + lastSeen from the DB (heartbeat rows below) — never a fake 500.
 *
 * What this process does:
 *   1. Every POLL_MS (15s): probes all services (docker ps/stats via `docker`,
 *      nvidia-smi, ComfyUI :8188, app :3005, worker log mtime) and writes
 *      C:\tmp\cloud-state.json (also served at GET :3006/api/cloud/status).
 *   2. Every HEARTBEAT_MS (60s): POSTs the state to
 *      {APP}/api/cloud/heartbeat (x-worker-secret) so the DB always knows the
 *      last time the PC was alive — the offline banner reads this.
 *   3. POST :3006/api/cloud/toggle {service, action} — runs the real
 *      docker compose up/down for optional-profile services (auth: same secret).
 *
 * Run: node scripts/cloud-tracker.mjs   (from the repo; .env.local supplies
 * COMFYUI_WORKER_SECRET + WORKER_APP_URL). Task Scheduler starts it at logon.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = join(__dirname, '..')

// ── .env.local loader (file values WIN over inherited shell env — V30 lesson) ──
const FILE_ENV_KEYS = ['COMFYUI_WORKER_SECRET', 'WORKER_APP_URL', 'COMFYUI_URL', 'CLOUD_TRACKER_PORT', 'CLOUD_STATE_FILE']
const fileEnv = {}
if (existsSync(join(REPO, '.env.local'))) {
  for (const line of readFileSync(join(REPO, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) fileEnv[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
for (const k of FILE_ENV_KEYS) if (fileEnv[k]) process.env[k] = fileEnv[k]

const SECRET = process.env.COMFYUI_WORKER_SECRET || ''
const APP = process.env.WORKER_APP_URL || 'https://hostamar.com'
const PORT = Number(process.env.CLOUD_TRACKER_PORT || 3006)
const STATE_FILE = process.env.CLOUD_STATE_FILE || 'C:\\tmp\\cloud-state.json'
const COMFY_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8188'
const POLL_MS = 15_000
const HEARTBEAT_MS = 60_000
if (!SECRET) { console.error('[tracker] COMFYUI_WORKER_SECRET missing — exit'); process.exit(1) }
mkdirSync(dirname(STATE_FILE), { recursive: true })

// ── Service registry: the 13 compose services + the 3 non-docker core pieces.
// autoStart: core = always up when PC on; optional = one-click via toggle.
const REGISTRY = [
  // core (always on)
  { name: 'hostamar-app', profile: 'core', port: 3005, autoStart: true, kind: 'docker', compose: 'hostamar-app', health: { http: 'http://127.0.0.1:3005/api/health' } },
  { name: 'postgres', profile: 'core', port: 5432, autoStart: true, kind: 'docker', compose: 'postgres' },
  { name: 'redis', profile: 'core', port: 6379, autoStart: true, kind: 'docker', compose: 'redis' },
  { name: 'comfyui-8b', profile: 'core', port: 8188, autoStart: true, kind: 'local', health: { http: `${COMFY_URL}/system_stats` } },
  { name: 'hunyuan-worker', profile: 'core', port: null, autoStart: true, kind: 'local', health: { fileMtime: 'C:\\tmp\\worker-v30.log' } },
  // hosting (optional)
  { name: 'coolify', profile: 'hosting', port: 8080, autoStart: false, kind: 'docker', compose: 'coolify' },
  { name: 'paymenter', profile: 'hosting', port: 80, autoStart: false, kind: 'docker', compose: 'paymenter' },
  // chat (optional)
  { name: 'open-webui', profile: 'chat', port: 3080, autoStart: false, kind: 'docker', compose: 'open-webui' },
  { name: 'chatwoot', profile: 'chat', port: 3000, autoStart: false, kind: 'docker', compose: 'chatwoot' },
  { name: 'ollama', profile: 'chat', port: 11434, autoStart: false, kind: 'docker', compose: 'ollama' },
  // browser (optional)
  { name: 'camofox-browser', profile: 'browser', port: 9222, autoStart: false, kind: 'docker', compose: 'camofox-browser' },
  // ide (optional)
  { name: 'code-server', profile: 'ide', port: 8081, autoStart: false, kind: 'docker', compose: 'code-server' },
  // gaming (optional)
  { name: 'sunshine', profile: 'gaming', port: 47990, autoStart: false, kind: 'docker', compose: 'sunshine' },
  { name: 'pterodactyl-panel', profile: 'gaming', port: 8090, autoStart: false, kind: 'docker', compose: 'pterodactyl-panel' },
  { name: 'mysql', profile: 'gaming', port: 3306, autoStart: false, kind: 'docker', compose: 'mysql' },
]

// ── probes ──
// Docker CLI exists ONLY inside WSL on this box (Docker Desktop's Windows CLI
// was never installed; the engine runs in WSL). Shell through wsl.exe so the
// Windows-side tracker still sees real container state.
function runDocker(args, timeoutMs) {
  return spawnSync('wsl.exe', ['-e', 'docker', ...args], { encoding: 'utf8', timeout: timeoutMs })
}

function probeDocker() {
  // Map of container name → {state, cpu, memMB, uptime}
  const out = {}
  const r = runDocker(['ps', '-a', '--format', '{{json .}}'], 20_000)
  if (r.status !== 0 || !r.stdout) return out
  const statsR = runDocker(['stats', '--no-stream', '--format', '{{json .}}'], 25_000)
  const stats = {}
  if (statsR.status === 0 && statsR.stdout) {
    for (const line of statsR.stdout.split('\n').filter(Boolean)) {
      try { const s = JSON.parse(line); stats[s.name || s.Name] = s } catch { /* skip */ }
    }
  }
  for (const line of r.stdout.split('\n').filter(Boolean)) {
    try {
      const c = JSON.parse(line)
      const st = stats[c.Names] || {}
      out[c.Names] = {
        state: (c.State || '').toLowerCase(), // running / exited / ...
        cpu: st.CPUPerc ? String(st.CPUPerc).replace('%', '') : null,
        mem: st.MemUsage ? String(st.MemUsage).split(' / ')[0] : null,
        createdAt: c.CreatedAt,
      }
    } catch { /* skip */ }
  }
  return out
}

async function probeHttp(url, timeoutMs = 2500) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    return r.ok
  } catch { return false }
}

function probeWorkerAlive() {
  // Worker liveness: its log was touched within the last 10 minutes while a
  // render is active; between jobs the worker prints nothing (10s polls are
  // silent on empty queue) — so ALSO accept a fresh process presence.
  const logPath = 'C:\\tmp\\worker-v30.log'
  const logPath2 = 'C:\\tmp\\worker-v31.log'
  for (const p of [logPath, logPath2]) {
    try { if (existsSync(p) && Date.now() - statSync(p).mtimeMs < 10 * 60_000) return true } catch { /* next */ }
  }
  const r = spawnSync('powershell', ['-NoProfile', '-Command',
    "(Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddHours(-12) }).Count"], { encoding: 'utf8', timeout: 10_000 })
  const n = Number(String(r.stdout || '0').trim()) || 0
  return n > 0
}

async function gpuSnapshot() {
  const r = spawnSync('nvidia-smi', ['--query-gpu=memory.used,memory.total,utilization.gpu,temperature.gpu', '--format=csv,noheader,nounits'], { encoding: 'utf8', timeout: 10_000 })
  if (r.status !== 0 || !r.stdout) return null
  const parts = String(r.stdout).trim().split(',').map((x) => Number(x.trim()))
  return { usedMB: parts[0], totalMB: parts[1], utilPct: parts[2], tempC: parts[3] }
}

function bootUptimeSec() {
  const r = spawnSync('powershell', ['-NoProfile', '-Command', '((Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime).TotalSeconds'], { encoding: 'utf8', timeout: 10_000 })
  return Math.round(Number(String(r.stdout || '0').trim())) || 0
}

// ── state assembly ──
async function collectState() {
  const docker = probeDocker()
  const gpu = await gpuSnapshot()
  const services = []
  for (const svc of REGISTRY) {
    const row = { ...svc, status: 'down', cpu: null, mem: null, uptimeSec: null, lastSeen: null }
    if (svc.kind === 'docker') {
      const d = docker[svc.compose] || docker[`hostamar-${svc.compose}`] || null
      if (d) {
        row.status = d.state === 'running' ? 'up' : 'down'
        row.cpu = d.cpu; row.mem = d.mem
        if (d.createdAt) row.uptimeSec = Math.max(0, Math.round((Date.now() - new Date(d.createdAt).getTime()) / 1000))
      }
    } else if (svc.kind === 'local') {
      if (svc.health?.http) {
        row.status = (await probeHttp(svc.health.http)) ? 'up' : 'down'
      } else if (svc.health?.fileMtime) {
        row.status = probeWorkerAlive() ? 'up' : 'down'
      }
      if (svc.name === 'hunyuan-worker') row.note = 'renders VideoQueue rows — 5 clips/job on the RTX 5060'
    }
    if (row.status === 'up') row.lastSeen = new Date().toISOString()
    services.push(row)
  }
  // tailscale IP (best-effort)
  let tailscaleIp = null
  const ts = spawnSync('tailscale', ['ip', '-4'], { encoding: 'utf8', timeout: 8000 })
  if (ts.status === 0 && ts.stdout) tailscaleIp = String(ts.stdout).trim().split('\n')[0] || null

  return {
    timestamp: new Date().toISOString(),
    pcOn: true,
    pcUptimeSec: bootUptimeSec(),
    gpu,
    tailscaleIp,
    tracker: { port: PORT, version: 'v31' },
    services,
    note: 'PC-as-Cloud (No Money Plan) — core always on, optional one-click, $0 cloud cost',
  }
}

// ── heartbeat to the app (so the serverless side knows lastSeen when PC off) ──
let lastState = null
async function heartbeat() {
  if (!lastState) return
  try {
    const r = await fetch(`${APP}/api/cloud/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-worker-secret': SECRET },
      body: JSON.stringify({
        pcUptimeSec: lastState.pcUptimeSec,
        gpu: lastState.gpu,
        tailscaleIp: lastState.tailscaleIp,
        services: lastState.services.map((s) => ({
          name: s.name, profile: s.profile, status: s.status, port: s.port, autoStart: s.autoStart,
          cpu: s.cpu, mem: s.mem, uptimeSec: s.uptimeSec,
        })),
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!r.ok) console.warn('[tracker] heartbeat non-ok:', r.status)
  } catch (e) {
    console.warn('[tracker] heartbeat failed (network?):', String(e?.message || e).slice(0, 100))
  }
}

// ── toggle (docker compose up/down for optional services) ──
function toggle(svcName, action) {
  const svc = REGISTRY.find((s) => s.name === svcName)
  if (!svc) return { ok: false, error: 'unknown service' }
  if (svc.kind !== 'docker') return { ok: false, error: `${svcName} is a core local process — start/stop via its script, not docker` }
  if (svc.autoStart && action === 'down') return { ok: false, error: 'core services cannot be stopped from the dashboard (keeps the pipeline alive)' }
  const dir = REPO
  const profile = svc.profile
  const cmdArgs = action === 'up'
    ? ['compose', '-f', 'docker-compose.all.yml', '--profile', profile, 'up', '-d', svc.compose]
    : ['compose', '-f', 'docker-compose.all.yml', '--profile', profile, 'stop', svc.compose]
  try {
    const r = spawnSync('wsl.exe', ['-e', 'docker', ...cmdArgs], { encoding: 'utf8', cwd: dir, timeout: 180_000 })
    return { ok: r.status === 0, output: String(r.stdout || r.stderr || '').slice(0, 400) }
  } catch (e) {
    return { ok: false, error: String(e?.message || e).slice(0, 200) }
  }
}

// ── HTTP API on 0.0.0.0:3006 (Tailscale-reachable) ──
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  if (req.method === 'GET' && url.pathname === '/api/cloud/status') {
    if (lastState) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify(lastState))
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'state not collected yet' }))
    }
    return
  }
  if (req.method === 'POST' && url.pathname === '/api/cloud/toggle') {
    const secret = req.headers['x-worker-secret'] || ''
    if (!secret || secret !== SECRET) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      try {
        const { service, action } = JSON.parse(body || '{}')
        const result = toggle(String(service || ''), String(action || ''))
        res.writeHead(result.ok ? 200 : 400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: String(e?.message || e).slice(0, 160) }))
      }
    })
    return
  }
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found', endpoints: ['GET /api/cloud/status', 'POST /api/cloud/toggle (x-worker-secret)'] }))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[tracker] V31 PC-as-Cloud tracker on 0.0.0.0:${PORT} — state → ${STATE_FILE}, heartbeat → ${APP}/api/cloud/heartbeat every ${HEARTBEAT_MS / 1000}s`)
})

// ── main loops ──
async function pollOnce() {
  try {
    lastState = await collectState()
    writeFileSync(STATE_FILE, JSON.stringify(lastState, null, 1), 'utf8')
    const up = lastState.services.filter((s) => s.status === 'up').length
    console.log(`[tracker] ${new Date().toISOString().slice(11, 19)} — ${up}/${lastState.services.length} up | GPU ${lastState.gpu ? `${lastState.gpu.utilPct}% ${lastState.gpu.usedMB}/${lastState.gpu.totalMB}MB` : 'n/a'}`)
  } catch (e) {
    console.error('[tracker] poll error:', String(e?.message || e).slice(0, 200))
  }
}

await pollOnce()
setInterval(pollOnce, POLL_MS)
setInterval(heartbeat, HEARTBEAT_MS)
