export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 *
 * The V33 pipeline produces sellable 1080x1920 @ ~8-12M bitrate finals
 * (~25-35MB for 30s). The V30 multipart path through /api/videos/upload/complete
 * dies at Vercel's ~4.5MB request-body cap (verified 413 at 5MB in V32), so the
 * worker instead asks THIS route for a presigned B2 PUT URL and pushes the file
 * directly to Backblaze. B2 credentials never leave the server — the worker only
 * receives a short-lived presigned URL bound to one object key.
 *
 * Body: { secret, videoId, fileSize }
 *  - secret: COMFYUI_WORKER_SECRET (fail-closed, same as queue/next)
 *  - videoId: must exist in the Video table
 *  - fileSize: sanity gate — reject >200MB
 *
 * Returns { ok, url, key, headers } — one-time PUT, expires in 30 min.
 * After the PUT the worker calls /api/videos/upload/complete with
 * { secret, videoId, b2Key } (existing path B) to flip the DB rows.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const secret = String(body.secret || '')
    const videoId = String(body.videoId || '')
    const fileSize = Number(body.fileSize || 0)

    const expected = process.env.COMFYUI_WORKER_SECRET || ''
    if (!expected || !secret || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 })
    }
    if (!videoId) {
      return NextResponse.json({ error: 'videoId required', code: 400 }, { status: 400 })
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: 'fileSize required', code: 400 }, { status: 400 })
    }
    if (fileSize > 200 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 200MB)', code: 400 }, { status: 400 })
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true },
    })
    if (!video) {
      return NextResponse.json({ error: 'Video not found', code: 404 }, { status: 404 })
    }

    const key = `videos/${videoId}/final.mp4`
    const bucket = process.env.B2_BUCKET || 'hostamar-prod'

    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
    const client = new S3Client({
      region: process.env.B2_REGION || 'us-east-005',
      endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
      credentials: {
        accessKeyId: process.env.B2_ACCOUNT_ID || process.env.B2_APPLICATION_KEY_ID || '',
        secretAccessKey: process.env.B2_APPLICATION_KEY || '',
      },
    })
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: 'video/mp4',
    })
    // (casts match the repo's existing presigner usage in lib/r2.ts —
    // the v3.577 client/presigner type mismatch is cosmetic here)
    const url = await getSignedUrl(client as any, cmd as any, { expiresIn: 1800 })

    return NextResponse.json({
      ok: true,
      url,
      key,
      headers: { 'Content-Type': 'video/mp4' },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal server error', detail: String(e?.message || e).slice(0, 160) },
      { status: 500 },
    )
  }
}
