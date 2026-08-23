export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { testHlsUrl } from '@/lib/tunnel/cloudflare'

/**
 * POST /api/admin/tv/test-hls (admin)
 * Body: { url: "https://.../index.m3u8" }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json().catch(() => ({}))
    const url = String(body.url || '').trim()
    if (!url) return NextResponse.json({ error: 'INVALID_URL' }, { status: 400 })
    const result = await testHlsUrl(url)
    return NextResponse.json({ ok: true, ...result, url })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
