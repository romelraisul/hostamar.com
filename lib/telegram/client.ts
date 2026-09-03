// ============================================================================
// lib/telegram/client.ts — V34 Hostamar Drive storage engine (MTProto User API)
// ============================================================================
// GramJS client singleton. NOT the Bot API (2GB cap + 1h getFile expiry +
// no streaming) — a full user session talks MTProto: 2GB free / 4GB Premium
// per message, permanent file references, Range-streamable downloads.
//
// Env (set once by the user — see scripts/tg-gen-session.mjs):
//   TG_API_ID        my.telegram.org app id
//   TG_API_HASH      my.telegram.org app hash
//   TG_SESSION_STRING StringSession saved from the one-time login script
//   TG_CHANNEL_ID    private channel that acts as the disk (e.g. -1001234567890)
//
// Flood-wait aware: Telegram 429s with a retry-after; we sleep exactly that.
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

let cached: TelegramClient | null = null

export function telegramConfigured(): boolean {
  return Boolean(
    process.env.TG_API_ID &&
    process.env.TG_API_HASH &&
    process.env.TG_SESSION_STRING &&
    process.env.TG_CHANNEL_ID,
  )
}

/**
 * Singleton MTProto client. Connects once per serverless warm instance
 * (GramJS keeps the TCP pool alive; cold starts pay ~1-2s handshake).
 */
export async function getTelegramClient(): Promise<TelegramClient> {
  if (cached && cached.connected) return cached
  const apiId = Number(process.env.TG_API_ID)
  const apiHash = String(process.env.TG_API_HASH)
  const session = new StringSession(String(process.env.TG_SESSION_STRING))
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
    autoReconnect: true,
    useWSS: true, // works through Vercel's egress (443 websocket)
  })
  await client.connect() // StringSession auth — no interactive login needed
  cached = client
  return client
}

/**
 * Resolve the storage channel. A fresh StringSession carries NO entity cache,
 * so getEntity(-100…) fails until the account's dialogs have been fetched at
 * least once (private channels have no @username to resolve). Warm-up: try
 * direct, on failure scan getDialogs (the session account created/joined the
 * channel, so it's there), cache it, then retry.
 */
export async function ensureChannel() {
  const client = await getTelegramClient()
  const raw = String(process.env.TG_CHANNEL_ID || '')
  try {
    return await client.getEntity(raw.startsWith('-100') ? Number(raw) : raw)
  } catch {
    const wanted = new Set([raw, raw.replace('-100', '')])
    const dialogs = await client.getDialogs({ limit: 200 })
    for (const d of dialogs) {
      const e: any = (d as any).entity ?? d
      const idStr = e?.id?.toString?.() ?? String(e?.id ?? '')
      if (wanted.has(idStr)) return e
    }
    throw new Error(
      `Channel ${raw} not found in this account's dialogs — create/join hostamar-drive-storage with the session's account first`,
    )
  }
}

/** Run an op with FloodWait handling — sleep(429.retry_after) then retry once. */
export async function withFloodRetry<T>(op: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await op()
    } catch (e: any) {
      const secs = Number(e?.seconds ?? e?.errorMessage?.match(/(\d+)/)?.[1] ?? 0)
      if (secs > 0 && attempt < maxRetries) {
        await sleep(Math.min(secs, 600) * 1000)
        continue
      }
      throw e
    }
  }
}

export async function disconnectTelegram(): Promise<void> {
  if (cached) {
    await cached.disconnect()
    cached = null
  }
}
