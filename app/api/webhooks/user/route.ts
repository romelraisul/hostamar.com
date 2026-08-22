export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

const MAX_WEBHOOKS_PER_USER = 5
const VALID_EVENTS = ['video.completed', 'video.failed', 'payment.verified', '*']

/**
 * GET /api/webhooks/user — list the user's webhooks
 * POST /api/webhooks/user — create a webhook { url, events }
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureSchema()

  const hooks = await prisma.userWebhook.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    ok: true,
    validEvents: VALID_EVENTS,
    webhooks: hooks.map((h) => ({
      id: h.id,
      url: h.url,
      events: h.events,
      isActive: h.isActive,
      lastStatus: h.lastStatus,
      lastSentAt: h.lastSentAt,
      failCount: h.failCount,
      createdAt: h.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await ensureSchema()

    const body = await req.json().catch(() => ({}))
    const url = String(body.url || '').trim()
    const events = Array.isArray(body.events) ? body.events : String(body.events || 'video.completed').split(',')

    // Validate URL
    if (!url || !/^https?:\/\//.test(url)) {
      return NextResponse.json({ error: 'INVALID_URL', message: 'url must be http(s)://' }, { status: 400 })
    }
    // Validate events
    const cleanEvents = events.map((e: string) => String(e).trim()).filter((e: string) => VALID_EVENTS.includes(e))
    if (!cleanEvents.length) {
      return NextResponse.json({ error: 'INVALID_EVENTS', message: `events must be one of: ${VALID_EVENTS.join(', ')}` }, { status: 400 })
    }
    // Limit count
    const count = await prisma.userWebhook.count({ where: { customerId: user.id } })
    if (count >= MAX_WEBHOOKS_PER_USER) {
      return NextResponse.json({ error: 'LIMIT_REACHED', message: `Max ${MAX_WEBHOOKS_PER_USER} webhooks per user.` }, { status: 400 })
    }

    const secret = 'whsec_' + crypto.randomBytes(24).toString('hex')
    const hook = await prisma.userWebhook.create({
      data: {
        customerId: user.id,
        url,
        secret,
        events: cleanEvents.join(','),
      },
    })

    return NextResponse.json({
      ok: true,
      webhook: { id: hook.id, url: hook.url, events: hook.events, secret },
      message: 'Webhook created. Store the secret — it signs every delivery (x-hostamar-signature).',
    })
  } catch (err) {
    console.error('[webhooks/user] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
