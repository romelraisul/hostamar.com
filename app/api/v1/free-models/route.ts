import { NextResponse } from 'next/server'
import { fetchAllFreeModels } from '@/lib/free-model-router'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * GET /api/v1/free-models — hourly free-model snapshot (spec shape:
 * {timestamp, models:[{id,provider,quality_score,free,context,price}], count}).
 * Refresh cadence is the CDN cache TTL (max-age=3600) — Vercel Hobby cannot
 * schedule hourly crons, so cache expiry IS the hourly check. The local WSL
 * cron (model-router.sh) snapshots the same data to ~/memories/models/ for
 * the FleetReport log.
 */
export async function GET() {
  const models = await fetchAllFreeModels()
  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      count: models.length,
      models,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}
