// ============================================================================
// Telegram approvals — send an approval request with Approve/Deny buttons to
// the operator's bot. The webhook (/api/telegram/webhook) receives the button
// callback and calls the approve/deny API. All secrets are read from env and
// never logged.
// ============================================================================
import { env } from '@/lib/env'
const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || ''
const CHAT_ID = env.TELEGRAM_ADMIN_CHAT_ID || ''

export function telegramConfigured(): boolean {
  return Boolean(BOT_TOKEN && CHAT_ID)
}

/** Redact known secret-looking values before they ever hit a message/log. */
export function maskSecrets(text: string): string {
  return text
    .replace(/(postgres(?:ql)?:\/\/)[^\s"']+/gi, '$1[REDACTED]')
    .replace(/(x-internal-api-key["'\s:=]+)[^\s"',}]+/gi, '$1[REDACTED]')
    .replace(/(INTERNAL_API_KEY["'\s:=]+)[^\s"',}]+/gi, '$1[REDACTED]')
    .replace(/(DATABASE_URL["'\s:=]+)[^\s"',}]+/gi, '$1[REDACTED]')
    .replace(/(NEXTAUTH_SECRET["'\s:=]+)[^\s"',}]+/gi, '$1[REDACTED]')
}

export interface ApprovalMessage {
  approvalId: string
  toolName: string
  argsPreview: string
}

/** Send an approval request to Telegram with inline Approve/Deny buttons. */
export async function sendApprovalRequest(msg: ApprovalMessage): Promise<{ sent: boolean }> {
  if (!telegramConfigured()) {
    // eslint-disable-next-line no-console
    console.log(`[HARNESS][approval] Telegram not configured; approval ${msg.approvalId} pending in DB`)
    return { sent: false }
  }
  const text =
    `🔐 *Harness approval needed*\n` +
    `Tool: \`${msg.toolName}\`\n` +
    `Args: \`${maskSecrets(msg.argsPreview).slice(0, 500)}\`\n` +
    `ID: \`${msg.approvalId}\``
  const body = {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve:${msg.approvalId}` },
          { text: '⛔ Deny', callback_data: `deny:${msg.approvalId}` },
        ],
      ],
    },
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { sent: res.ok }
  } catch {
    return { sent: false }
  }
}

export async function answerCallback(callbackId: string, text: string): Promise<void> {
  if (!BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackId, text }),
    })
  } catch {
    /* best-effort */
  }
}
