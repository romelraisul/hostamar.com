export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

export async function GET(_req: NextRequest) {
  try {
    await ensureSchema()
    const trends = await prisma.viralTrend.findMany({ orderBy: { viralScore: 'desc' }, take: 20 })
    const videos = await prisma.viralVideo.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
    const stats = await prisma.tvVideoStats.findMany({ orderBy: { viralScore: 'desc' }, take: 20 })
    return NextResponse.json({ ok: true, trends, videos, stats })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
