// POST /api/webhooks/support-inbox — receives inbox items (Gmail push /
// IMAP poller / manual) and queues them for the supportInboxTriage Inngest
// function. Self-guarded like /api/webhooks/bkash (65ee095): rate-limit +
// zod validate + deepSanitize, no session cookie required.
import { NextRequest, NextResponse } from 'next/server'
import { validateBody, deepSanitize } from '@/lib/api/validator'
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit'
import { inngest } from '@/inngest/client'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const itemSchema = z.object({
  id: z.string(),
  subject: z.string(),
  from: z.string().optional(),
  receivedAt: z.string().optional(),
})
const schema = z.object({
  items: z.array(itemSchema).min(1).max(50),
})

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(getClientIp(req), RATE_LIMITS.bkashWebhook, '/api/webhooks/support-inbox', 'POST')
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  let body: z.infer<typeof schema>
  try {
    body = await validateBody(req, schema, 65536)
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 422 })
  }
  const clean = deepSanitize(body) as z.infer<typeof schema>

  try {
    await inngest.send({
      name: 'support/inbox.received' as any,
      data: { items: clean.items },
    })
    return NextResponse.json({ ok: true, queued: clean.items.length })
  } catch (e) {
    console.error('[support-inbox] inngest.send failed', e)
    return NextResponse.json({ error: 'queue_failed' }, { status: 502 })
  }
}
