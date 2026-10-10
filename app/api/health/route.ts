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
 * Box liveness (`pc`) — additive field, read by the off-box probe
 * (`.github/workflows/external-probe.yml`). Without it this route stays green while the
 * home box is dead, because the Worker and Turso are both off-box — that is exactly the
 * outage radar.sh cannot report from inside.
 *
 * Signal: the box already reports to the cloud every few minutes (fleet/loop.mjs →
 * /api/admin/fleet → FleetReport rows in this same Turso DB), so "the box is alive" ==
 * "the newest FleetReport row is recent". Reading it is a Turso query, which matters:
 * the first implementation fetched a box-only hostname through the tunnel and got
 * Cloudflare's managed challenge (HTTP 403, "Just a moment...") whenever the caller's IP
 * was challenged — same-zone subrequests inherit that verdict, so the fetch path is
 * unusable from a datacenter caller. A DB read cannot be challenged.
 *
 * FleetReport.runAt is written two ways (Prisma DateTime → epoch number; the
 * turso-fleet-insert.cjs fallback → ISO text), so parse both instead of trusting SQL
 * ordering on a dynamically-typed column.
 */
const PC_MAX_AGE_S = Number(process.env.HOSTAMAR_PC_MAX_AGE_S || 1200) // 20 min: 4 missed 5-min reports
const PC_SAMPLE_ROWS = 100

type PcProbe = {
  alive: boolean
  via: string
  lastSeen?: string | null
  ageSeconds?: number | null
  maxAgeSeconds: number
  rows?: number
  ms: number
  error?: string
}

function toEpochMs(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000 // ms vs epoch seconds
  const s = String(v).trim()
  if (!s) return null
  if (/^-?\d+$/.test(s)) {
    const n = Number(s)
    return n > 1e12 ? n : n * 1000
  }
  const t = Date.parse(s.includes('T') ? s : s.replace(' ', 'T'))
  return Number.isNaN(t) ? null : t
}

async function probePc(): Promise<PcProbe> {
  const started = Date.now()
  try {
    const client = getTursoEdgeClient()
    // rowid DESC = insertion order: independent of how runAt is encoded.
    const res = await client.execute(
      `SELECT "runAt" FROM "FleetReport" ORDER BY rowid DESC LIMIT ${PC_SAMPLE_ROWS}`,
    )
    let newest: number | null = null
    for (const row of res.rows) {
      const ms = toEpochMs((row as Record<string, unknown>).runAt)
      if (ms !== null && (newest === null || ms > newest)) newest = ms
    }
    const ageSeconds = newest === null ? null : Math.round((Date.now() - newest) / 1000)
    return {
      alive: ageSeconds !== null && ageSeconds <= PC_MAX_AGE_S,
      via: 'turso:FleetReport.runAt',
      lastSeen: newest === null ? null : new Date(newest).toISOString(),
      ageSeconds,
      maxAgeSeconds: PC_MAX_AGE_S,
      rows: res.rows.length,
      ms: Date.now() - started,
    }
  } catch (e) {
    return {
      alive: false,
      via: 'turso:FleetReport.runAt',
      maxAgeSeconds: PC_MAX_AGE_S,
      ms: Date.now() - started,
      error: (e as Error)?.name || 'error',
    }
  }
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
  // Together, not in sequence: keep the route at one round-trip of latency.
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
    version: '1.0.3',
  }

  return NextResponse.json(payload, { status: 200 })
}
