#!/usr/bin/env node
/**
 * Hostamar hosting provisioner — PODMAN edition.
 *
 * Polls the HostingRequest table (status=queued), provisions each request as a
 * rootless podman container on this machine, updates status. Run it under a
 * systemd user quadlet so it survives reboots:
 *
 *   ~/.config/containers/systemd/hostamar-provisioner.container
 *
 * Env needed:
 *   DATABASE_URL   – Neon connection string
 *   POLL_INTERVAL  – seconds between polls (default 10)
 */
import { PrismaClient } from '@prisma/client'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const prisma = new PrismaClient()
const INTERVAL = parseInt(process.env.POLL_INTERVAL || '10', 10) * 1000

async function podman(args) {
  const { stdout } = await run('podman', args, { timeout: 120_000 })
  return stdout.trim()
}

async function provision(req) {
  console.log(`[provisioner] claiming ${req.id} (${req.name}, ${req.plan || 'custom'})`)
  await prisma.hostingRequest.update({ where: { id: req.id }, data: { status: 'provisioning' } })

  try {
    // Rootless podman: dedicated network per customer container is overkill;
    // use port publishing on high ports + unique names.
    const hostPort = 20000 + (Math.abs(hashCode(req.id)) % 20000)
    await podman(['run', '-d',
      '--name', `hostamar-${req.name}-${req.id.slice(0, 8)}`,
      '--network', 'hostamar-net',
      '-p', `${hostPort}:80`,
      '--memory', `${Math.max(256, req.ram * 1024)}m`,
      '--cpus', String(Math.max(0.5, req.cpu)),
      req.image,
    ])
    await prisma.hostingRequest.update({
      where: { id: req.id },
      data: {
        status: 'running',
        containerId: `hostamar-${req.name}-${req.id.slice(0, 8)}`,
        ip: `127.0.0.1:${hostPort}`,
      },
    })
    console.log(`[provisioner] ${req.id} running on :${hostPort}`)
  } catch (e) {
    console.error(`[provisioner] ${req.id} FAILED:`, e.message?.slice(0, 200))
    await prisma.hostingRequest.update({
      where: { id: req.id },
      data: { status: 'failed', error: e.message?.slice(0, 500) },
    })
  }
}

function hashCode(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return h
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
    console.error('[provisioner] tick error:', e.message?.slice(0, 200))
  }
}

console.log(`[provisioner] started, poll every ${INTERVAL / 1000}s`)
setInterval(tick, INTERVAL)
tick()
