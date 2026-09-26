import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const WORKER_URL = process.env.WORKER_URL || 'https://hostamar-orchestrator.romelraisul.workers.dev'

export const runtime = 'edge'


/**
 * Vercel frontend proxy to Cloudflare Worker orchestrator.
 * Lightweight — NO heavy CPU, just forwards to Worker.
 * Catch-all route: /api/orchestrator/*
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  // pathSegments = ['', 'api', 'orchestrator', ...rest]
  const segments = url.pathname.split('/').filter(Boolean)
  const rest = segments.slice(2) // everything after /api/orchestrator

  try {
    if (rest[0] === 'status') {
      const since = url.searchParams.get('since') || '0'
      const res = await fetch(`${WORKER_URL}/api/status?since=${since}`, { cache: 'no-store' })
      return NextResponse.json(await res.json())
    }

    if (rest[0] === 'queue' && rest[1] === 'pull') {
      const res = await fetch(`${WORKER_URL}/api/queue/pull`, { cache: 'no-store' })
      return NextResponse.json(await res.json())
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const rest = segments.slice(2)

  try {
    if (rest[0] === 'queue') {
      if (rest[1] === 'push') {
        const body = await req.json()
        const res = await fetch(`${WORKER_URL}/api/queue/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        return NextResponse.json(await res.json())
      }
      if (rest[1] === 'report') {
        const body = await req.json()
        const res = await fetch(`${WORKER_URL}/api/queue/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        return NextResponse.json(await res.json())
      }
    }

    if (rest[0] === 'register') {
      const body = await req.json()
      const res = await fetch(`${WORKER_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return NextResponse.json(await res.json())
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
