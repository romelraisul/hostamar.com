/**
 * lib/surveillance-alert.ts — V65.1: Telegram alert delivery for Layer 5.
 *
 * Delivery ladder (zero new credentials, free tiers only):
 *   1. Bot API — SURVEILLANCE_TELEGRAM_TOKEN + SURVEILLANCE_TELEGRAM_CHAT_ID
 *      (owner can add a dedicated HostamarSurveillanceBot later; still works).
 *   2. Bot API fallback — TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID
 *      (the harness bot, when the owner wires it into Vercel).
 *   3. MTProto user session — TG_API_ID/TG_API_HASH/TG_SESSION_STRING
 *      (SAME session the Drive storage uses — already live in prod) sending
 *      to the owner's own "Saved Messages" (me). This ALWAYS works today.
 *
 * Fire-and-forget: never throws, 10s cap, redacts nothing (caller controls
 * content — alerts are operational text, no secrets by design).
 */
import { getTelegramClient } from '@/lib/telegram/client'

export async function sendSurveillanceAlert(text: string): Promise<{ sent: boolean; via: string }> {
  const body = `🛡 Layer5: ${text}`.slice(0, 3500)
  const httpJson = { 'Content-Type': 'application/json' }

  // 1) dedicated surveillance bot
  const sTok = process.env.SURVEILLANCE_TELEGRAM_TOKEN
  const sChat = process.env.SURVEILLANCE_TELEGRAM_CHAT_ID
  if (sTok && sChat) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${sTok}/sendMessage`, {
        method: 'POST',
        headers: httpJson,
        body: JSON.stringify({ chat_id: sChat, text: body }),
        signal: AbortSignal.timeout(10_000),
      })
      if (r.ok) return { sent: true, via: 'surveillance-bot' }
    } catch { /* fall through */ }
  }

  // 2) harness bot fallback
  const bTok = process.env.TELEGRAM_BOT_TOKEN
  const bChat = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (bTok && bChat) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${bTok}/sendMessage`, {
        method: 'POST',
        headers: httpJson,
        body: JSON.stringify({ chat_id: bChat, text: body }),
        signal: AbortSignal.timeout(10_000),
      })
      if (r.ok) return { sent: true, via: 'harness-bot' }
    } catch { /* fall through */ }
  }

  // 3) MTProto user session → own Saved Messages (always available)
  if (process.env.TG_API_ID && process.env.TG_API_HASH && process.env.TG_SESSION_STRING) {
    try {
      const client = await getTelegramClient()
      const me: any = await client.getMe()
      const meId = Number(me?.id)
      if (meId) {
        await client.sendMessage(meId, { message: body })
        return { sent: true, via: 'mtproto-saved-messages' }
      }
    } catch { /* fall through */ }
  }

  return { sent: false, via: 'none' }
}
