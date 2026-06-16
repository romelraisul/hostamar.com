import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getTrialStatus } from '@/lib/trial'

/**
 * GET /api/trial/status
 *
 * Returns the trial status for the authenticated customer. The dashboard
 * TrialBanner component fetches this on mount.
 *
 * Response shape:
 *   { exists: boolean, status: 'active' | 'expired' | 'converted' | 'cancelled' | 'missing',
 *     daysLeft, hoursLeft, isActive, isExpired, isConverted, planChosen, source, customerId }
 *
 * Returns 401 if not logged in.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      console.warn('[api/trial/status] getAuthUser returned null — check cookie/headers')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = await getTrialStatus(user.id)
    if (!status) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(status, { status: 200 })
  } catch (error) {
    console.error('[api/trial/status]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
