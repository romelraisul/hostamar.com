export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/tv/ad-click — no auth, beacon from AdTicker
export async function POST(req: NextRequest) {
  try {
    // Ensure table exists at runtime
    try {
      await (prisma as any).$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "TvAdClick" (
          "id" TEXT PRIMARY KEY,
          "adKey" TEXT NOT NULL,
          "adText" TEXT NOT NULL,
          "channelId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "TvAdClick_adKey_createdAt_idx" ON "TvAdClick"("adKey", "createdAt");
      `)
    } catch {}

    const body = await req.json().catch(() => ({}))
    const adKey = String(body.adKey || '').trim()
    const adText = String(body.adText || body.text || '').trim()
    const channelId = body.channelId ? String(body.channelId) : null

    if (!adKey || !adText) {
      return NextResponse.json({ error: 'adKey and adText required' }, { status: 400 })
    }

    // Ensure table exists (prisma db push creates it on deploy)
    const created = await (prisma as any).tvAdClick.create({
      data: { adKey, adText, channelId },
    })

    return NextResponse.json({ ok: true, id: created.id })
  } catch (e: any) {
    // Table may not exist before first deploy's db push — return 200 anyway to not break beacon
    if (String(e?.message || '').includes('does not exist') || String(e?.code || '') === 'P2021') {
      return NextResponse.json({ ok: true, seeded: false })
    }
    console.error('[ad-click] error:', e)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
// trigger Sat Aug 29 03:08:10 UTC 2026
