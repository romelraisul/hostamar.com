import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const OUTPUT_DIR = '/home/romel/ComfyUI/output'


/**
 * Serve rendered media straight from WSL ~/ComfyUI/output to the admin tab.
 * GET ?path=<file> (name or abs path under OUTPUT_DIR) [&download=1]
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('path') || ''
  const download = searchParams.get('download')
  const realPath = path.resolve(raw.startsWith('~') ? raw.replace('~', '/home/romel') : raw.startsWith('/') ? raw : path.join(OUTPUT_DIR, raw))
  // Trust boundary: only files inside ComfyUI output — no traversal.
  if (!realPath.startsWith(OUTPUT_DIR + path.sep) && realPath !== OUTPUT_DIR) {
    return NextResponse.json({ error: 'Forbidden: outside ~/ComfyUI/output', path: realPath }, { status: 403 })
  }
  try {
    if (!fs.existsSync(realPath)) return NextResponse.json({ error: 'Not found (WSL)', path: realPath }, { status: 404 })
    const buf = fs.readFileSync(realPath)
    const ext = path.extname(realPath).toLowerCase()
    const mime = ext === '.mp4' ? 'video/mp4' : ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'application/octet-stream'
    return new NextResponse(buf as any, {
      headers: {
        'Content-Type': mime,
        ...(download ? { 'Content-Disposition': `attachment; filename="${path.basename(realPath)}"` } : {}),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'read failed', path: realPath }, { status: 500 })
  }
}
