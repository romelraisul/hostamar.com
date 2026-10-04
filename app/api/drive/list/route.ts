export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'
import { verifyToken } from '@/lib/auth-utils'
import { cachedTurso } from '@/lib/upstash-cache'

/**
 * GET /api/drive/list?folderId=&q= — V34.
 * Auth: session cookie. Returns folders + files for the owner, newest first,
 * with total storage used (Telegram-backed = unlimited, shown in UI badge).
 *
 * ponytail: Workers cannot load Prisma 5.22's libssl detection (fs.readdir on
 * /lib -> unenv throws) — direct @libsql/client/web via lib/turso-edge.ts is
 * fetch-only and runs on Workers AND Vercel Node. Same queries, sqlite
 * dialect (LIKE for contains, scalar SUM via aggregation row).
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload?.id) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    const ownerId = String(payload.id)

    const folderId = req.nextUrl.searchParams.get('folderId') || null
    const q = (req.nextUrl.searchParams.get('q') || '').trim()

    const client = getTursoEdgeClient()

    if (q) {
      const rs = await client.execute({
        sql: `SELECT "id","fileName","fileSize","mimeType","folderId","createdAt"
              FROM "DriveFile" WHERE "ownerId" = ? AND "fileName" LIKE '%' || ?
              ORDER BY "createdAt" DESC LIMIT 100`,
        args: [ownerId, q],
      })
      const files = rs.rows.map((r) => ({
        id: r.id as string,
        fileName: r.fileName as string,
        fileSize: r.fileSize == null ? null : String(r.fileSize as bigint | number),
        mimeType: r.mimeType as string,
        folderId: r.folderId as string | null,
        createdAt: r.createdAt as string,
      }))
      return NextResponse.json({ ok: true, files, folders: [] })
    }

    // ponytail: cache-aside 30s — one Upstash get per request instead of 3 Turso reads (500M/mo cap)
    const { folders, files, agg } = await cachedTurso(
      `drive:list:${ownerId}:${folderId || 'root'}`, 30,
      async () => {
        const [foldersRs, filesRs, sumRs] = await Promise.all([
          client.execute({
            sql: `SELECT "id","name","parentId","createdAt" FROM "DriveFolder"
                  WHERE "ownerId" = ? AND ("parentId" = ? OR (? IS NULL AND "parentId" IS NULL))
                  ORDER BY "name" ASC`,
            args: [ownerId, folderId, folderId],
          }),
          client.execute({
            sql: `SELECT "id","fileName","fileSize","mimeType","folderId","createdAt"
                  FROM "DriveFile" WHERE "ownerId" = ? AND ("folderId" = ? OR (? IS NULL AND "folderId" IS NULL))
                  ORDER BY "createdAt" DESC LIMIT 200`,
            args: [ownerId, folderId, folderId],
          }),
          client.execute({
            // ponytail: count ALL rows — every part of a chunked file carries chunkGroupId,
            // so filtering them out under-reported usedBytes by the whole chunked payload (b20bc720)
            sql: `SELECT SUM("fileSize") AS s FROM "DriveFile" WHERE "ownerId" = ?`,
            args: [ownerId],
          }),
        ])
        const folders = foldersRs.rows.map((r) => ({
          id: r.id as string,
          name: r.name as string,
          parentId: r.parentId as string | null,
          createdAt: r.createdAt as string,
        }))
        const files = filesRs.rows.map((r) => ({
          id: r.id as string,
          fileName: r.fileName as string,
          fileSize: r.fileSize == null ? null : String(r.fileSize as bigint | number),
          mimeType: r.mimeType as string,
          folderId: r.folderId as string | null,
          createdAt: r.createdAt as string,
        }))
        const s = sumRs.rows[0]?.s
        return { folders, files, agg: { _sum: { fileSize: s == null ? null : String(s as bigint | number) } } }
      },
    )
    if (q) return NextResponse.json({ ok: true, files, folders: [] })
    return NextResponse.json({
      ok: true, folders, files,
      usedBytes: String(agg._sum.fileSize || 0),
      unlimited: true, // Telegram channel storage
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Drive list failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    )
  }
}
