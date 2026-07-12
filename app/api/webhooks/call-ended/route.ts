// ============================================================================
// POST /api/webhooks/call-ended — receives a finished voice call.
//
// Per the article's post-call layer: we DO NOT block the response on
// processing. We hand off to setImmediate(processPostCall) which persists the
// durable artifact and enqueues the Inngest worker. Returns 200 immediately.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { processPostCall } from '@/lib/voice/postCallProcessor'
import { validateBody, toErrorResponse } from '@/lib/api/validator'
import { z } from 'zod'

export const runtime = 'nodejs'

const callEndedSchema = z.object({
  call_id: z.string().regex(/^[a-z0-9_-]{6,64}$/),
  userId: z.string().max(64).optional(),
  ended_at: z.string().max(64).optional(),
  transcript: z
    .array(z.object({ speaker: z.enum(['user', 'agent']), text: z.string().max(5000) }))
    .max(500)
    .optional(),
  action_items: z.array(z.string().max(200)).max(20).optional(),
})

export async function POST(req: NextRequest) {
  let body: z.infer<typeof callEndedSchema>
  try {
    body = await validateBody(req, callEndedSchema, 200_000)
  } catch (e) {
    return toErrorResponse(e)
  }

  // Fire-and-process; don't block the HTTP response on DB/Inngest work.
  setImmediate(() => {
    processPostCall({
      call_id: String(body.call_id),
      userId: body.userId ? String(body.userId) : undefined,
      ended_at: body.ended_at ? String(body.ended_at) : undefined,
      transcript: Array.isArray(body.transcript) ? body.transcript : [],
      action_items: Array.isArray(body.action_items)
        ? body.action_items.map((text) => ({ text }))
        : [],
    }).catch((e) => console.error('[call-ended] processPostCall failed', e))
  })

  return NextResponse.json({ ok: true, call_id: body.call_id })
}
