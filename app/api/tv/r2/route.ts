import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const r2Public = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''
    const bucket = process.env.R2_BUCKET || 'hostamar-tv'
    let videos: { name: string; url: string; size?: number }[] = []

    // Try filesystem public/tv first
    const tvDir = path.join(process.cwd(), 'public', 'tv')
    if (fs.existsSync(tvDir)) {
      const files = fs.readdirSync(tvDir).filter(f => f.endsWith('.mp4') || f.endsWith('.m3u8'))
      videos = files.map(f => {
        const stat = fs.statSync(path.join(tvDir, f))
        const url = r2Public ? `${r2Public.replace(/\/+$/, '')}/tv/${f}` : `/tv/${f}`
        return { name: f, url, size: stat.size }
      })
    }

    // If R2 public URL is set, also list via manifest if exists
    const manifestPath = path.join(process.cwd(), 'public', 'tv', 'r2_manifest.json')
    let manifest: any = null
    if (fs.existsSync(manifestPath)) {
      try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) } catch {}
    }

    return NextResponse.json({
      ok: true,
      bucket,
      r2PublicUrl: r2Public,
      count: videos.length,
      videos,
      manifest,
      at: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'private, max-age=30' } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'r2 list failed' }, { status: 500 })
  }
}
