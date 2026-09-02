export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/cloud/status — V31.
 *
 * Tries the LIVE tracker on the PC first (PC_CLOUD_URL, default the Tailscale
 * HTTP endpoint). If the PC answers within 3s: pcOn:true + the real live
 * service table. If unreachable: HONEST pcOn:false with lastSeen/gpu/services
 * from the last heartbeat row in the DB + the video-queue waiting count —
 * never a fake "up", never a 500 (spec: "honest, not fake").
 *
 * Auth: dashboard session (getAuthUser). The banner needs it.
 */
const PC_OFFLINE_THRESHOLD_MS = 5 * 60_000 // heartbeat every 60s → 5 min = definitely off

export async function GET(req: NextRequest) {
  try {
    const { getAuthUser } = await import('@/lib/get-auth-user')
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    // 1) Live probe — the PC tracker (via Tailscale URL or direct IP).
    const pcUrl = process.env.PC_CLOUD_URL || ''
    if (pcUrl) {
      try {
        const r = await fetch(`${pcUrl.replace(/\/$/, '')}/api/cloud/status`, {
          signal: AbortSignal.timeout(3000),
          cache: 'no-store',
        })
        if (r.ok) {
          const live = await r.json()
          if (live?.pcOn) {
            return NextResponse.json({ source: 'live', pcOn: true, ...live })
          }
        }
      } catch { /* PC unreachable → fall through to honest offline */ }
    }

    // 2) Honest offline — last known state from the heartbeat row.
    const row = await prisma.cloudState
      .findUnique({ where: { id: 'pc' } })
      .catch(() => null)
    const pendingQueue = await prisma.videoQueue
      .count({ where: { status: 'pending' } })
      .catch(() => 0)

    if (!row) {
      return NextResponse.json({
        source: 'db',
        pcOn: false,
        message: 'PC offline — your computer is off or the tracker was never started. Queue is safe; renders resume when the PC is on.',
        queuedVideos: pendingQueue,
        lastSeen: null,
      })
    }

    const ageMs = Date.now() - new Date(row.lastSeen).getTime()
    const pcOn = ageMs < PC_OFFLINE_THRESHOLD_MS && row.pcOn
    return NextResponse.json({
      source: pcOn ? 'db-recent' : 'db',
      pcOn,
      message: pcOn
        ? 'PC on (recent heartbeat)'
        : 'PC offline — services paused, queue safe. Turn on the PC: everything auto-starts and the queue resumes automatically.',
      lastSeen: row.lastSeen,
      lastSeenAgoSec: Math.round(ageMs / 1000),
      pcUptimeSec: row.pcUptimeSec,
      gpu: row.gpu,
      tailscaleIp: row.tailscaleIp,
      services: row.services,
      queuedVideos: pendingQueue,
      cost: '$0 — runs on your PC, electricity only',
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal server error', detail: String(e?.message || e).slice(0, 160) },
      { status: 500 },
    )
  }
}
