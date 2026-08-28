export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

/**
 * Cron /api/cron/tv-stability
 * Daily 3 AM Dhaka (21:00 UTC). HEAD-probes channels, updates stability + popularity.
 * Auth: CRON_SECRET (Bearer or x-cron-secret header).
 */
export async function POST(req: NextRequest) {
  return run(req)
}
export async function GET(req: NextRequest) {
  return run(req)
}

async function run(req: NextRequest) {
  const secret = env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_NOT_CONFIGURED' }, { status: 503 })
  }
  const provided =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    req.headers.get('x-cron-secret') ||
    req.nextUrl.searchParams.get('secret')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()
  const stats = { probed: 0, success: 0, failed: 0, skipped: 0, errors: [] as string[] }

  try {
    // Update popularity from TvView (7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const viewCounts = await prisma.tvView.groupBy({
      by: ['channelId'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { channelId: true },
    })
    for (const vc of viewCounts) {
      await prisma.tvChannelStability.upsert({
        where: { channelId: vc.channelId },
        update: { popularityScore: vc._count.channelId },
        create: { channelId: vc.channelId, popularityScore: vc._count.channelId, stabilityScore: 50 },
      })
    }

    // Probe channels in batches (limit 200 per run to stay under 10s serverless)
    const channels = await prisma.tvIptvChannel.findMany({
      where: { isLive: true, url: { contains: '.m3u8' } },
      take: 200,
      select: { id: true, url: true },
    })

    // Process in parallel with concurrency cap
    const CONCURRENCY = 10
    for (let i = 0; i < channels.length; i += CONCURRENCY) {
      const batch = channels.slice(i, i + CONCURRENCY)
      await Promise.all(
        batch.map(async (ch) => {
          stats.probed++
          const start = Date.now()
          try {
            const ctrl = new AbortController()
            const timer = setTimeout(() => ctrl.abort(), 5000)
            const res = await fetch(ch.url, {
              method: 'HEAD',
              signal: ctrl.signal,
              redirect: 'follow',
            })
            clearTimeout(timer)
            const ms = Date.now() - start
            if (res.ok || res.status === 405 /* method not allowed but server up */) {
              stats.success++
              await prisma.tvChannelStability.upsert({
                where: { channelId: ch.id },
                update: {
                  stabilityScore: { increment: 5 },
                  successCount: { increment: 1 },
                  avgLoadTimeMs: ms,
                  lastSuccessAt: new Date(),
                },
                create: {
                  channelId: ch.id,
                  stabilityScore: 55,
                  successCount: 1,
                  avgLoadTimeMs: ms,
                  lastSuccessAt: new Date(),
                },
              })
            } else {
              stats.failed++
              await prisma.tvChannelStability.upsert({
                where: { channelId: ch.id },
                update: { stabilityScore: { decrement: 20 }, failCount: { increment: 1 } },
                create: { channelId: ch.id, stabilityScore: 30, failCount: 1 },
              })
            }
          } catch (e: any) {
            stats.failed++
            stats.errors.push(`${ch.id}: ${e?.message || 'fetch error'}`)
            await prisma.tvChannelStability.upsert({
              where: { channelId: ch.id },
              update: { stabilityScore: { decrement: 20 }, failCount: { increment: 1 } },
              create: { channelId: ch.id, stabilityScore: 30, failCount: 1 },
            })
          }
        })
      )
    }

    return NextResponse.json({
      ok: true,
      duration_ms: Date.now() - t0,
      ...stats,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
