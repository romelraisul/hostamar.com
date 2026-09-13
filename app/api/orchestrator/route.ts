import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const WORKER_URL = process.env.WORKER_URL || 'https://hostamar-orchestrator.romelraisul.workers.dev'

/**
 * Vercel frontend proxy to Cloudflare Worker orchestrator.
 * Lightweight — NO heavy CPU, just forwards to Worker.
 * Routes:
 *   GET  /api/orchestrator/status — Worker status (events, lastReport, pcOnline)
 *   POST /api/orchestrator/queue/push — Push job to queue
 *   GET  /api/orchestrator/queue/pull — Pull pending jobs (PC calls this)
 *   POST /api/orchestrator/queue/report — Report job completion
 *   POST /api/orchestrator/register — Register PC online
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const path = url.pathname.split('/').pop()

  try {
    if (path === 'status') {
      const since = url.searchParams.get('since') || '0'
      const res = await fetch(`${WORKER_URL}/api/status?since=${since}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      return NextResponse.json(data)
    }

    if (path === 'queue') {
      const sub = url.pathname.split('/')[3]
      if (sub === 'pull') {
        const res = await fetch(`${WORKER_URL}/api/queue/pull`, { cache: 'no-store' })
        const data = await res.json()
        return NextResponse.json(data)
      }
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const path = url.pathname.split('/').pop()

  try {
    if (path === 'queue') {
      const sub = url.pathname.split('/')[3]
      if (sub === 'push') {
        const body = await req.json()
        const res = await fetch(`${WORKER_URL}/api/queue/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        return NextResponse.json(data)
      }
      if (sub === 'report') {
        const body = await req.json()
        const res = await fetch(`${WORKER_URL}/api/queue/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        return NextResponse.json(data)
      }
    }

    if (path === 'register') {
      const body = await req.json()
      const res = await fetch(`${WORKER_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
