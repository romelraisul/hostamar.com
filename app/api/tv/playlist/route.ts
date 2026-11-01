export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'

// ponytail: workerd cannot load Prisma 5.22's engine init (fs.readdir -> unenv
// throws -> every query swallowed as 500). Read Turso directly via the fetch-only
// /web client (same pattern as /api/tv/status + tv/watch). Upgrade path: none —
// Prisma stays on Vercel only.
/**
 * GET /api/tv/playlist  (public)
 * Returns the ordered playlist for the channel (used by /tv player + streamer).
 */
export async function GET(req: NextRequest) {
  // Try Turso first (production)
  try {
    const db = getTursoEdgeClient()
    return await fetchPlaylistFromTurso(db)
  } catch (err) {
    console.log('[tv/playlist] Turso unavailable, trying local fallback:', err)
  }

  // Local fallback: try to read from local SQLite (dev.db)
  try {
    return await fetchPlaylistFromLocal()
  } catch (err) {
    console.error('[tv/playlist] local fallback failed:', err)
  }

  // Last resort: return mock playlist so /tv never blank
  return NextResponse.json({
    ok: true,
    channelId: 'local',
    channelName: 'Hostamar TV (local)',
    isLive: false,
    count: 3,
    items: [
      { id: '1', title: 'Hostamar AI Video Demo', url: 'https://f005.backblazeb2.com/file/hostamar-prod/tv/HostamarH3_00001_.mp4', source: 'b2', position: 0, videoId: '1' },
      { id: '2', title: 'Hostamar Platform Overview', url: 'https://f005.backblazeb2.com/file/hostamar-prod/tv/HostamarH3_00002_.mp4', source: 'b2', position: 1, videoId: '2' },
      { id: '3', title: 'AI Video Generation Tutorial', url: 'https://f005.backblazeb2.com/file/hostamar-prod/tv/HostamarH3_00003_.mp4', source: 'b2', position: 2, videoId: '3' },
    ],
  })
}

async function fetchPlaylistFromTurso(db: ReturnType<typeof getTursoEdgeClient>) {
  const chanRes = await db.execute(
    'SELECT "id", "name", "isLive" FROM "TvChannel" ORDER BY "createdAt" ASC LIMIT 1'
  )
  if (!chanRes.rows.length) {
    return NextResponse.json({ ok: true, error: 'NO_CHANNEL', count: 0, items: [] })
  }
  const channel = chanRes.rows[0] as unknown as { id: string; name: string; isLive: number | boolean }
  const channelId = channel.id

  const res = await db.execute({
    sql: 'SELECT "id", "title", "url", "source", "position", "videoId" FROM "TvPlaylistItem" WHERE "channelId" = ? AND "played" = false ORDER BY "position" ASC LIMIT 200',
    args: [channelId],
  })
  let items = res.rows.map((r) => ({ ...(r as Record<string, unknown>) })) as Array<{
    id: string
    title: string
    url: string
    source: string
    position: number
    videoId: string | null
  }>

  if (items.length === 0) {
    try {
      const vidRes = await db.execute(
        'SELECT "id", "title", "prompt", "url", "videoUrl", "createdAt" FROM "Video" ORDER BY "createdAt" DESC LIMIT 12'
      )
      items = vidRes.rows
        .map((r) => ({ ...(r as Record<string, unknown>) }))
        .filter((v) => String(v.url || v.videoUrl || '').includes('hostamar.com'))
        .map((v, idx) => ({
          id: String(v.id),
          title: String(v.title || String(v.prompt || '').slice(0, 60) || `Video ${idx + 1}`),
          url: String(v.url || v.videoUrl || ''),
          source: 'generated',
          position: idx,
          videoId: String(v.id),
        }))
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    channelId,
    channelName: channel.name,
    isLive: Boolean(channel.isLive),
    count: items.length,
    items: items.map((i) => ({
      id: i.id,
      title: i.title,
      url: i.url,
      source: i.source,
      position: i.position,
      videoId: i.videoId,
    })),
  })
}

async function fetchPlaylistFromLocal() {
  // Dynamic import to avoid bundling better-sqlite3 in edge runtime
  const Database = (await import('better-sqlite3')).default
  const path = await import('path')
  const { fileURLToPath } = await import('url')
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const dbPath = path.resolve(__dirname, '../../prisma/dev.db')

  const db = new Database(dbPath, { readonly: true })

  try {
    // Check if TV tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Tv%'").all()
    if (tables.length === 0) {
      throw new Error('TV tables not found in local DB')
    }

    const channel = db.prepare('SELECT id, name, isLive FROM TvChannel ORDER BY createdAt ASC LIMIT 1').get() as { id: string; name: string; isLive: number } | undefined
    if (!channel) {
      throw new Error('No channel in local DB')
    }

    const items = db.prepare(
      'SELECT id, title, url, source, position, videoId FROM TvPlaylistItem WHERE channelId = ? AND played = 0 ORDER BY position ASC LIMIT 200'
    ).all(channel.id) as Array<{ id: string; title: string; url: string; source: string; position: number; videoId: string | null }>

    return NextResponse.json({
      ok: true,
      channelId: channel.id,
      channelName: channel.name,
      isLive: Boolean(channel.isLive),
      count: items.length,
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        url: i.url,
        source: i.source,
        position: i.position,
        videoId: i.videoId,
      })),
    })
  } finally {
    db.close()
  }
}
