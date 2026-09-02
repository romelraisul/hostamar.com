export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 55

import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/cloud/toggle — V31.
 *
 * Dashboard one-click ON/OFF for the OPTIONAL PC services (docker compose
 * profiles: hosting / chat / browser / ide / gaming). Forwards to the local
 * tracker's POST /api/cloud/toggle with the same worker secret. Core services
 * are rejected by the tracker itself (they keep the pipeline alive).
 *
 * Auth: dashboard session FIRST (a customer cannot toggle the founder's PC),
 * then the worker secret server-to-server.
 */
export async function POST(req: NextRequest) {
  try {
    const { getAuthUser } = await import('@/lib/get-auth-user')
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const service = String(body.service || '')
    const action = String(body.action || '')
    if (!service || !['up', 'down'].includes(action)) {
      return NextResponse.json({ error: 'service and action:up|down required', code: 400 }, { status: 400 })
    }

    const pcUrl = process.env.PC_CLOUD_URL || ''
    const secret = process.env.COMFYUI_WORKER_SECRET || ''
    if (!pcUrl) {
      return NextResponse.json({ ok: false, error: 'PC_CLOUD_URL not configured (Tailscale URL) — toggle unavailable', pcOn: false }, { status: 503 })
    }

    const r = await fetch(`${pcUrl.replace(/\/$/, '')}/api/cloud/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-worker-secret': secret },
      body: JSON.stringify({ service, action }),
      signal: AbortSignal.timeout(30_000),
    }).catch(() => null)

    if (!r) {
      return NextResponse.json({ ok: false, error: 'PC offline — toggle unavailable until the PC is on', pcOn: false }, { status: 503 })
    }
    const j = await r.json().catch(() => ({}))
    return NextResponse.json(j, { status: r.status })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal server error', detail: String(e?.message || e).slice(0, 160) },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/cloud/toggle',
    usage: 'POST {service, action: up|down} — dashboard auth, forwards to the local tracker',
  })
}
