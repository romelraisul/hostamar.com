export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import { createViralVideo } from '@/lib/tv/viral/creator'

export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    let trendId: string | null = body.viralTrendId || body.trendId || null
    if (!trendId) {
      const top = await prisma.viralTrend.findFirst({ where: { used: false }, orderBy: { viralScore: 'desc' } })
      if (!top) return NextResponse.json({ ok: false, error: 'No unused ViralTrend' }, { status: 404 })
      trendId = top.id as string
    }
    const result = await createViralVideo(trendId as string)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
