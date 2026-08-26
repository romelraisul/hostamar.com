export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getOrCreateReferralCode, referralLinkFor } from '@/lib/referral'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const code = await getOrCreateReferralCode(user.id)
  return NextResponse.json({ code, link: referralLinkFor(code) })
}
