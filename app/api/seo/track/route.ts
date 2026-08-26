import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/seo/track  (public — anonymous click analytics)
 * Body: { type: string, url: string }
 * Fire-and-forget from the Preferred Source badge; never blocks UI.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.type || !body?.url) return Response.json({ error: 'type+url required' }, { status: 400 })
  try {
    await prisma.seoEvent.create({
      data: {
        type: String(body.type).slice(0, 64),
        url: String(body.url).slice(0, 512),
        userAgent: (req.headers.get('user-agent') || '').slice(0, 256),
      },
    })
    return Response.json({ ok: true })
  } catch {
    // Analytics must never 500 the client
    return Response.json({ ok: false }, { status: 202 })
  }
}
