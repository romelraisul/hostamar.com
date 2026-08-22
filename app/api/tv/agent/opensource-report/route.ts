export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ensureSchema } from "@/lib/ensure-schema"
import { env } from "@/lib/env"
import { getOrCreateDefaultChannel } from "@/lib/tv/generator"

/**
 * POST /api/tv/agent/opensource-report (agent, TV_AGENT_SECRET protected)
 * Body: { openSourceVideoId, status, localPath?, banglaPath?, titleBn?, duration?, error? }
 * When status=DUBBED with banglaPath -> auto-add to TvPlaylistItem (position max+1).
 */
export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("x-agent-secret") || ""
    const expected = env.TV_AGENT_SECRET || process.env.TV_AGENT_SECRET || ""
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await ensureSchema()
    const b = await req.json().catch(() => ({}))
    const id = String(b.openSourceVideoId || "")
    if (!id) return NextResponse.json({ error: "INVALID", message: "openSourceVideoId required" }, { status: 400 })

    const row = await prisma.openSourceVideo.findUnique({ where: { id } })
    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

    const updated = await prisma.openSourceVideo.update({
      where: { id },
      data: {
        status: String(b.status || row.status).slice(0, 20),
        localPath: b.localPath ?? row.localPath,
        banglaPath: b.banglaPath ?? row.banglaPath,
        titleBn: b.titleBn ?? row.titleBn,
        duration: typeof b.duration === "number" ? Math.round(b.duration) : row.duration,
        error: b.error === undefined ? row.error : String(b.error).slice(0, 500),
        addedToTv: b.status === "ON_TV" ? true : row.addedToTv,
      },
    })

    let playlistItem: any = null
    if (b.status === "DUBBED" && (b.banglaPath || row.banglaPath) && !row.addedToTv) {
      const channel = await getOrCreateDefaultChannel()
      const count = await prisma.tvPlaylistItem.count({ where: { channelId: channel.id } })
      const titleBn = b.titleBn || row.titleBn || row.title
      playlistItem = await prisma.tvPlaylistItem.create({
        data: {
          channelId: channel.id,
          position: count + 1,
          title: `${titleBn} (বাংলা)`,
          url: b.banglaPath || row.banglaPath || "",
          source: "bangla_dub",
        },
      })
      await prisma.openSourceVideo.update({ where: { id }, data: { addedToTv: true } })
      await (prisma as any).tvLog.create({ data: { level: "info", message: `Bangla dub added to TV playlist: ${titleBn}` } }).catch(() => {})
    }

    return NextResponse.json({ ok: true, item: updated, playlistItem })
  } catch (err: any) {
    console.error("[tv/agent/opensource-report] error:", err)
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
  }
}
