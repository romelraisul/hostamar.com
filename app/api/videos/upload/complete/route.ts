export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { uploadToB2 } from '@/lib/ai-video'

/**
 * POST /api/videos/upload/complete — V30.
 *
 * Local HunyuanVideo worker completion callback. The worker renders the
 * 30s 9:16 motion video on the user's PC (ComfyUI @ 127.0.0.1:8188,
 * HunyuanVideo 1.5 8B fp8, 5 clips → ffmpeg concat + Bengali VO), then:
 *
 *   A) multipart {videoId, secret, file}  — worker uploads the final MP4
 *      through THIS route (B2 creds never leave the server; the worker only
 *      holds the worker secret). Stored at videos/{videoId}/final.mp4.
 *   B) JSON {videoId, b2Key, secret}      — worker already pushed to B2
 *      itself (rclone), we just flip the row.
 *
 * Both paths: Video.status=completed, video.url=real .mp4 (dashboard native
 * <video> player via the V29 private proxy /api/videos/file/...), VideoQueue
 * status=completed. JSON body may also carry thumbnail (data URL) + stats.
 *
 * Auth: COMFYUI_WORKER_SECRET — fail closed (V18 rule).
 */
export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') || ''
    let secret = ''
    let videoId = ''
    let b2Key = ''
    let thumbnail: string | null = null
    let file: File | null = null
    let stats: Record<string, unknown> = {}

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData().catch(() => null)
      if (!form) return NextResponse.json({ error: 'bad multipart', code: 400 }, { status: 400 })
      secret = String(form.get('secret') || '')
      videoId = String(form.get('videoId') || '')
      b2Key = String(form.get('b2Key') || '')
      thumbnail = (form.get('thumbnail') as string | null) || null
      file = (form.get('file') as File | null) || null
      try {
        stats = JSON.parse(String(form.get('stats') || '{}'))
      } catch { stats = {} }
    } else {
      const body = await req.json().catch(() => ({}))
      secret = String(body.secret || '')
      videoId = String(body.videoId || '')
      b2Key = String(body.b2Key || '')
      thumbnail = body.thumbnail || null
      stats = body.stats || {}
    }

    const expected = process.env.COMFYUI_WORKER_SECRET || ''
    if (!expected || !secret || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 })
    }
    if (!videoId) {
      return NextResponse.json({ error: 'videoId required', code: 400 }, { status: 400 })
    }

    // The video row must exist and (defensively) not belong to a weird state.
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, customerId: true, status: true },
    })
    if (!video) {
      return NextResponse.json({ error: 'Video not found', code: 404 }, { status: 404 })
    }

    // Path A: worker sent the file — push it to B2 here.
    let finalKey = b2Key
    if (file && file.size > 0) {
      if (file.size > 200 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 200MB)', code: 400 }, { status: 400 })
      }
      if (!file.type.startsWith('video/')) {
        return NextResponse.json({ error: 'Only video/* files', code: 400 }, { status: 400 })
      }
      finalKey = `videos/${videoId}/final.mp4`
      const buf = Buffer.from(await file.arrayBuffer())
      const url = await uploadToB2(buf, finalKey, 'video/mp4')
      if (!url) {
        return NextResponse.json({ ok: false, error: 'B2 upload failed' }, { status: 502 })
      }
    }

    if (!finalKey) {
      return NextResponse.json({ error: 'b2Key or file required', code: 400 }, { status: 400 })
    }

    // The V29 private proxy serves this shape (videos/{id}/...) to the owner.
    const playbackUrl = `https://f005.backblazeb2.com/file/${process.env.B2_BUCKET || 'hostamar-prod'}/${finalKey}`

    await prisma.video
      .update({
        where: { id: videoId },
        data: {
          status: 'completed',
          url: playbackUrl,
          format: 'mp4',
          ...(thumbnail ? { thumbnailUrl: thumbnail } : {}),
          fileSize: Number(stats.fileSize) || undefined,
          updatedAt: new Date(),
        },
      })
      .catch((e: any) => console.warn('[upload/complete] video update failed:', String(e?.message || e).slice(0, 120)))

    await prisma.videoQueue
      .updateMany({
        where: { videoId, status: { in: ['pending', 'processing'] } },
        data: {
          status: 'completed',
          renderStatus: 'success',
          videoUrl: playbackUrl,
          processedAt: new Date(),
        },
      })
      .catch(() => null)

    return NextResponse.json({
      ok: true,
      videoId,
      status: 'completed',
      url: playbackUrl,
      note: 'HunyuanVideo 1.5 8B motion video — dashboard plays via /api/videos/file/ private proxy',
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal server error', detail: String(e?.message || e).slice(0, 160) },
      { status: 500 },
    )
  }
}
