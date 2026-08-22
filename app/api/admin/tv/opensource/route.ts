export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureSchema } from "@/lib/ensure-schema"
import { searchAllSources } from "@/lib/tv/openSource/sources"

/**
 * GET /api/admin/tv/opensource?list=1          -> DB queue rows
 * GET /api/admin/tv/opensource?q=farming&source=NASA -> live source search
 * POST /api/admin/tv/opensource  (candidate)   -> upsert row (QUEUED) + TvCommand OPENSOURCE_PIPELINE
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()
    const sp = req.nextUrl.searchParams
    if (sp.get("list")) {
      const rows = await prisma.openSourceVideo.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
      return NextResponse.json({ ok: true, items: rows })
    }
    const q = (sp.get("q") || "").trim()
    const source = sp.get("source") || undefined
    const results = await searchAllSources(q, source)
    return NextResponse.json({ ok: true, results })
  } catch (err: any) {
    const s = err?.cause?.status || 500
    if (s === 401 || s === 403) return NextResponse.json({ error: "Unauthorized" }, { status: s })
    console.error("[admin/tv/opensource] error:", err)
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()
    const b = await req.json().catch(() => ({}))
    const { source, externalId, title, downloadUrl, license, licenseUrl, thumbnail, description } = b
    if (!source || !externalId || !downloadUrl) {
      return NextResponse.json({ error: "INVALID", message: "source, externalId, downloadUrl required" }, { status: 400 })
    }
    const existing = await prisma.openSourceVideo.findFirst({ where: { source, externalId } })
    const row = existing
      ? await prisma.openSourceVideo.update({ where: { id: existing.id }, data: { status: "QUEUED", error: null, originalUrl: downloadUrl } })
      : await prisma.openSourceVideo.create({
          data: {
            source, externalId,
            title: String(title || externalId).slice(0, 200),
            originalUrl: downloadUrl,
            license: license || null,
            licenseUrl: licenseUrl || null,
            status: "QUEUED",
          },
        })
    const cmd = await (prisma as any).tvCommand.create({
      data: { action: "OPENSOURCE_PIPELINE", payload: { openSourceVideoId: row.id, item: { id: row.source.toLowerCase() + "-" + row.externalId, source: row.source, externalId: row.externalId, title: row.title, downloadUrl: row.originalUrl, license: row.license } }, status: "PENDING" },
    })
    await (prisma as any).tvLog.create({ data: { level: "info", message: `OpenSource queue: ${row.source}:${row.externalId} (${row.id})` } }).catch(() => {})
    return NextResponse.json({ ok: true, item: row, command: cmd })
  } catch (err: any) {
    const s = err?.cause?.status || 500
    if (s === 401 || s === 403) return NextResponse.json({ error: "Unauthorized" }, { status: s })
    console.error("[admin/tv/opensource POST] error:", err)
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
  }
}
