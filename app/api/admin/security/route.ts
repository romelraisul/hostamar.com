export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

/**
 * GET /api/admin/security
 * Security posture digest for the /admin/security dashboard.
 * Reads only from tables that already exist (ActivityLog, RateLimitEvent,
 * Incident) so it works on any environment without new migrations.
 *
 * Auth: requires admin role (getAuthUser). 401 otherwise.
 */

async function countSince(model: 'rateLimitEvent' | 'activityLog', since: Date, where: Record<string, unknown> = {}) {
  if (model === 'rateLimitEvent') {
    return prisma.rateLimitEvent.count({ where: { ...where, createdAt: { gte: since } } })
  }
  return prisma.activityLog.count({ where: { ...where, createdAt: { gte: since } } })
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const since24h = new Date(now - 24 * 60 * 60 * 1000)
  const since1h = new Date(now - 60 * 60 * 1000)

  // Wazuh L7 pipeline reachability (indexer + manager API), non-fatal.
  const wazuhIndexerUrl = process.env.WAZUH_INDEXER_URL || 'http://127.0.0.1:9200'
  const wazuhManagerUrl = process.env.WAZUH_MANAGER_URL || 'http://127.0.0.1:55000'
  let wazuh = { indexer: 'down' as 'up' | 'down', manager: 'up' as 'up' | 'down', lastChecked: new Date().toISOString() }
  try {
    const [idx, mgr] = await Promise.all([
      fetch(wazuhIndexerUrl, { signal: AbortSignal.timeout(2000) }).then((r) => r.ok).catch(() => false),
      fetch(wazuhManagerUrl, { signal: AbortSignal.timeout(2000) }).then((r) => r.ok).catch(() => false),
    ])
    wazuh = { indexer: idx ? 'up' : 'down', manager: mgr ? 'up' : 'down', lastChecked: new Date().toISOString() }
  } catch {
    // keep defaults (both down) — never let monitoring break the endpoint
  }

  const [rateLimited1h, rateLimited24h, failedLogins24h, securityEvents24h, openIncidents] = await Promise.all([
    countSince('rateLimitEvent', since1h).catch(() => -1),
    countSince('rateLimitEvent', since24h).catch(() => -1),
    countSince('activityLog', since24h, { action: { in: ['login_failed', 'auth_failed', 'signin_failed'] } }).catch(() => -1),
    countSince('activityLog', since24h, { action: { contains: 'security' } }).catch(() => -1),
    prisma.incident.count({ where: { status: { not: 'resolved' } } }).catch(() => -1),
  ])

  // Top rate-limited buckets in the last 24h (proxy for L7 attack pressure).
  const topBucketsRaw = await prisma.rateLimitEvent
    .groupBy({ by: ['path'], where: { createdAt: { gte: since24h } }, _count: { _all: true }, orderBy: { _count: { path: 'desc' } }, take: 5 })
    .catch(() => [] as Array<{ path: string; _count: { _all: number } }>)
  const topRateLimitedPaths = topBucketsRaw.map((b) => ({ path: b.path, count: b._count._all }))

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    wazuh,
    rateLimit: { last1h: rateLimited1h, last24h: rateLimited24h, topPaths: topRateLimitedPaths },
    auth: { failedLogins24h },
    securityEvents24h,
    incidents: { open: openIncidents },
  })
}
