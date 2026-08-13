import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

// Serve generated media from the local ComfyUI output directory.
// This keeps binary files off Postgres/Neon and lets admin/users play/download them.
const ALLOWED_ROOTS = [
  process.env.COMFYUI_OUTPUT_DIR || path.join('C:', 'ComfyUI_Download', 'ComfyUI_windows_portable', 'ComfyUI', 'output'),
  path.join(process.cwd(), 'public', 'media'),
]

function safeJoin(root: string, requestedPath: string) {
  const resolved = path.resolve(root, path.normalize(requestedPath))
  if (!resolved.startsWith(root)) return null
  return resolved
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const filename = req.nextUrl.searchParams.get('f')
    const type = req.nextUrl.searchParams.get('t') || 'output'

    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 })
    }

    const sanitized = path.basename(filename).replace(/[^a-zA-Z0-9_.\-]/g, '')
    if (!sanitized) {
      return NextResponse.json({ error: 'invalid filename' }, { status: 400 })
    }

    let filePath: string | null = null
    let rootName = ''

    for (const root of ALLOWED_ROOTS) {
      const candidate = safeJoin(root, sanitized)
      if (candidate && fs.existsSync(candidate)) {
        filePath = candidate
        rootName = root
        break
      }
    }

    if (!filePath) {
      return NextResponse.json({ error: 'file not found', filename: sanitized, root: rootName || ALLOWED_ROOTS[0] }, { status: 404 })
    }

    const stat = fs.statSync(filePath)
    const contentType = sanitized.endsWith('.png')
      ? 'image/png'
      : sanitized.endsWith('.webp')
        ? 'image/webp'
        : sanitized.endsWith('.mp4')
          ? 'video/mp4'
          : sanitized.endsWith('.webm')
            ? 'video/webm'
            : 'application/octet-stream'

    const stream = fs.createReadStream(filePath)
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stat.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, If-None-Match, If-Modified-Since',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified',
        'Accept-Ranges': 'bytes',
      },
    })
  } catch (error: any) {
    console.error('[video/file] GET error:', error)
    return NextResponse.json({ error: 'internal_error', message: error?.message }, { status: 500 })
  }
}

export async function HEAD(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return GET(req, { params })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, If-None-Match, If-Modified-Since',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified',
      'Access-Control-Max-Age': '86400',
    },
  })
}
