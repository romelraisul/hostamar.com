/**
 * lib/webhooks.ts — Outbound user webhooks (2026).
 * Users register webhook URLs; we POST signed events (e.g. video.completed).
 * HMAC-SHA256 signature in `x-hostamar-signature` header.
 */
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

export const WEBHOOK_TIMEOUT_MS = 8000
export const MAX_FAIL_COUNT = 10 // auto-disable after this many consecutive failures

export function signPayload(secret: string, body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
}

/**
 * Dispatch an event to all active user webhooks subscribed to it.
 * Fire-and-forget safe: never throws into the caller.
 */
export async function dispatchWebhookEvent(opts: {
  customerId: string
  event: string // e.g. 'video.completed'
  payload: Record<string, unknown>
}): Promise<{ delivered: number; failed: number }> {
  try {
    await ensureSchema()
    const hooks = await prisma.userWebhook.findMany({
      where: { customerId: opts.customerId, isActive: true },
    })

    let delivered = 0
    let failed = 0

    for (const hook of hooks) {
      const events = hook.events.split(',').map((e) => e.trim()).filter(Boolean)
      if (!events.includes(opts.event) && !events.includes('*')) continue

      const body = JSON.stringify({
        event: opts.event,
        timestamp: new Date().toISOString(),
        data: opts.payload,
      })
      const signature = signPayload(hook.secret, body)

      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)
        const res = await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hostamar-signature': signature,
            'x-hostamar-event': opts.event,
          },
          body,
          signal: controller.signal,
        })
        clearTimeout(timer)

        const ok = res.status >= 200 && res.status < 300
        await prisma.userWebhook.update({
          where: { id: hook.id },
          data: {
            lastStatus: res.status,
            lastSentAt: new Date(),
            failCount: ok ? 0 : hook.failCount + 1,
            isActive: ok ? hook.isActive : hook.failCount + 1 < MAX_FAIL_COUNT,
          },
        })
        if (ok) delivered++
        else failed++
      } catch {
        failed++
        await prisma.userWebhook.update({
          where: { id: hook.id },
          data: {
            lastStatus: 0,
            lastSentAt: new Date(),
            failCount: hook.failCount + 1,
            isActive: hook.failCount + 1 < MAX_FAIL_COUNT,
          },
        }).catch(() => {})
      }
    }

    return { delivered, failed }
  } catch (err) {
    console.warn('[webhooks] dispatch error:', err)
    return { delivered: 0, failed: 0 }
  }
}
