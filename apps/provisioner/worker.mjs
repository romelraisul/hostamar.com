#!/usr/bin/env node
/**
 * Hostamar hosting provisioner V2 — raw @libsql/client SQL (ponytail)
 * Polls HostingRequest where status IN ('PENDING','PROCESSING') every 10s
 * Provisions via WHM API or simulates, updates status
 */
import { createClient } from '@libsql/client'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

const DB_URL = process.env.DATABASE_URL || ''
const db = createClient({
  url: DB_URL.split('?')[0].replace(/^libsql:\/\//, 'https://'),
  authToken: DB_URL.split('authToken=')[1] || process.env.TURSO_AUTH_TOKEN || '',
})

// Minimal HostingRequest CRUD via raw SQL (Turso/libsql)
const prisma = {
  hostingRequest: {
    update: async ({ where, data }) => {
      const sets = Object.keys(data).map(k => `${k} = ?`).join(', ')
      const vals = Object.values(data)
      await db.execute({ sql: `UPDATE HostingRequest SET ${sets} WHERE id = ?`, args: [...vals, where.id] })
    },
    findMany: async ({ where }) => {
      let sql = 'SELECT * FROM HostingRequest WHERE 1=1'
      const args = []
      if (where?.status) {
        if (Array.isArray(where.status.in)) {
          sql += ` AND status IN (${where.status.in.map(() => '?').join(',')})`
          args.push(...where.status.in)
        } else if (where.status.equals) {
          sql += ' AND status = ?'
          args.push(where.status.equals)
        }
      }
      sql += ' ORDER BY createdAt ASC'
      const rs = await db.execute({ sql, args })
      return rs.rows
    },
    count: async ({ where }) => {
      let sql = 'SELECT COUNT(*) as c FROM HostingRequest WHERE 1=1'
      const args = []
      if (where?.status?.in) {
        sql += ` AND status IN (${where.status.in.map(() => '?').join(',')})`
        args.push(...where.status.in)
      }
      const rs = await db.execute({ sql, args })
      return Number(rs.rows[0].c)
    },
  }
}

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '10', 10) * 1000

// WHM provisioning
const WHM_HOST = process.env.WHM_HOST
const WHM_USER = process.env.WHM_USER
const WHM_API_TOKEN = process.env.WHM_API_TOKEN

async function provisionCpanel(userId, domain, pkg) {
  if (!WHM_HOST || !WHM_USER || !WHM_API_TOKEN) {
    console.log('[provisioner] WHM not configured — simulating provision')
    return { success: true, simulated: true, ip: '192.0.2.1', port: 80 }
  }
  const whmUrl = `https://${WHM_HOST}:2087/json-api/createacct?api.version=1`
  const params = new URLSearchParams({
    username: userId.slice(0, 8),
    domain,
    plan: pkg || 'default',
    featurelist: 'default',
    quota: '1024',
    cgi: '1',
    hasshell: '0',
    contactemail: `user-${userId}@hostamar.com`,
  })
  const res = await fetch(whmUrl + '&' + params.toString(), {
    method: 'POST',
    headers: { Authorization: `whm ${WHM_USER}:${WHM_API_TOKEN}` },
    signal: AbortSignal.timeout(30_000),
  })
  const data = await res.json()
  if (!res.ok || data.result?.status !== 1) {
    throw new Error(data.metadata?.result?.[1] || 'WHM createacct failed')
  }
  return { success: true, ip: data.result.ip, port: 80 }
}

async function tick() {
  console.log('[provisioner] tick start')
  try {
    const requests = await prisma.hostingRequest.findMany({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
    })
    console.log(`[provisioner] found ${requests.length} requests`)

    for (const req of requests) {
      if (req.status === 'PENDING') {
        await prisma.hostingRequest.update({
          where: { id: req.id },
          data: { status: 'PROCESSING', updatedAt: new Date().toISOString() },
        })
      }

      try {
        const result = await provisionCpanel(req.userId, req.domain, req.package)
        await prisma.hostingRequest.update({
          where: { id: req.id },
          data: {
            status: 'ACTIVE',
            ip: result.ip,
            port: result.port,
            podName: `pod-${req.id.slice(0,8)}`,
            provisionedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })
        console.log(`[provisioner] ${req.id} -> ACTIVE`)
      } catch (e) {
        console.error(`[provisioner] ${req.id} provisioning failed:`, e.message)
        await prisma.hostingRequest.update({
          where: { id: req.id },
          data: {
            status: 'FAILED',
            error: String(e.message).slice(0, 500),
            updatedAt: new Date().toISOString(),
          },
        })
      }
    }

    // Retry FAILED older than 1h
    const failed = await prisma.hostingRequest.findMany({
      where: { status: { in: ['FAILED'] } },
    })
    for (const req of failed) {
      const age = Date.now() - new Date(req.updatedAt || req.createdAt).getTime()
      if (age > 3_600_000) {
        console.log(`[provisioner] retrying ${req.id} (age ${Math.round(age/60000)}min)`)
        await prisma.hostingRequest.update({
          where: { id: req.id },
          data: { status: 'PENDING', error: null, updatedAt: new Date().toISOString() },
        })
      }
    }
  } catch (e) {
    console.error('[provisioner] tick error:', e.message)
  }
}

console.log(`[provisioner v2] started, poll every ${POLL_INTERVAL/1000}s`)
tick()
setInterval(tick, POLL_INTERVAL)
