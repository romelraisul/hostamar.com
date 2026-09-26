import { NextRequest, NextResponse } from 'next/server'
import { pingModel, setHealth, getHealth, HEALTH_KEY } from '@/lib/model-health'

export const dynamic = 'force-dynamic'
export const maxDuration = 55

export const runtime = 'edge'


/**
 * POST /api/v1/health-check — hourly model health probe.
 * Auth: x-cron-secret must equal CRON_SECRET (WSL cron calls this).
 * Pings a rotating sample of the gateway catalog (12 models/run, full sweep
 * every ~13h for a 156-model list) and merges results into Upstash
 * omnirouter:health (TTL 2h). /api/v1/models filters on it.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // catalog = same sources /api/v1/models uses
  const [edgeP] = await Promise.all([
    fetch('https://hostamar-ai-gateway.romelraisul.workers.dev/v1/models', { signal: AbortSignal.timeout(5000) })
      .then(r => (r.ok ? r.json() : null)).catch(() => null),
  ])
  const ids: string[] = Array.isArray(edgeP?.data) ? edgeP.data.map((m: { id: string }) => m.id) : []
  if (!ids.length) return NextResponse.json({ error: 'no catalog' }, { status: 502 })

  // rotating slice: 12 per run
  const hour = Math.floor(Date.now() / 3_600_000)
  const SAMPLE = 4
  const slice = Array.from({ length: SAMPLE }, (_, i) => ids[(hour * SAMPLE + i) % ids.length])

  const prev = (await getHealth()) || {}
  // ponytail: burst of 12 parallel pings trips the gateway's rate limit (429) —
  // stagger 400ms apart and treat 429 as unknown (skip, don't mark down).
  const results: { id: string; latencyMs: number; ok: boolean; error?: string }[] = []
  for (const id of slice) {
    results.push(await pingModel(id))
    await new Promise(r => setTimeout(r, 1500))
  }
  const merged = { ...prev }
  for (const r of results) {
    if (r.error?.startsWith('HTTP 429')) continue // rate-limited probe ≠ model down
    merged[r.id] = r
  }
  // ponytail: entries older than 48 checks (~2 days) age out via sweep below
  await setHealth(merged)

  const healthy = Object.values(merged).filter(r => r.ok).length
  return NextResponse.json({
    ok: true, checked: slice, results,
    total: Object.keys(merged).length, healthy,
    key: HEALTH_KEY,
  })
}

export async function GET() {
  const h = await getHealth()
  if (!h) return NextResponse.json({ error: 'no health data yet' }, { status: 404 })
  const entries = Object.values(h)
  return NextResponse.json({
    total: entries.length,
    healthy: entries.filter(e => e.ok).length,
    down: entries.filter(e => !e.ok).slice(0, 20),
  })
}
