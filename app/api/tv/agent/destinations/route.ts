export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import { env } from '@/lib/env'
import { getOrCreateDefaultChannel } from '@/lib/tv/generator'

/**
 * GET /api/tv/agent/destinations?secret=TV_AGENT_SECRET
 * Agent-only: returns ACTIVE destinations with FULL stream keys so the local
 * ffmpeg can fan out. Protected by TV_AGENT_SECRET, NOT cookie auth.
 * (/api/tv/destinations stays admin-cookie + masked keys.)
 */
export async function GET(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-agent-secret') || ''
    const expected = env.TV_AGENT_SECRET || process.env.TV_AGENT_SECRET || ''
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Invalid agent secret' }, { status: 401 })
    }
    await ensureSchema()
    const channel = await getOrCreateDefaultChannel()
    const destinations = await prisma.tvStreamDestination.findMany({
      where: { channelId: channel.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({
      ok: true,
      destinations: destinations.map((d) => ({
        id: d.id,
        platform: d.platform,
        rtmpUrl: d.rtmpUrl,
        streamKey: d.streamKey,
        label: d.label,
        isActive: d.isActive,
      })),
    })
  } catch (err) {
    console.error('[tv/agent/destinations] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
