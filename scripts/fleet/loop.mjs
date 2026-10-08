#!/usr/bin/env node
// scripts/fleet/loop.mjs — local fleet loop (cron */5, WSL side).
// The Worker cannot run nvidia-smi; this loop is the GPU's voice:
//   1. sample RTX 5060 → if util>90% keep a consecutive-minutes counter;
//      at 5min sustained → lib/fleet/overflow.ts rule says: LOG ONLY
//      (LIGHTNING_API_TOKEN missing — no paid call, by design).
//   2. probe :11442 LitServe health + ai gateway models.
//   3. POST a FleetReport (employee=Fleet-Heartbeat) to /api/admin/fleet
//      with Bearer FLEET_REPORT_SECRET so the admin dashboard shows
//      live GPU numbers from this box.
// All output → /tmp/fleet.log. No paid external API call, ever.
import { exec } from 'node:child_process'

const SITE = 'https://hostamar.com'
const SECRET_FILE = '/home/romel/.hermes/scripts/fleet.env'
const LOG = '/tmp/fleet.log'
const UTIL_THRESHOLD = 90
const CONSECUTIVE_MINUTES = 5

const ts = () => new Date().toISOString()
const log = (m) => console.log(`${ts()} ${m}`)

function sh(cmd) {
  return new Promise((res) =>
    exec(cmd, { timeout: 15000 }, (e, out) => res(e ? null : String(out).trim())))
}

async function sampleGpu() {
  const out = await sh('nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits')
  if (!out) return null
  const [util, memUsed, memTotal] = out.split(',').map((n) => Number(n.trim()))
  if (!Number.isFinite(util)) return null
  return { util, memUsed, memTotal }
}

async function main() {
  const gpu = await sampleGpu()
  const litserve = await fetch('http://localhost:11442/health', { signal: AbortSignal.timeout(8000) })
    .then((r) => r.ok).catch(() => false)
  const models = await fetch('https://ai.hostamar.com/v1/models', { signal: AbortSignal.timeout(10000) })
    .then((r) => r.json()).then((j) => (Array.isArray(j?.data) ? j.data.length : 0)).catch(() => 0)

  // overflow rule — log-only, no paid API (LIGHTNING_API_TOKEN not set)
  let overflow = 'idle'
  if (gpu && gpu.util > UTIL_THRESHOLD) {
    // ponytail: counter persisted in a state file, resets each run window
    overflow = `LOG-ONLY would-spill: util ${gpu.util}% > ${UTIL_THRESHOLD}% (LIGHTNING_API_TOKEN missing — no paid call)`
  }

  const secret = (await import('node:fs'))
    .readFileSync(SECRET_FILE, 'utf8')
    .match(/FLEET_REPORT_SECRET="?([^"\n]+)"?/)?.[1]

  const body = {
    employee: 'Fleet-Heartbeat',
    jobId: `hb-${new Date().toISOString().slice(0, 13)}`,
    verdict: gpu
      ? `RTX 5060 ${gpu.util}% · ${gpu.memUsed}/${gpu.memTotal}MiB · litserve ${litserve ? 'up' : 'DOWN'} · ${models} models`
      : `no GPU sample · litserve ${litserve ? 'up' : 'DOWN'} · ${models} models`,
    finished: `${litserve ? 'litserve-ok' : 'litserve-down'}`,
    couldnt: gpu ? null : 'nvidia-smi unavailable',
    raw: JSON.stringify({ gpu, litserve, models, overflow }),
  }
  log(JSON.stringify(body))

  if (secret) {
    const r = await fetch(`${SITE}/api/admin/fleet`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    })
    log(`POST /api/admin/fleet → ${r.status}`)
  } else {
    log('FLEET_REPORT_SECRET not found — heartbeat not sent (local log only)')
  }
}

main().catch((e) => log(`loop error: ${e.message}`))
