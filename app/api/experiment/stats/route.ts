import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/experiment/stats
 *
 * Returns experiment metrics from the database.
 * Shows email captures, video creations, and subscription counts.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const [emailCount, videoStats, subStats] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM "OnboardingEmail"`
      ),
      prisma.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(
        `SELECT status, COUNT(*) as count FROM "Video" GROUP BY status`
      ),
      prisma.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(
        `SELECT status, COUNT(*) as count FROM "Subscription" GROUP BY status`
      ),
    ])

    return NextResponse.json({
      emails: Number(emailCount[0]?.count || 0),
      videos: Object.fromEntries(
        (videoStats || []).map((r: any) => [r.status, Number(r.count)])
      ),
      subscriptions: Object.fromEntries(
        (subStats || []).map((r: any) => [r.status, Number(r.count)])
      ),
      generatedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[experiment/stats]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
