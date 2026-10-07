// GET/POST/PUT /api/inngest — Inngest serve endpoint (self-hosted).
// Exposes the autonomous-runner + research-fanout + goal-loop + voice + support functions.
//
// The `inngest` SDK is loaded INSIDE the handler: its module graph is Node-only
// (node:async_hooks/node:dns/tty + FinalizationRegistry at OTel-processor init) and a
// static import crashed this whole route at isolate init on workerd. When the runtime
// cannot host the SDK (workerd) or no INNGEST_* key is configured, answer 501 with the
// reason instead of failing to load.
import { getInngestClient } from '@/inngest/client'
import { autonomousRunner } from '@/inngest/functions/autonomous-runner'
import { researchFanout } from '@/inngest/functions/research-fanout'
import { goalTick } from '@/inngest/functions/goalTick'
import { voicePostCallWorker } from '@/lib/voice/postCallProcessor'
import { supportAutoResolve } from '@/inngest/functions/supportAutoResolve'
import { supportInboxTriage } from '@/inngest/functions/supportInboxTriage'
import { billingPaymentSucceeded } from '@/inngest/functions/billing-payment-succeeded'

export const dynamic = 'force-dynamic'

const DESCRIPTORS: any[] = [
  autonomousRunner,
  researchFanout,
  goalTick,
  voicePostCallWorker,
  supportAutoResolve,
  supportInboxTriage,
  billingPaymentSucceeded,
]

let handler: any = null
let building = false

async function getServeHandler() {
  if (handler) return handler
  if (building) return null
  building = true
  try {
    const client = await getInngestClient()
    if (!client) return null
    const { serve } = await import('inngest/next')
    handler = serve({
      client,
      functions: DESCRIPTORS.map((d) => client.createFunction(d.opts, d.trigger, d.handler)),
    })
    return handler
  } catch (e: any) {
    console.error('[inngest] serve handler init failed:', e?.message)
    return null
  } finally {
    building = false
  }
}

const run = async (req: Request) => {
  const h = await getServeHandler()
  if (!h) {
    return Response.json(
      {
        error: 'Inngest is not available on this runtime',
        detail:
          'The inngest SDK is Node-only and this deployment has no INNGEST_EVENT_KEY/INNGEST_SIGNING_KEY.',
      },
      { status: 501 }
    )
  }
  return h(req)
}

export { run as GET, run as POST, run as PUT }
