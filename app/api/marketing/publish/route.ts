export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 55

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import prisma from '@/lib/prisma'

/**
 * POST /api/marketing/publish — V29 — MANUAL-ONLY publishing.
 *
 * {videoId, platform: 'facebook' | 'youtube' | 'instagram' | 'tiktok'}
 *
 * Explicit user click from /dashboard/marketing (or the video row). NEVER called
 * by the video pipeline, any cron, or video completion — publishing is 100%
 * opt-in per click (V29 decision: auto-publish REMOVED from the product plan).
 *
 * Honest branches, same pattern as FB/GSC MCP tools: without the CUSTOMER's own
 * connected token this returns 401 CONNECT_PLATFORM — no fake success, ever.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { videoId, platform } = body as { videoId?: string; platform?: string }
    if (!videoId || !platform) {
      return NextResponse.json({ error: 'videoId and platform required', code: 400 }, { status: 400 })
    }
    if (!['facebook', 'youtube', 'instagram', 'tiktok'].includes(platform)) {
      return NextResponse.json({ error: 'platform must be facebook|youtube|instagram|tiktok', code: 400 }, { status: 400 })
    }

    // Own row only (IDOR-safe).
    const video = await prisma.video.findFirst({
      where: { id: videoId, customerId: authUser.id },
      select: { id: true, title: true, description: true, url: true, status: true },
    })
    if (!video) {
      return NextResponse.json({ error: 'Video not found for this account', code: 404 }, { status: 404 })
    }
    if (video.status !== 'completed' && video.status !== 'ready') {
      return NextResponse.json({ error: 'Video must be completed first (export WEBM from the player)', code: 409 }, { status: 409 })
    }
    if (!video.url || video.url.startsWith('manifest://')) {
      return NextResponse.json({ error: 'Export the WEBM first (Preview & Export button) so there is a real video file to publish', code: 409 }, { status: 409 })
    }

    // Customer's OWN connected platform token (marketing module, per-platform).
    // Stored on the customer record — NOT the Hostamar owner env keys.
    const tokenField = `marketingToken_${platform}` as any
    const customer = await prisma.customer.findUnique({
      where: { id: authUser.id },
    }).catch(() => null)
    const platformToken = (customer as any)?.[tokenField] || ''

    if (!platformToken) {
      return NextResponse.json(
        {
          error: `Connect your ${platform} account in Marketing settings first`,
          code: 'CONNECT_PLATFORM',
          platform,
          manual: true,
        },
        { status: 401 },
      )
    }

    // Token present → real platform call. The Graph/YouTube upload call is a
    // dedicated follow-up (V30 marketing module build); for now this honest
    // branch states exactly where it runs from, no fabricated postIds.
    return NextResponse.json(
      {
        ok: false,
        platform,
        status: 'TOKEN_CONNECTED_UPLOAD_PENDING',
        note: `Your ${platform} token is connected. The upload call ships with the marketing module (docs/v28 §marketing). Nothing has been posted yet — publishing stays manual.`,
        manual: true,
      },
      { status: 501 },
    )
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error', detail: String(e?.message || e).slice(0, 160) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/marketing/publish',
    usage: 'POST {videoId, platform} — MANUAL ONLY, never auto',
    autoPublish: 'NONE by design (V29)',
    auth: 'dashboard cookie/Bearer',
  })
}
