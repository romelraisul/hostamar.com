export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { getAnalytics } from '@/lib/analytics'

export async function GET(request: NextRequest) {
  const _auth = await getAuthUser(request);
  if (!_auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const analytics = getAnalytics()
    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Analytics dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
