export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    // If trendId provided, use it; else pick highest unused
    let trendId: string | null = body.viralTrendId || body.trendId || null
    if (!trendId) {
      const top = await prisma.viralTrend.findFirst({ where: { used: false }, orderBy: { viralScore: 'desc' } })
      if (!top) {
        // No unused trend — run research first then pick
        return NextResponse.json({ ok: false, error: 'No unused trend. POST /api/tv/viral/research first.' }, { status: 404 })
      }
      trendId = top.id
    }
    // On Vercel we cannot run ffmpeg — queue for local worker via TvCommand
    // Local podman worker (tv-viral service polling) not needed: just create command
    const cmd: any = await prisma.tvCommand.create({ data: { action: 'VIRAL_CREATE', payload: { viralTrendId: trendId } as any, status: 'PENDING' } })
    // If running locally (has /home/romel writable), also try immediate creation
    try {
      const { createViralVideo } = await import('@/lib/tv/viral/creator')
      const result = await createViralVideo(trendId)
      await prisma.tvCommand.update({ where: { id: cmd.id }, data: { status: 'DONE', executedAt: new Date() } })
      return NextResponse.json({ ok: true, queued: false, ...result, commandId: cmd.id })
    } catch (localErr: any) {
      // Likely ENOENT on Vercel — keep queued for local worker
      const msg = localErr?.message || String(localErr)
      if (msg.includes('no such file') || msg.includes('ENOENT') || msg.includes('mkdir')) {
        return NextResponse.json({ ok: true, queued: true, commandId: cmd.id, viralTrendId: trendId, message: 'Queued for local worker. Run locally: DATABASE_URL=... npx tsx -e "import{createViralVideo}from(\"./lib/tv/viral/creator.ts\"); createViralVideo(\"'+trendId+'\")"' })
      }
      await prisma.tvCommand.update({ where: { id: cmd.id }, data: { status: 'FAILED' } })
      throw localErr
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
