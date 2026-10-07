// Inngest client for the Hostamar harness background/durable functions.
//
// The `inngest` SDK's module graph is Node-only (node:async_hooks, node:dns, tty,
// and `new FinalizationRegistry()` inside its OTel processor runs at instance-init).
// On workerd that throws `ReferenceError: FinalizationRegistry is not defined` while
// the ROUTE MODULE LOADS, so every route that statically imported this file 500'd
// before its handler ran (/api/webhooks/bkash, /api/webhooks/call-ended,
// /api/webhooks/support-inbox, /api/inngest).
//
// Therefore this module never imports the SDK at module scope:
//  - `createFunction()` returns an inert descriptor; the real functions are built
//    from those descriptors by app/api/inngest/route.ts, which loads the SDK lazily
//    on Node only.
//  - `send()` loads the SDK on demand and DROPS the event (with a log) wherever the
//    SDK cannot run or no event key is configured.
//
// ponytail: events emitted on workerd are dropped, not queued — no Inngest server or
// event key exists on this deployment, so there is nothing to deliver to. If the
// harness ever moves to a Node host, set INNGEST_EVENT_KEY and send() starts working
// with no change here; a durable outbox is the upgrade path if events must survive.

type AnyHandler = (ctx: any) => any

export interface InngestFunctionDescriptor {
  __inngestDescriptor: true
  opts: any
  trigger?: any
  handler?: AnyHandler
}

const ON_WORKERD =
  typeof navigator !== 'undefined' && /Cloudflare-Workers/i.test(navigator.userAgent as string)

const configured = () => !!(process.env.INNGEST_EVENT_KEY || process.env.INNGEST_SIGNING_KEY)
const usable = () => configured() && !ON_WORKERD

let warned = false
function warnDisabled(what: string) {
  if (warned) return
  warned = true
  console.log(
    `[inngest] ${what} skipped — SDK cannot run here ` +
      `(workerd=${ON_WORKERD}, eventKey=${configured()}). Harness functions stay inert.`
  )
}

/** Lazy real client — Node only, used by the serve endpoint to build real functions. */
export async function getInngestClient(): Promise<any | null> {
  if (!usable()) return null
  try {
    const { Inngest } = await import('inngest')
    return new Inngest({ id: 'hostamar-harness', eventKey: process.env.INNGEST_EVENT_KEY })
  } catch (e: any) {
    console.error('[inngest] client load failed:', e?.message)
    return null
  }
}

export const inngest = {
  id: 'hostamar-harness',

  /** Inert descriptor — the SDK is not loaded until app/api/inngest/route.ts builds it. */
  createFunction(opts: any, trigger?: any, handler?: AnyHandler): any {
    return { __inngestDescriptor: true, opts, trigger, handler } as InngestFunctionDescriptor
  },

  /** Best-effort event emit. Never throws — callers rely on fire-and-forget. */
  async send(event: any): Promise<any> {
    if (!usable()) {
      warnDisabled('send()')
      return { skipped: true, reason: ON_WORKERD ? 'workerd' : 'not-configured' }
    }
    try {
      const client = await getInngestClient()
      if (!client) return { skipped: true, reason: 'client-unavailable' }
      return await client.send(event)
    } catch (e: any) {
      console.error('[inngest] send failed:', e?.message)
      return { skipped: true, reason: 'send-failed' }
    }
  },
}
