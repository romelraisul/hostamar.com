import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { getCreditAccount, ensureFreeCredits } from '@/lib/credits'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Idempotently grant the welcome free-credit allowance so every customer
    // always sees a balance (root cause: customers with 0 credits saw "no credit").
    await ensureFreeCredits(user.id, 6000)
    const account = await getCreditAccount(user.id)
    return NextResponse.json({
      credits: account.credits,
      consumed: account.consumed,
      videoCredits: account.videoCredits,
      imageCredits: account.imageCredits,
      chatCredits: account.chatCredits,
      browserCredits: account.browserCredits,
      ideCredits: account.ideCredits,
      gameCredits: account.gameCredits,
      hostingCredits: account.hostingCredits,
      updatedAt: account.updatedAt,
    })
  } catch (error: any) {
    console.error('[credits/me] error:', error)
    return NextResponse.json({ error: 'internal_error', message: error?.message }, { status: 500 })
  }
}
