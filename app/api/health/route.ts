import { NextResponse } from 'next/server'
import { getFallbackStatus } from '@/lib/kilocode-client'
import { env } from '@/lib/env'
import { getTursoEdgeClient } from '@/lib/turso-edge'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health — public liveness + REAL database connectivity.
 * Prisma/Neon is reachable from Vercel serverless (catalog, storage, TV all
 * use it in prod). The old "DB owned by dedicated backend" note was stale —
 * architecture moved back to direct Neon via DATABASE_URL.
 * Kept cheap: one SELECT 1 + one Customer.count().
 */

/**
 * Box liveness (`pc`) — additive field.
 *
 * This Worker and Turso are both off-box, so without this the route stays green while the
 * home box (and everything it serves: the tunnel, the local models, the video pipeline) is
 * dead. That is precisely the outage `ops/monitoring/radar.sh` cannot report from inside,
 * so the off-box probe in `.github/workflows/external-probe.yml` reads this field. Existing
 * consumers only look at status/database, so adding a field changes nothing for them.
 *
 * Both URLs point at services that only exist on the box, reached through the tunnel:
 * with the box off they fail fast (tunnel 502/530) and we report pc.alive=false.
 */
const PC_PROBE_URLS = (
  process.env.HOSTAMAR_PC_PROBE_URLS ||
  'https://embeddings.hostamar.com/health,https://decisions.hostamar.com/health'
)
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean)

type PcProbe = {
  alive: boolean
  via?: string
  status?: number
  ms: number
  tried: string[]
}

async function probePc(): Promise<PcProbe> {
  const started = Date.now()
  const tried: string[] = []
  for (const url of PC_PROBE_URLS) {
    const t0 = Date.now()
    try {
      const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}from=health`, {
        cache: 'no-store',
        // Short cap: a health route must not hang behind a dead tunnel.
        signal: AbortSignal.timeout(2500),
        headers: { 'user-agent': 'hostamar-health-probe' },
      })
      tried.push(`${url.replace(/^https?:\/\//, '')}=${res.status}`)
      if (res.ok) {
        return { alive: true, via: url, status: res.status, ms: Date.now() - t0, tried }
      }
    } catch (e) {
      tried.push(`${url.replace(/^https?:\/\//, '')}=${(e as Error)?.name || 'error'}`)
    }
  }
  return { alive: false, ms: Date.now() - started, tried }
}

async function checkDb(): Promise<{ connected: boolean; customers: number }> {
  try {
    const client = getTursoEdgeClient()
    await client.execute('SELECT 1')
    const row = await client.execute('SELECT COUNT(*) AS total FROM Customer')
    return { connected: true, customers: Number(row.rows[0]?.total ?? 0) }
  } catch (e) {
    console.error('[health] db check failed:', e)
    return { connected: false, customers: 0 }
  }
}

export async function GET() {
  // Together, not in sequence: the pc probe costs a tunnel round-trip and must not add its
  // latency to a route other services also poll.
  const [database, pc] = await Promise.all([checkDb(), probePc()])

  const payload = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database,
    pc,
    environment: {
      nodeEnv: env.NODE_ENV,
      nextAuthUrl: env.NEXTAUTH_URL || 'not set',
      databaseUrlSet: Boolean(env.DATABASE_URL),
      apiBackend: env.NEXT_PUBLIC_API_URL || 'not set',
    },
    aiFallback: getFallbackStatus(),
    version: '1.0.2',
  }

  return NextResponse.json(payload, { status: 200 })
}
