export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getCreditBalance } from '@/lib/credits'

/**
 * GET /api/dashboard/credits — the dashboard credit meter source.
 * FULL FREE (v7): always reports 6000 + unlimited/isFree — no restriction,
 * the meter shows "Free Unlimited" while free testing is on.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const bal = await getCreditBalance(user.id)
  return NextResponse.json({
    credits: bal.credits,
    unlimited: bal.unlimited,
    isFree: bal.isFree,
    message: bal.message,
  })
}
