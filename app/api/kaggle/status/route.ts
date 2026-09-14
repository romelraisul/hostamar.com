import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { allStatuses, quota } from '@/lib/kaggle-on-demand'

export const dynamic = 'force-dynamic'

/**
 * GET /api/kaggle/status — CEO On-Demand dashboard data.
 * Returns notebook states (IDLE/RUNNING/...) + GPU/TPU quota bars.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const [statuses, q] = await Promise.all([allStatuses(), quota()])
    return NextResponse.json(
      {
        ok: true,
        mode: 'on-demand (Vercel-style serverless — IDLE=0 GPU hours)',
        notebooks: statuses,
        quota: q,
        checkedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 401 })
  }
}
