/**
 * POST /api/webhooks/telegram — customer chat intake (ACTIVE today: the bot
 * token already exists in Vercel for support alerts; this adds the inbound
 * half + AI reply).
 *
 * Setup once (user):  TELEGRAM_BOT_TOKEN is already set; point Telegram at us:
 *   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://hostamar.com/api/webhooks/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
 * Optional hardening: set TELEGRAM_WEBHOOK_SECRET in Vercel — then Telegram must
 * send it as x-telegram-bot-api-secret-token. Fails closed when set.
 *
 * Reply path: AI draft via the existing catalog gateway; sends via sendMessage.
 * ponytail: single in-process dedupe set (bounded), upgrade to KV if throughput matters.
 */
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const seen = new Set<string>() // ponytail: in-process dedupe; KV if volume grows

function aiUrl() {
  return process.env.AI_GATEWAY_URL || 'https://hostamar.com/v1/chat/completions'
}
function aiKey() {
  return process.env.AI_GATEWAY_API_KEY || process.env.SOCIAL_PUBLISH_SECRET || ''
}

async function aiReply(text: string): Promise<string> {
  const fallback = 'ধন্যবাদ! Hostamar টিম শীঘ্রই উত্তর দেবে। জরুরি হলে hostamar.com/support দেখুন।'
  try {
    const res = await fetch(aiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(aiKey() ? { Authorization: `Bearer ${aiKey()}` } : {}),
      },
      body: JSON.stringify({
        model: process.env.AI_REPLY_MODEL || 'glm-5.3-flash',
        messages: [
          { role: 'system', content: 'You are Hostamar support. Reply in the customer\'s language (Bangla or English), max 2 short sentences, friendly, no promises about money.' },
          { role: 'user', content: text.slice(0, 500) },
        ],
        max_tokens: 150,
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return fallback
    const j = await res.json().catch(() => ({} as any))
    const out = j?.choices?.[0]?.message?.content
    return typeof out === 'string' && out.trim() ? out.trim().slice(0, 900) : fallback
  } catch {
    return fallback
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || ''
  if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const BOT = process.env.TELEGRAM_BOT_TOKEN || ''
  if (!BOT) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 503 })

  const update = await req.json().catch(() => ({} as any))
  const msg = update?.message || update?.edited_message
  const chatId = msg?.chat?.id
  const text = msg?.text || ''
  if (!chatId || !text) return NextResponse.json({ ok: true, ignored: true })

  const key = `${update.update_id}`
  if (seen.has(key)) return NextResponse.json({ ok: true, duplicate: true })
  seen.add(key)
  if (seen.size > 5000) seen.clear() // ponytail: bounded

  const reply = await aiReply(text)
  await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: reply, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null)

  return NextResponse.json({ ok: true, replied: true })
}

export async function GET() {
  const BOT = process.env.TELEGRAM_BOT_TOKEN || ''
  return NextResponse.json({
    ok: true,
    message: 'Telegram customer chat webhook',
    botConfigured: !!BOT,
    setup: 'curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://hostamar.com/api/webhooks/telegram"',
  })
}
