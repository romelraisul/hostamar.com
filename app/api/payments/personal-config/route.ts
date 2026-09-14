export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getPersonalNumbers } from '@/lib/payments/personal'

/**
 * GET /api/payments/personal-config
 * Returns the personal Send-Money numbers + enabled state for the payment UI.
 * Requires auth (numbers are semi-private — only shown to logged-in users).
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nums = getPersonalNumbers()
  // Stable per-customer reference the buyer can put in the Send-Money note so
  // the owner can match the payment without asking around.
  const reference = `PM-${user.id.slice(-6).toUpperCase()}`
  return NextResponse.json({
    enabled: nums.enabled,
    numbers: {
      bkash: nums.BKASH,
      nagad: nums.NAGAD,
      rocket: nums.ROCKET,
    },
    reference,
    instructions: nums.enabled
      ? `নিচের যেকোনো নাম্বারে Send Money (Cash Out নয়) করুন — নোটে Reference ${reference} লিখুন — তারপর TrxID জমা দিন।`
      : 'Personal payments are currently disabled.',
  })
}
