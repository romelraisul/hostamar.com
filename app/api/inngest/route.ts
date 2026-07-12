// GET/POST /api/inngest — Inngest serve endpoint (self-hosted).
// Exposes the autonomous-runner + research-fanout + goal-loop + voice + support functions.
import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { autonomousRunner } from '@/inngest/functions/autonomous-runner'
import { researchFanout } from '@/inngest/functions/research-fanout'
import { goalTick } from '@/inngest/functions/goalTick'
import { voicePostCallWorker } from '@/lib/voice/postCallProcessor'
import { supportAutoResolve } from '@/inngest/functions/supportAutoResolve'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = serve({
  client: inngest,
  functions: [autonomousRunner, researchFanout, goalTick, voicePostCallWorker, supportAutoResolve],
})
export const POST = GET
export const PUT = GET
