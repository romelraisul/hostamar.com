// ============================================================================
// POST /api/webhooks/call-ended — receives a finished voice call.
//
// Per the article's post-call layer: we DO NOT block the response on
// processing. We hand off to setImmediate(processPostCall) which persists the
// durable artifact and enqueues the Inngest worker. Returns 200 immediately.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { processPostCall } from '@/lib/voice/postCallProcessor'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.call_id) {
    return NextResponse.json({ error: 'call_id required' }, { status: 400 })
  }

  // Fire-and-process; don't block the HTTP response on DB/Inngest work.
  setImmediate(() => {
    processPostCall({
      call_id: String(body.call_id),
      userId: body.userId ? String(body.userId) : undefined,
      ended_at: body.ended_at ? String(body.ended_at) : undefined,
      transcript: Array.isArray(body.transcript) ? body.transcript : [],
      action_items: Array.isArray(body.action_items) ? body.action_items : [],
    }).catch((e) => console.error('[call-ended] processPostCall failed', e))
  })

  return NextResponse.json({ ok: true, call_id: body.call_id })
}
