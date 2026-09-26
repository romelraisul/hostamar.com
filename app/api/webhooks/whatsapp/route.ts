/**
 * POST /api/webhooks/whatsapp — WhatsApp Business Cloud API intake.
 * DORMANT until WHATSAPP_TOKEN + WHATSAPP_PHONE_ID are set in Vercel; then
 * subscribe webhook in Meta App Dashboard → WhatsApp → Configuration.
 * GET = Meta's hub.challenge verification handshake (same shape as Messenger).
 *
 * ponytail: reply uses WHATSAPP_DEFAULT_REPLY (env) until the AI path in the
 * telegram route is extracted into a shared helper — one AI client, reused.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const verify = process.env.WHATSAPP_VERIFY_TOKEN || ''
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')
  if (mode === 'subscribe' && verify && token === verify) {
    return new NextResponse(challenge || 'ok', { status: 200 })
  }
  return NextResponse.json({
    ok: true,
    message: 'WhatsApp webhook (dormant until tokens set)',
    active: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID),
  })
}

export async function POST(req: NextRequest) {
  const TOKEN = process.env.WHATSAPP_TOKEN || ''
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID || ''
  if (!TOKEN || !PHONE_ID) return NextResponse.json({ ok: true, dormant: 'set WHATSAPP_TOKEN + WHATSAPP_PHONE_ID to activate' })

  const body = await req.json().catch(() => ({} as any))
  const entry = body?.entry?.[0]?.changes?.[0]?.value
  const msg = entry?.messages?.[0]
  const from = msg?.from
  const text = msg?.text?.body
  if (!from || !text) return NextResponse.json({ ok: true, ignored: true })

  const reply = process.env.WHATSAPP_DEFAULT_REPLY ||
    'ধন্যবাদ! Hostamar টিম শীঘ্রই উত্তর দেবে। hostamar.com/support দেখুন।'

  await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to: from, type: 'text',
      text: { body: reply.slice(0, 900) },
    }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null)

  return NextResponse.json({ ok: true })
}
