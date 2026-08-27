import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/get-auth-user'
import { createApiKey, validateApiKey, checkApiKeyRateLimit, hashApiKey } from '@/lib/apikey'

// POST /api/keys - Create new API key
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, permissions } = await req.json().catch(() => ({}))

    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    // Limit API keys per user (prevent abuse)
    const existingKeys = await prisma.apiKey.count({
      where: { customerId: user.id },
    })
    if (existingKeys >= 5) {
      return NextResponse.json({ error: 'Max 5 API keys per account' }, { status: 400 })
    }

    const apiKey = await createApiKey(user.id, name, permissions)
    try { const { logApiRequest } = await import('@/lib/logger'); const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'; const ua = req.headers.get('user-agent') || 'unknown'; logApiRequest({ keyId: apiKey.id, ip, ua, path: '/api/keys', method: 'POST', status: 201, duration: 0 }).catch(()=>{});} catch {}

    return NextResponse.json({
      success: true,
      key: apiKey.key, // Only time this is shown
      name: apiKey.name,
      permissions: {
        canGenerateImage: apiKey.canGenerateImage,
        canGenerateVideo: apiKey.canGenerateVideo,
        canUseChat: apiKey.canUseChat,
      },
      rateLimit: apiKey.rateLimitPerMinute,
      createdAt: apiKey.createdAt,
    })
  } catch (error) {
    console.error('API key creation error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET /api/keys - List user's API keys
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keys = await prisma.apiKey.findMany({
      where: { customerId: user.id },
      select: {
        id: true,
        name: true,
        canGenerateImage: true,
        canGenerateVideo: true,
        canUseChat: true,
        rateLimitPerMinute: true,
        totalRequests: true,
        lastUsedAt: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        // Never return the key hash
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ keys })
  } catch (error) {
    console.error('API key list error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/keys/[id] - Delete API key
// REVOKE /api/keys/[id] - Deactivate API key
