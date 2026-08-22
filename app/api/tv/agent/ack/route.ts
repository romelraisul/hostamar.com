export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import { env } from '@/lib/env'

/**
 * POST /api/tv/agent/ack (agent)
 * Body: { commandId, status: "DONE"|"FAILED"|"RUNNING", log?: string }
 * Agent marks command done/failed and writes TvLog. Protected by secret.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const commandId = String(body.commandId || '')
    const status = String(body.status || '').toUpperCase()
    const log = body.log ? String(body.log).slice(0, 2000) : null
    const secret = body.secret || req.nextUrl.searchParams.get('secret') || req.headers.get('x-agent-secret') || ''
    const expected = env.TV_AGENT_SECRET || process.env.TV_AGENT_SECRET || ''
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!commandId || !['DONE', 'FAILED', 'RUNNING'].includes(status)) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 })
    }
    await ensureSchema()
    const cmd = await (prisma as any).tvCommand.update({
      where: { id: commandId },
      data: { status, executedAt: new Date() },
    })
    if (log) {
      await (prisma as any).tvLog.create({ data: { level: status === 'FAILED' ? 'error' : 'info', message: `[${cmd.action}] ${log}` } }).catch(() => {})
    } else {
      await (prisma as any).tvLog.create({ data: { level: status === 'FAILED' ? 'error' : 'info', message: `Command ${cmd.action} -> ${status}` } }).catch(() => {})
    }
    return NextResponse.json({ ok: true, command: cmd })
  } catch (err) {
    console.error('[tv/agent/ack] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
