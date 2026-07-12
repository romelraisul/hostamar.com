// GET/POST /api/inngest — Inngest serve endpoint (self-hosted).
// Exposes the autonomous-runner + research-fanout functions.
import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { autonomousRunner } from '@/inngest/functions/autonomous-runner'
import { researchFanout } from '@/inngest/functions/research-fanout'
import { goalTick } from '@/inngest/functions/goalTick'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = serve({ client: inngest, functions: [autonomousRunner, researchFanout, goalTick] })
export const POST = GET
export const PUT = GET
