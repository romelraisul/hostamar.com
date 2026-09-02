export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import prisma from '@/lib/prisma'
import { uploadToB2 } from '@/lib/ai-video'

/**
 * POST /api/videos/upload — V29.
 * Multipart: {videoId, file} — the client-side MediaRecorder WEBM blob from the
 * dashboard reel-style preview export. Stores it on B2 and flips video.url to
 * the real .webm URL so <video> plays natively afterward.
 *
 * MANUAL-ONLY: called exclusively by an explicit user click ("Preview & Export
 * WEBM" → upload). Nothing in the video pipeline or any cron auto-publishes.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const form = await req.formData().catch(() => null)
    if (!form) {
      return NextResponse.json({ error: 'multipart/form-data with file required', code: 400 }, { status: 400 })
    }
    const videoId = String(form.get('videoId') || '')
    const file = form.get('file') as File | null
    if (!videoId || !file) {
      return NextResponse.json({ error: 'videoId and file required', code: 400 }, { status: 400 })
    }
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Only video/* files', code: 400 }, { status: 400 })
    }
    // 100MB cap — a 12s 720p WEBM at 2.5Mbps ≈ 4MB; generous ceiling.
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 100MB)', code: 400 }, { status: 400 })
    }

    // Own row only (IDOR-safe).
    const video = await prisma.video.findFirst({
      where: { id: videoId, customerId: authUser.id },
      select: { id: true },
    })
    if (!video) {
      return NextResponse.json({ error: 'Video not found for this account', code: 404 }, { status: 404 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const key = `videos/${videoId}/export-${Date.now()}.webm`
    let url = ''
    try {
      url = await uploadToB2(buf, key)
    } catch (e: any) {
      // Honest: B2 hiccup — the client still has the local blob + download.
      return NextResponse.json({ ok: false, error: `B2 upload failed: ${String(e?.message || e).slice(0, 120)}` }, { status: 502 })
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { url, updatedAt: new Date() },
    })

    return NextResponse.json({ ok: true, videoUrl: url, videoId })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error', detail: String(e?.message || e).slice(0, 160) }, { status: 500 })
  }
}
