export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import prisma from '@/lib/prisma'

/**
 * POST /api/admin/videos/retry — V87.
 *
 * Admin retry from the ভিডিও Tab: re-queues ANY row (not just the caller's
 * own, unlike /api/videos/retry) for the local HunyuanVideo worker.
 * Auth: dashboard auth_token cookie via getAuthUser + role check against the
 * Customer row (customer role = 403). Form POSTs land here and 303 back to
 * /admin/videos (force-dynamic re-fetch shows fresh status).
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 })
    }
    const cust = await prisma.customer.findUnique({ where: { id: authUser.id }, select: { role: true } })
    if (cust?.role !== 'admin' && cust?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    // Accept BOTH JSON (fetch) and form-encoded (native form POST) bodies —
    // the admin Retry button is a plain HTML form (urlencoded).
    let videoId = ''
    const ctype = req.headers.get('content-type') || ''
    if (ctype.includes('application/json')) {
      videoId = String((await req.json().catch(() => ({}))).videoId || '')
    } else {
      videoId = String((await req.formData().catch(() => new FormData())).get('videoId') || '')
    }
    if (!videoId) {
      return NextResponse.json({ error: 'videoId required', code: 400 }, { status: 400 })
    }

    const wantsJson = req.headers.get('accept')?.includes('application/json')
    // Same re-queue data as /api/videos/retry worker branch — the fixed worker
    // (PY/FF/COMFY_ROOT Linux paths, presigned B2) claims within 10s.
    await prisma.videoQueue.updateMany({
      where: { videoId, status: { in: ['pending', 'processing', 'failed', 'completed'] } },
      data: { status: 'pending', renderStatus: null, renderError: null, error: null, attempts: 0, processedAt: null },
    })
    await prisma.video
      .update({ where: { id: videoId }, data: { status: 'processing', url: '', updatedAt: new Date() } })
      .catch(() => null)

    if (wantsJson) {
      return NextResponse.json({ ok: true, videoId, status: 'processing', note: 're-queued for local HunyuanVideo worker' })
    }
    return NextResponse.redirect(new URL('/admin/videos', req.url), 303)
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error', detail: String(e?.message || e).slice(0, 160) }, { status: 500 })
  }
}
