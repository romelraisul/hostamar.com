export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ensureSchema } from "@/lib/ensure-schema"
import { env } from "@/lib/env"

/**
 * GET /api/cron/tv-ingest?secret=CRON_SECRET (Vercel cron backup)
 * Queues TvCommand AUTO_INGEST — the WSL agent runs scripts/bangla-dub/auto.py.
 */
export async function GET(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("authorization")?.replace("Bearer ", "") || ""
    const expected = env.CRON_SECRET || process.env.CRON_SECRET || ""
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await ensureSchema()
    const cmd = await (prisma as any).tvCommand.create({
      data: { action: "AUTO_INGEST", payload: { count: 2 }, status: "PENDING" },
    })
    return NextResponse.json({ ok: true, command: cmd })
  } catch (err: any) {
    console.error("[cron/tv-ingest] error:", err)
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
  }
}
