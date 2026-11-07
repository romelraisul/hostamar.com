// /api/admin/ops/feed — Employee Ops Center live feed (newest first).
// GET ?limit=50&since=<iso?>  → { events: [...] }
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { executeWithFailover } from '@/lib/db-failover'

export const dynamic = 'force-dynamic'

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return false
  const payload = verifyToken(token)
  return !!payload && (payload.role === 'admin' || payload.role === 'superadmin')
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const limit = Math.min(Math.max(Number(sp.get('limit') || 50) || 50, 1), 200)
  const sinceRaw = sp.get('since')
  const since = sinceRaw ? new Date(sinceRaw) : null

  const result = await executeWithFailover(async (client, dbType) => {
    const where = since && !isNaN(since.getTime())
      ? (dbType === 'turso'
          ? { sql: 'SELECT * FROM "FleetEvent" WHERE "createdAt" >= ? ORDER BY "createdAt" DESC LIMIT ?', args: [since.toISOString(), limit] }
          : { text: 'SELECT * FROM "FleetEvent" WHERE "createdAt" >= $1 ORDER BY "createdAt" DESC LIMIT $2', values: [since.toISOString(), limit] })
      : (dbType === 'turso'
          ? { sql: 'SELECT * FROM "FleetEvent" ORDER BY "createdAt" DESC LIMIT ?', args: [limit] }
          : { text: 'SELECT * FROM "FleetEvent" ORDER BY "createdAt" DESC LIMIT $1', values: [limit] });

    const rows = dbType === 'turso'
      ? (await client.execute(where as any)).rows
      : (await client.query(where as any)).rows;

    return {
      events: rows.map((e: any) => ({
        id: e.id,
        lane: e.lane,
        type: e.type,
        severity: e.severity,
        title: e.title,
        body: e.body,
        meta: e.meta,
        createdAt: e.createdAt,
      })),
    };
  });

  if (result) {
    return NextResponse.json({
      ...result.result,
      fallback: result.dbType,
    })
  }

  // All DBs down - return empty feed
  return NextResponse.json({
    events: [],
    fallback: 'error',
    warning: 'DB error - returned empty feed',
  })
}
