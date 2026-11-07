export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'

export async function GET(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-agent-secret') || ''
    const expected = process.env.TV_AGENT_SECRET || ''
    
    console.log('[tv/agent/commands] secret check:', { 
      hasSecret: !!secret, 
      hasExpected: !!expected,
      match: secret === expected,
      expectedLen: expected?.length || 0
    })
    
    if (!expected || secret !== expected) {
          return NextResponse.json({ error: 'Unauthorized', message: 'Invalid agent secret' }, { status: 401 })
        }

        const client = await getTursoEdgeClient()
    console.log('[tv/agent/commands] Turso client created')
    
    try {
      const res = await client.execute({
        sql: "SELECT id, action, payload, status, createdAt, executedAt FROM TvCommand WHERE status = 'PENDING' ORDER BY createdAt ASC LIMIT 10",
        args: [],
      })
      console.log('[tv/agent/commands] Query executed, rows:', res.rows.length)
      
      const commands = res.rows.map((r) => ({
        id: String(r.id),
        action: String(r.action ?? ''),
        payload: r.payload != null ? String(r.payload) : null,
        status: String(r.status ?? 'PENDING'),
        createdAt: r.createdAt != null ? String(r.createdAt) : null,
        executedAt: r.executedAt != null ? String(r.executedAt) : null,
      }))
      
      return NextResponse.json({ ok: true, commands })
    } catch (dbErr: any) {
      // Table doesn't exist or query failed - return empty commands gracefully
      console.warn('[tv/agent/commands] DB query failed, returning empty:', dbErr?.message)
      return NextResponse.json({ ok: true, commands: [] })
    }
  } catch (err: any) {
    console.error('[tv/agent/commands] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR', details: String(err?.message || err).slice(0, 500) }, { status: 500 })
  }
}
