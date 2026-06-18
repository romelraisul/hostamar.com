import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET() {
  const headersList = await headers()
  const isCanary = headersList.get('x-canary') === '1'
  const flag = headersList.get('x-feature-flag') || 'admin_new_model_routing'

  return NextResponse.json({
    canary: isCanary,
    percent: Number(process.env.CANARY_PERCENT || '0'),
    featureFlag: flag,
  })
}

export async function POST(req: Request) {
  try {
    const { enable } = await req.json()
    const response = NextResponse.json({
      ok: true,
      canary: enable === true,
      featureFlag: process.env.FEATURE_FLAG || 'admin_new_model_routing',
    })

    response.cookies.set('x-canary', enable ? '1' : '0', {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: enable ? 604800 : 0,
    })

    return response
  } catch (error) {
    console.error('Feature toggle error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
