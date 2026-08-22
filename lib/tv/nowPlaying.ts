/**
 * lib/tv/nowPlaying.ts — rotation-aware "now playing" resolution.
 *
 * The local PC runs tv-ffmpeg.service: an ffmpeg concat loop over
 * playlist.host.txt with `-stream_loop -1`. To know what is on air right
 * now we reconstruct the loop position: sum every item's duration, take
 * (seconds since ffmpeg started) % total, then walk the timeline to find
 * the active item. Duration comes from ffprobe of the local file when
 * available (the API runs on the same host in dev / self-host mode); on
 * Vercel the file is not reachable, so we fall back to a per-item estimate.
 *
 * Gender/voice metadata lives in the OpenSourceVideo table (columns added
 * via ensureSchema); it is read through raw SQL so the Prisma client does
 * not need regeneration for the new columns.
 */
import { prisma } from '@/lib/prisma'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execFileAsync = promisify(execFile)

const DEFAULT_DURATION_SEC = 180 // rough fallback when ffprobe unavailable

export interface NowPlaying {
  title: string | null
  titleBn: string | null
  gender: string | null
  voiceUsed: string | null
}

async function ffprobeDuration(path: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path,
    ], { timeout: 5000 })
    const d = parseFloat(stdout.trim())
    return Number.isFinite(d) && d > 0 ? d : null
  } catch {
    return null
  }
}

/**
 * Seconds since the tv-ffmpeg service (re)started. Uses the monotonic
 * ActiveEnterTimestamp paired with /proc/uptime — works even if the wall
 * clock jumped. Returns null when systemd/proc are unreachable (e.g. Vercel).
 */
async function ffmpegUptimeSec(): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('systemctl', [
      '--user', 'show', 'tv-ffmpeg', '--property=ActiveEnterTimestampMonotonic', '--value',
    ], { timeout: 5000 })
    const monoUs = parseFloat(stdout.trim())
    if (!Number.isFinite(monoUs) || monoUs <= 0) return null
    const uptime = parseFloat(fs.readFileSync('/proc/uptime', 'utf8').split(' ')[0])
    if (!Number.isFinite(uptime)) return null
    return Math.max(0, uptime - monoUs / 1_000_000)
  } catch {
    return null
  }
}

interface RotaItem {
  title: string
  url: string
  titleBn: string | null
  gender: string | null
  voiceUsed: string | null
  duration: number
}

/** OpenSourceVideo rows keyed by banglaPath (raw SQL — schema-additive columns). */
async function loadMetaByPath(paths: string[]): Promise<Map<string, NowPlaying>> {
  const out = new Map<string, NowPlaying>()
  if (!paths.length) return out
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "banglaPath", "titleBn", "title", "gender", "voiceUsed"
       FROM "OpenSourceVideo" WHERE "banglaPath" IN (${paths.map((_, i) => `$${i + 1}`).join(',')})`,
      ...paths,
    )
    for (const r of rows || []) {
      if (!r?.banglaPath) continue
      out.set(r.banglaPath, {
        titleBn: r.titleBn || r.title || null,
        gender: r.gender ?? null,
        voiceUsed: r.voiceUsed ?? null,
        title: r.title ?? null,
      })
    }
  } catch {
    // Columns may not exist yet pre-migration — metadata enrichment is optional.
  }
  return out
}

export async function computeNowPlaying(channelId: string): Promise<NowPlaying> {
  const items = await prisma.tvPlaylistItem.findMany({
    where: { channelId },
    orderBy: { position: 'asc' },
  })
  if (!items.length) {
    // Legacy fallback contract: newest generated Video.
    try {
      const video = await (prisma as any).video?.findFirst?.({
        orderBy: { createdAt: 'desc' },
        select: { title: true },
      })
      return { title: video?.title || null, titleBn: null, gender: null, voiceUsed: null }
    } catch {
      return { title: null, titleBn: null, gender: null, voiceUsed: null }
    }
  }

  const rota: RotaItem[] = items.map((it) => ({
    title: it.title,
    url: it.url,
    titleBn: null,
    gender: null,
    voiceUsed: null,
    duration: DEFAULT_DURATION_SEC,
  }))

  // Probe real durations only for local files (self-hosted mode), capped.
  let probed = 0
  for (const r of rota) {
    if (probed >= 80) break
    if (r.url.startsWith('/') && fs.existsSync(r.url)) {
      probed++
      const d = await ffprobeDuration(r.url)
      if (d != null) r.duration = d
    }
  }

  // Enrich titles/gender/voice from the dub pipeline's metadata.
  const meta = await loadMetaByPath(rota.map((r) => r.url).filter((u) => u.startsWith('/')))
  for (const r of rota) {
    const m = meta.get(r.url)
    if (m) {
      r.titleBn = m.titleBn
      r.gender = m.gender
      r.voiceUsed = m.voiceUsed
    }
  }

  const total = rota.reduce((s, r) => s + r.duration, 0)
  let elapsed = await ffmpegUptimeSec()
  if (elapsed == null) {
    // Serverless (Vercel): no systemd/ffprobe — rotate by wall clock so the
    // hero title still advances through the playlist over time.
    elapsed = Date.now() / 1000
  }
  let current = rota[0]
  if (elapsed != null && total > 0) {
    let pos = elapsed % total
    for (const r of rota) {
      if (pos < r.duration) { current = r; break }
      pos -= r.duration
    }
  }
  return {
    title: current.titleBn || current.title,
    titleBn: current.titleBn,
    gender: current.gender,
    voiceUsed: current.voiceUsed,
  }
}
