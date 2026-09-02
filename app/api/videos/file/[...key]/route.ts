export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'

/**
 * GET /api/videos/file/[...key] — V29c private-B2 streaming proxy.
 *
 * The B2 bucket is PRIVATE by design (customer files). `uploadToB2` returns a
 * direct f005.backblazeb2.com/file/... URL — which 401s in the browser
 * (verified live: {"code":"unauthorized"}). This route streams the object
 * server-side (S3 GetObject) after dashboard auth, so <video> and <a download>
 * work while the bucket stays private. Key MUST be under videos/{id}/ where the
 * id belongs to the caller (IDOR-safe: we resolve the video row first).
 *
 * Supports Range (video seeking) via pass-through.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const { key: parts } = await params
    const key = parts.join('/')
    // shape: videos/{videoId}/manifest.json | videos/{videoId}/export-*.webm
    const m = key.match(/^videos\/([^/]+)\//)
    if (!m) {
      return NextResponse.json({ error: 'Bad key shape', code: 400 }, { status: 400 })
    }
    const videoId = m[1]

    // Own row only — never another customer's file (IDOR fix).
    const { prisma } = await import('@/lib/prisma')
    const video = await prisma.video.findFirst({
      where: { id: videoId, customerId: authUser.id },
      select: { id: true },
    }).catch(() => null)
    if (!video) {
      return NextResponse.json({ error: 'Not found for this account', code: 404 }, { status: 404 })
    }

    // Stream from B2 via the S3 SDK (same creds as uploadToB2).
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      region: process.env.B2_REGION || 'us-east-005',
      endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
      credentials: {
        accessKeyId: process.env.B2_ACCOUNT_ID || process.env.B2_APPLICATION_KEY_ID || '',
        secretAccessKey: process.env.B2_APPLICATION_KEY || '',
      },
    })
    const range = req.headers.get('range') || undefined
    const resp: any = await client.send(new GetObjectCommand({
      Bucket: process.env.B2_BUCKET || 'hostamar-prod',
      Key: key,
      ...(range ? { Range: range } : {}),
    }))
    if (!resp?.Body) {
      return NextResponse.json({ error: 'Object empty', code: 404 }, { status: 404 })
    }

    const headers: Record<string, string> = {
      'Content-Type': resp.ContentType || (key.endsWith('.webm') ? 'video/webm' : 'application/json'),
      'Cache-Control': 'private, max-age=3600',
    }
    if (resp.ContentLength) headers['Content-Length'] = String(resp.ContentLength)
    if (resp.ETag) headers['ETag'] = String(resp.ETag)
    if (resp.AcceptRanges) headers['Accept-Ranges'] = String(resp.AcceptRanges)
    if (resp.ContentRange) headers['Content-Range'] = String(resp.ContentRange)

    const webStream = (resp.Body as ReadableStream) || new ReadableStream({
      async start(controller) {
        for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) {
          controller.enqueue(chunk)
        }
        controller.close()
      },
    })

    return new NextResponse(webStream, {
      status: range && resp.ContentRange ? 206 : 200,
      headers,
    })
  } catch (e: any) {
    const msg = String(e?.message || e)
    const status = msg.includes('404') || msg.includes('NoSuchKey') ? 404 : 500
    return NextResponse.json({ error: msg.slice(0, 160) }, { status })
  }
}
