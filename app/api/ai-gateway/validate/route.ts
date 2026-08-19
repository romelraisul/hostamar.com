import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/apikey'

// POST /api/ai-gateway/validate
// Called by the local AI gateway (hostamar-ai-gateway) to validate a customer
// API key and return the permissions/credits it should enforce. The gateway
// caches the result. This endpoint is itself unauthenticated (it IS the auth
// check) but only echoes permissions + non-sensitive customer fields.
export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json().catch(() => ({}))
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ valid: false, error: 'Missing key' }, { status: 400 })
    }

    const apiKey = await validateApiKey(key)
    if (!apiKey) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired key' }, { status: 401 })
    }

    const customer = apiKey.customer
    const credits = typeof customer?.credits === 'number' ? customer.credits : 0
    const balance = typeof customer?.balance === 'number' ? customer.balance : 0

    return NextResponse.json({
      valid: true,
      customerId: customer?.id,
      email: customer?.email,
      role: customer?.role,
      credits,
      balance,
      permissions: {
        canUseChat: apiKey.canUseChat,
        canGenerateImage: apiKey.canGenerateImage,
        canGenerateVideo: apiKey.canGenerateVideo,
      },
      rateLimitPerMinute: apiKey.rateLimitPerMinute,
      keyId: apiKey.id,
    })
  } catch (error) {
    console.error('[ai-gateway/validate] error:', error)
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 })
  }
}
