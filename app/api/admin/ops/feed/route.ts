// /api/admin/ops/feed — Employee Ops Center live feed (newest first).
// GET ?limit=50&since=<iso?>  → { events: [...] }
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const runtime = 'nodejs'
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
  const where = since && !isNaN(since.getTime()) ? { createdAt: { gte: since } } : {}

  let events: {
    id: string
    lane: string
    type: string
    severity: string
    title: string
    body: string | null
    meta: string | null
    createdAt: Date
  }[] = []
  try {
    events = await prisma.fleetEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  } catch {
    events = [] // table missing in a fresh env — return an honest empty feed
  }

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      lane: e.lane,
      type: e.type,
      severity: e.severity,
      title: e.title,
      body: e.body,
      meta: e.meta,
      createdAt: e.createdAt,
    })),
  })
}
