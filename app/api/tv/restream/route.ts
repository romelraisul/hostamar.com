import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

export const maxDuration = 30

/** GET /api/tv/restream — list destinations */
export async function GET() {
  try {
    await ensureSchema()
    const rows = await (prisma as any).tvStreamDestination.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ ok: true, destinations: rows })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message?.slice(0,200) }, { status: 500 })
  }
}

/** POST /api/tv/restream — add destination { platform, rtmpUrl, streamKey, label?, channelId? } */
export async function POST(req: Request) {
  try {
    await ensureSchema()
    const b = await req.json()
    const platform = String(b.platform || 'CUSTOM').toUpperCase()
    const rtmpUrl = String(b.rtmpUrl || '').trim()
    const streamKey = String(b.streamKey || '').trim()
    if (!rtmpUrl || !streamKey) return NextResponse.json({ ok:false, error:'rtmpUrl and streamKey required' }, { status: 400 })
    let channelId = b.channelId
    if (!channelId) {
      const ch = await (prisma as any).tvChannel.findFirst()
      channelId = ch?.id
      if (!channelId) return NextResponse.json({ ok:false, error:'no TvChannel' }, { status: 500 })
    }
    const row = await (prisma as any).tvStreamDestination.create({
      data: { channelId, platform, rtmpUrl, streamKey, label: b.label || null, isActive: b.isActive ?? true }
    })
    return NextResponse.json({ ok:true, destination: { id: row.id, platform: row.platform, label: row.label } })
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: e?.message?.slice(0,200) }, { status: 500 })
  }
}
