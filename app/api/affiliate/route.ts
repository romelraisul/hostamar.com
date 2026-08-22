export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getOrCreateAffiliateCode, getAffiliateEarnings } from '@/lib/affiliate'
import { env } from '@/lib/env'

/**
 * GET /api/affiliate
 * Returns the user's affiliate code, referral link, and earnings dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const code = await getOrCreateAffiliateCode(user.id)
    const earnings = await getAffiliateEarnings(user.id)
    const siteUrl = env.NEXT_PUBLIC_SITE_URL || env.NEXTAUTH_URL || 'https://hostamar.com'

    return NextResponse.json({
      ok: true,
      code,
      referralLink: `${siteUrl}/signup?ref=${code}`,
      ...earnings,
    })
  } catch (err) {
    console.error('[affiliate] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
