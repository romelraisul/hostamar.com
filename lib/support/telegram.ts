// ============================================================================
// lib/support/telegram.ts — 3-channel support Telegram notifications.
//
// Reuses the same bot as the harness approvals (TELEGRAM_BOT_TOKEN). Three
// logical channels share one bot but different chat IDs (env-driven, no
// hard-coded IDs):
//   - support  (auto-resolved Tier1)   TELEGRAM_SUPPORT_CHAT_ID
//   - ops      (Tier2 triage)          TELEGRAM_OPS_CHAT_ID
//   - incident (Tier3)                 TELEGRAM_INCIDENT_CHAT_ID
// Each falls back to TELEGRAM_ADMIN_CHAT_ID (the existing single admin chat)
// so a partially-configured deploy still works.
// ============================================================================
import { maskSecrets } from '@/lib/harness/telegram-approvals'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const ADMIN_CHAT = process.env.TELEGRAM_ADMIN_CHAT_ID || ''

type Channel = 'support' | 'ops' | 'incident'

function chatIdFor(channel: Channel): string {
  const envMap: Record<Channel, string | undefined> = {
    support: process.env.TELEGRAM_SUPPORT_CHAT_ID,
    ops: process.env.TELEGRAM_OPS_CHAT_ID,
    incident: process.env.TELEGRAM_INCIDENT_CHAT_ID,
  }
  return envMap[channel] || ADMIN_CHAT
}

const PREFIX: Record<Channel, string> = {
  support: '✅ AUTO-RESOLVED',
  ops: '🔎 TRIAGE',
  incident: '🚨 INCIDENT',
}

export function telegramConfigured(): boolean {
  return Boolean(BOT_TOKEN && ADMIN_CHAT)
}

export async function notify(channel: Channel, message: string): Promise<{ sent: boolean }> {
  const chatId = chatIdFor(channel)
  if (!BOT_TOKEN || !chatId) {
    // eslint-disable-next-line no-console
    console.log(`[SUPPORT][telegram:${channel}] not configured; would send -> ${message.slice(0, 200)}`)
    return { sent: false }
  }
  const text = `${PREFIX[channel]} ${maskSecrets(message)}`
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    })
    return { sent: res.ok }
  } catch {
    return { sent: false }
  }
}
