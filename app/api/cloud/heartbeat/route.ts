export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * POST /api/cloud/heartbeat — V31.
 *
 * The local cloud-tracker.mjs (this PC) POSTs the full service state here every
 * 60s (x-worker-secret, same fail-closed guard as the V30 worker routes). The
 * row is the SOURCE OF TRUTH for "when was the PC last alive" — when the PC is
 * off, /api/cloud/status serves this row's lastSeen so the dashboard shows an
 * honest offline banner instead of a timeout/500.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-worker-secret') || ''
    const expected = process.env.COMFYUI_WORKER_SECRET || ''
    if (!expected || !secret || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const pcUptimeSec = Number(body.pcUptimeSec) || 0
    const gpu = body.gpu ?? null
    const tailscaleIp = body.tailscaleIp || null
    const services = Array.isArray(body.services) ? body.services : null

    const row = await prisma.cloudState.upsert({
      where: { id: 'pc' },
      create: {
        id: 'pc', pcOn: true, lastSeen: new Date(), pcUptimeSec,
        gpu: gpu as object | undefined, tailscaleIp, services: services as object | undefined,
      },
      update: { pcOn: true, lastSeen: new Date(), pcUptimeSec, gpu: gpu as object | undefined, tailscaleIp, services: services as object | undefined },
    }).catch((e: any) => {
      console.warn('[cloud/heartbeat] upsert failed:', String(e?.message || e).slice(0, 160))
      return null
    })
    if (!row) {
      // Idempotent-DDL miss (fresh DB without CloudState yet) — report honestly.
      return NextResponse.json({ ok: false, error: 'CloudState table not present in this DB yet' }, { status: 503 })
    }
    return NextResponse.json({ ok: true, lastSeen: row.lastSeen })
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
    endpoint: '/api/cloud/heartbeat',
    usage: 'POST {pcUptimeSec, gpu, tailscaleIp, services[]} — local tracker heartbeat (x-worker-secret)',
    auth: 'COMFYUI_WORKER_SECRET required (fail closed)',
  })
}
