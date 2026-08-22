export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import { env } from '@/lib/env'

/**
 * GET /api/tv/agent/commands?secret=TV_AGENT_SECRET (agent polling)
 * Returns PENDING TvCommands. Protected by TV_AGENT_SECRET, NOT cookie auth.
 */
export async function GET(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-agent-secret') || ''
    const expected = env.TV_AGENT_SECRET || process.env.TV_AGENT_SECRET || ''
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Invalid agent secret' }, { status: 401 })
    }
    await ensureSchema()
    const commands = await (prisma as any).tvCommand.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })
    return NextResponse.json({ ok: true, commands })
  } catch (err) {
    console.error('[tv/agent/commands] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
