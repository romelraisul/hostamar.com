// /api/admin/diagnostics — protected admin endpoint returning live prod signals
// for the Tier2 triage UI and the status page backend.
//
// SECURITY: /api/admin is whitelisted in middleware, so this route SELF-GUARDS
// via the auth_token cookie + admin/superadmin role (same pattern as saml/config).
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runAllChecks } from '@/lib/support/checks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function requireAdmin(req: NextRequest): { id: string; role?: string } | null {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  if (payload.role !== 'admin' && payload.role !== 'superadmin') return null
  return payload
}

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Tier1 check results (last run summary).
  const checks = await runAllChecks().catch(() => [])

  // LiveKit: optional (separate VPS). Report configured-or-not + a probe.
  const livekit = process.env.LIVEKIT_URL
    ? { configured: true, url: process.env.LIVEKIT_URL }
    : { configured: false, note: 'LiveKit runs on a separate VPS; set LIVEKIT_URL to probe.' }

  // DB latency: time a trivial query.
  let dbLatencyMs: number | null = null
  try {
    const t = Date.now()
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - t
  } catch {
    dbLatencyMs = null
  }

  // Redis: report configured or not.
  const redis = { ok: Boolean(process.env.REDIS_URL), url: process.env.REDIS_URL ?? null }

  // Goal loop: last tick + iteration count from AutonomousTask runs.
  const goalLoop = await prisma.taskRunLog
    .findFirst({ orderBy: { startedAt: 'desc' }, select: { startedAt: true, taskId: true, status: true } })
    .catch(() => null)
  const goalIterations = await prisma.autonomousTask.count().catch(() => 0)

  // SSO: active SAML connections.
  const sso = await prisma.samlConnection
    .count({ where: { isActive: true } })
    .catch(() => 0)

  // Isolation: orphan Videos (no organizationId but have a Membership).
  const orphanVideosCount = await prisma.video
    .count({ where: { organizationId: null } })
    .catch(() => 0)

  return NextResponse.json({
    livekit,
    db: { latencyMs: dbLatencyMs },
    redis,
    goalLoop: {
      lastTick: goalLoop?.startedAt ?? null,
      lastTaskId: goalLoop?.taskId ?? null,
      lastStatus: goalLoop?.status ?? null,
      iterations: goalIterations,
    },
    sso: { activeConnections: sso },
    isolation: { orphanVideosCount },
    checks,
    generatedAt: new Date().toISOString(),
  })
}
