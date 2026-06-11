import { NextResponse } from 'next/server'
import { getAnalytics } from '@/lib/analytics'

export async function GET() {
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
