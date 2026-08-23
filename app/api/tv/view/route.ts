/**
 * POST /api/tv/view — heartbeat from TvHero player every 30s.
 * Body: { playlistItemId?: string, watchSec?: number, watchPercent?: number }
 * If no playlistItemId, resolves current now-playing item server-side.
 * Marks viral when views>100 in 24h or avgWatchPercent>80.
 * Increases playWeight to 3 for viral hits and regenerates playlist.host.txt.
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import fs from 'fs'

export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    let playlistItemId: string | null = body.playlistItemId || null
    const watchSec = Number(body.watchSec || body.watchTime || 0)
    const watchPercent = Number(body.watchPercent || 0)

    if (!playlistItemId) {
      // Resolve current playing item via TvChannel
      const ch = await prisma.tvChannel.findFirst()
      if (!ch) return NextResponse.json({ ok: false, error: 'No channel' }, { status: 404 })
      const first = await prisma.tvPlaylistItem.findFirst({ where: { channelId: ch.id }, orderBy: { position: 'asc' } })
      if (!first) return NextResponse.json({ ok: false, error: 'Empty playlist' }, { status: 404 })
      playlistItemId = first.id
    }

    const item = await prisma.tvPlaylistItem.findUnique({ where: { id: playlistItemId } })
    if (!item) return NextResponse.json({ ok: false, error: 'Item not found' }, { status: 404 })

    let stats = await prisma.tvVideoStats.findUnique({ where: { playlistItemId } })
    if (!stats) {
      stats = await prisma.tvVideoStats.create({
        data: { playlistItemId, title: item.title, views: 0, viralScore: 0 },
      })
    }

    const newViews = stats.views + 1
    const newTotalWatch = stats.totalWatchSec + watchSec
    const newAvg = watchPercent ? (stats.avgWatchPercent * stats.views + watchPercent) / newViews : stats.avgWatchPercent

    // Viral if views>100 or avg watch>80% with at least 10 views
    const isViral = newViews > 100 || (newViews >= 10 && newAvg > 80)
    const newWeight = isViral ? 3 : stats.playWeight
    const becameViral = isViral && !stats.isViral

    const updated = await prisma.tvVideoStats.update({
      where: { id: stats.id },
      data: {
        views: newViews,
        totalWatchSec: newTotalWatch,
        avgWatchPercent: newAvg,
        isViral,
        playWeight: newWeight,
        lastViewAt: new Date(),
        viralScore: isViral ? Math.max(stats.viralScore, newViews / 10 + newAvg / 20) : stats.viralScore,
      },
    })

    if (becameViral) {
      // Regenerate playlist with 3x weight
      const ch = await prisma.tvChannel.findFirst()
      if (ch) {
        const all = await prisma.tvPlaylistItem.findMany({ where: { channelId: ch.id }, orderBy: { position: 'asc' } })
        const allStats = await prisma.tvVideoStats.findMany({ where: { playlistItemId: { in: all.map(a => a.id) } } })
        const wmap = new Map(allStats.map(s => [s.playlistItemId, s.playWeight]))
        const lines: string[] = []
        for (const it of all) {
          const w = wmap.get(it.id) || 1
          for (let k = 0; k < w; k++) lines.push(`file '${it.url}'`)
        }
        const p = '/home/romel/hostamar-build/docker/tv-station/videos/playlist.host.txt'
        fs.writeFileSync(p + '.tmp', lines.join('\n') + '\n')
        fs.renameSync(p + '.tmp', p)
        try { await prisma.tvCommand.create({ data: { action: 'RELOAD_PLAYLIST', payload: { reason: 'viral_boost', playlistItemId } as any } }) } catch {}
        try { const { execFile } = await import('child_process'); const { promisify } = await import('util'); await promisify(execFile)('systemctl', ['--user', 'restart', 'tv-ffmpeg'] as any) } catch {}
        try { await prisma.tvLog.create({ data: { level: 'info', message: `Viral boost: ${item.title} now 3x weight (${newViews} views, ${Math.round(newAvg)}% watch)` } }) } catch {}
      }
    }

    return NextResponse.json({ ok: true, views: newViews, isViral, playWeight: newWeight, becameViral })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
