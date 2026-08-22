export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

const VALID_ACTIONS = ['START_WEBSITE', 'START_ALL', 'STOP', 'RELOAD_PLAYLIST', 'GENERATE_VIDEO', 'AUTO_INGEST']

/**
 * POST /api/admin/tv/command (admin)
 * Body: { action: "START_WEBSITE"|"START_ALL"|"STOP"|..., payload?: {} }
 * Creates PENDING TvCommand for local agent to poll.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '').toUpperCase()
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'INVALID_ACTION', message: `action must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 })
    }
    const cmd = await (prisma as any).tvCommand.create({
      data: { action, payload: body.payload || {}, status: 'PENDING' },
    })
    await (prisma as any).tvLog.create({ data: { level: 'info', message: `Command ${action} queued (${cmd.id})` } }).catch(() => {})
    return NextResponse.json({ ok: true, command: cmd })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[admin/tv/command] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

/**
 * GET /api/admin/tv/command (admin) — list recent commands
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()
    const commands = await (prisma as any).tvCommand.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
    return NextResponse.json({ ok: true, commands })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
