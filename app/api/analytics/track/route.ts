import { NextRequest, NextResponse } from 'next/server'
import { trackPageView, trackEvent } from '@/lib/analytics'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, ...data } = body

    if (type === 'pageview') {
      const result = trackPageView(req, {
        path: data.path,
        title: data.title,
        referrer: data.referrer,
      })
      return NextResponse.json({ success: true, ...result })
    }

    if (type === 'event') {
      const result = trackEvent(req, {
        name: data.name,
        properties: data.properties,
      })
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json(
      { error: 'Invalid tracking type. Use "pageview" or "event".' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Analytics track error:', error)
    return NextResponse.json(
      { error: 'Failed to track analytics' },
      { status: 500 }
    )
  }
}
