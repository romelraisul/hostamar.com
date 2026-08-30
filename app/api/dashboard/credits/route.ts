export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getCreditBalance } from '@/lib/credits'

/**
 * GET /api/dashboard/credits — PAID MODE (V12): real balance (6000 bonus at
 * signup, decreases with use), 1cr = 1TK = 1 future HOST coin, bKash plans.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const bal = await getCreditBalance(user.id)
  const used = Math.max(0, 6000 - bal.credits)
  return NextResponse.json({
    credits: bal.credits,
    total: 6000,
    used,
    percent: Math.min(100, Math.round((used / 6000) * 100)),
    isFree: bal.isFree,
    unlimited: bal.unlimited,
    welcome: 6000,
    costs: { video: 'market 100-5000cr', chat: 'token price per model', browser: '5cr/hr', ide: '10cr/hr', game: '20cr/hr', chatos: '1cr/action' },
    message: bal.message,
    bKash: '01822417463',
    topUp: '/dashboard/payment',
    plans: { Starter: '599TK → 6000cr', Pro: '1299TK → 13000cr', Business: '2999TK → 30000cr' },
  })
}
