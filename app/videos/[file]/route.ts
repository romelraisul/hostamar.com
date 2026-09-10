import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, statSync, existsSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'

// Serves public/videos/* with correct content-type, Range support, and
// long immutable cache. (Vercel edge was 404ing .mp4 under /videos/ while
// .jpg served fine — this route takes serving into our control.)
const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webm': 'video/webm',
}

export async function GET(req: NextRequest, { params }: { params: { file: string } }) {
  const file = params.file || ''
  if (!/^[A-Za-z0-9_-]+\.(mp4|jpg|jpeg|png|webm)$/.test(file)) {
    return new NextResponse('Not Found', { status: 404 })
  }
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
  const abs = join(process.cwd(), 'public', 'videos', file)
  if (!existsSync(abs)) return new NextResponse('Not Found', { status: 404 })
  const size = statSync(abs).size
  const range = req.headers.get('range')
  const headers: Record<string, string> = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
  }
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range)
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 0
      const end = m[2] ? parseInt(m[2], 10) : Math.min(size - 1, start + 2 * 1024 * 1024)
      if (start >= size) {
        return new NextResponse('Range Not Satisfiable', {
          status: 416,
          headers: { ...headers, 'Content-Range': `bytes */${size}` },
        })
      }
      const clampedEnd = Math.min(end, size - 1)
      const stream = createReadStream(abs, { start, end: clampedEnd })
      return new NextResponse(Readable.toWeb(stream) as unknown as BodyInit, {
        status: 206,
        headers: {
          ...headers,
          'Content-Range': `bytes ${start}-${clampedEnd}/${size}`,
          'Content-Length': String(clampedEnd - start + 1),
        },
      })
    }
  }
  const stream = createReadStream(abs)
  return new NextResponse(Readable.toWeb(stream) as unknown as BodyInit, {
    status: 200,
    headers: { ...headers, 'Content-Length': String(size) },
  })
}
