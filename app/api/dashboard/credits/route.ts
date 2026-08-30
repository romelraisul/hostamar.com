export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getCreditBalance } from '@/lib/credits'

/**
 * GET /api/dashboard/credits — FULL FREE (v11): always 6000/6000, everything
 * FREE. If there is credit the user can use it — no restrictions, no 402.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const bal = await getCreditBalance(user.id)
  return NextResponse.json({
    credits: bal.credits,
    total: 6000,
    used: 0,
    percent: 0,
    isFree: bal.isFree,
    unlimited: bal.unlimited,
    welcome: 6000,
    costs: { video: 0, chat: 0, browser: 0, ide: 0, game: 0, chatos: 0 },
    message: bal.message,
    bKash: '01822417463',
    topUp: '/dashboard/payment',
  })
}
