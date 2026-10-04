export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'

/**
 * GET /api/tv/agent/commands?secret=TV_AGENT_SECRET (agent polling)
 * Returns PENDING TvCommands. Protected by TV_AGENT_SECRET, NOT cookie auth.
 *
 * ponytail: workerd cannot load Prisma ("[unenv] fs.readdir is not implemented"
 * -> 500 on every poll, verified via wrangler tail 2026-10-04; the local agent
 * poller retried 72x/hour against it). getTursoEdgeClient (@libsql/client/web,
 * fetch-only) runs on both workerd and Node — same cure as /api/health.
 */
export async function GET(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-agent-secret') || ''
    const expected = process.env.TV_AGENT_SECRET || ''
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Invalid agent secret' }, { status: 401 })
    }
    const client = getTursoEdgeClient()
    const res = await client.execute({
      sql: "SELECT id, action, payload, status, createdAt, executedAt FROM TvCommand WHERE status = 'PENDING' ORDER BY createdAt ASC LIMIT 10",
      args: [],
    })
    const commands = res.rows.map((r) => ({
      id: String(r.id),
      action: String(r.action ?? ''),
      payload: r.payload != null ? String(r.payload) : null,
      status: String(r.status ?? 'PENDING'),
      createdAt: r.createdAt != null ? String(r.createdAt) : null,
      executedAt: r.executedAt != null ? String(r.executedAt) : null,
    }))
    return NextResponse.json({ ok: true, commands })
  } catch (err) {
    console.error('[tv/agent/commands] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
