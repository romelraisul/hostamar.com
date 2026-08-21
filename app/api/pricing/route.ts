export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { PLANS, CURRENCY } from '@/lib/pricing'

/**
 * GET /api/pricing
 * Returns the canonical pricing plans (lib/pricing.ts — same source the
 * /pricing page renders). Local route: no proxy to api.hostamar.com.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      currency: CURRENCY,
      plans: PLANS,
    },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } }
  )
}
