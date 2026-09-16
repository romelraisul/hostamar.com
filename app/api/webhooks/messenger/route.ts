/**
 * POST /api/webhooks/messenger — Facebook Messenger customer chat intake.
 * DORMANT until FB_PAGE_ACCESS_TOKEN + FB_PAGE_ID + MESSENGER_VERIFY_TOKEN are
 * set in Vercel; then verify-subscribe in the App dashboard and it activates.
 *
 * Setup once (user): Meta App Dashboard → Messenger → Settings →
 *   Webhooks: callback URL https://hostamar.com/api/webhooks/messenger
 *   verify token = MESSENGER_VERIFY_TOKEN; subscribe to `messages`.
 * GET = Meta's hub.challenge verification handshake.
 */
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const verify = process.env.MESSENGER_VERIFY_TOKEN || ''
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')
  if (mode === 'subscribe' && verify && token === verify) {
    return new NextResponse(challenge || 'ok', { status: 200 })
  }
  return NextResponse.json({
    ok: true,
    message: 'Messenger webhook (dormant until tokens set)',
    active: !!process.env.FB_PAGE_ACCESS_TOKEN,
  })
}

export async function POST(req: NextRequest) {
  const PAGE = process.env.FB_PAGE_ACCESS_TOKEN || ''
  if (!PAGE) return NextResponse.json({ ok: true, dormant: 'set FB_PAGE_ACCESS_TOKEN to activate' })

  const body = await req.json().catch(() => ({} as any))
  const entry = body?.entry?.[0]
  const msg = entry?.messaging?.[0]
  const senderId = msg?.sender?.id
  const text = msg?.message?.text
  if (!senderId || !text) return NextResponse.json({ ok: true, ignored: true })

  const fallback = 'ধন্যবাদ! Hostamar টিম শীঘ্রই উত্তর দেবে। hostamar.com/support দেখুন।'
  let reply = fallback
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', { signal: AbortSignal.timeout(15000) })
    void res // placeholder — real AI path mirrors telegram route's aiReply
  } catch { /* keep fallback */ }

  await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: senderId }, message: { text: reply } }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null)

  return NextResponse.json({ ok: true })
}
