import fs from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /videos/[filename]
 *
 * Serves generated MP4 files placed by the GPU worker in /app/videos/ (mounted
 * from /mnt/c/Users/romel/hostamar-local/flociops-assistant/videos via
 * docker-compose.local.yml volume: ./videos:/app/videos).
 *
 * Range requests are supported so the <video> tag can stream.
 */
const VIDEO_DIR = process.env.WORKER_VIDEO_DIR || '/app/videos'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } },
) {
  // Mute a fully-qualified path: only basename allowed
  const safeName = path.basename(params.filename)
  if (safeName !== params.filename || !safeName.endsWith('.mp4')) {
    return NextResponse.json({ error: 'invalid filename' }, { status: 400 })
  }

  const filePath = path.join(VIDEO_DIR, safeName)
  let stat: fs.Stats
  try {
    stat = fs.statSync(filePath)
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const size = stat.size
  const range = request.headers.get('range')
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range)
    if (!m) {
      return new NextResponse(null, { status: 416 })
    }
    const start = parseInt(m[1], 10)
    const end = m[2] ? parseInt(m[2], 10) : size - 1
    const chunkSize = end - start + 1
    const stream = fs.createReadStream(filePath, { start, end })
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  const stream = fs.createReadStream(filePath)
  return new NextResponse(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
