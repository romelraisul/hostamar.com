/**
 * lib/tv/generator.ts — 24/7 AI TV Station content generator.
 *
 * Fetches trending topics from RSS feeds, builds a viral-video prompt,
 * and enqueues a real video generation through the existing orchestrator
 * (Video + VideoQueue + BullMQ). No mocks — if the render backend or RSS
 * is unavailable, it returns honest errors.
 */
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { ensureSchema } from '@/lib/ensure-schema'
import { enqueueVideoGeneration } from '@/lib/queue'

export const DEFAULT_RSS_FEEDS = [
  'https://www.prothomalo.com/feed',
  'https://feeds.bbci.co.uk/news/world/rss.xml',
  'https://techcrunch.com/feed/',
]

export interface RssItem {
  title: string
  link: string
  source: string
}

/** Parse RSS_FEEDS env (comma-separated) with fallback to defaults. */
export function getRssFeeds(): string[] {
  const raw = env.RSS_FEEDS || ''
  const feeds = raw
    .split(',')
    .map((f) => f.trim())
    .filter((f) => /^https?:\/\//.test(f))
  return feeds.length ? feeds : DEFAULT_RSS_FEEDS
}

/** Fetch + parse RSS feeds into candidate topics. Best-effort per feed. */
export async function fetchTrendingTopics(limit = 10): Promise<RssItem[]> {
  const feeds = getRssFeeds()
  const items: RssItem[] = []

  for (const feedUrl of feeds) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 10_000)
      const res = await fetch(feedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'HostamarTV/1.0 (+https://hostamar.com)' },
      })
      clearTimeout(timer)
      if (!res.ok) continue

      const xml = await res.text()
      // Lightweight RSS <item><title> extraction (no XML dep)
      const itemBlocks = xml.split(/<item[\s>]/).slice(1)
      const source = new URL(feedUrl).hostname.replace(/^www\./, '')
      for (const block of itemBlocks) {
        const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)
        const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/)
        if (titleMatch) {
          const title = titleMatch[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/<[^>]+>/g, '')
            .trim()
          if (title.length > 10) {
            items.push({ title, link: linkMatch?.[1]?.trim() || '', source })
          }
        }
        if (items.length >= limit * 2) break
      }
    } catch (e: any) {
      console.warn(`[tv/generator] RSS fetch failed for ${feedUrl}:`, e?.message?.slice(0, 100))
    }
  }

  // Dedupe by title, cap
  const seen = new Set<string>()
  return items
    .filter((i) => {
      const key = i.title.toLowerCase().slice(0, 60)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
}

/** Build a viral-video prompt from a topic + style. */
export function buildTvPrompt(topic: string, style: string): string {
  return (
    `Create a viral short news video about "${topic}" in ${style} style — ` +
    `Bengali voiceover, cinematic b-roll, bold on-screen captions, ` +
    `fast-paced cuts, trending social-media format (vertical 9:16), 30 seconds.`
  )
}

/** Find the system owner for TV-generated videos (first admin). */
export async function getTvOwnerCustomerId(): Promise<string | null> {
  const admin = await prisma.customer.findFirst({
    where: { role: { in: ['admin', 'superadmin'] } },
    orderBy: { createdAt: 'asc' },
  })
  return admin?.id || null
}

/** Get or create the default TV channel. */
export async function getOrCreateDefaultChannel() {
  await ensureSchema()
  const channelName = env.TV_CHANNEL_NAME || 'Hostamar TV'
  let channel = await prisma.tvChannel.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!channel) {
    channel = await prisma.tvChannel.create({
      data: {
        name: channelName,
        description: '24/7 AI-generated news & entertainment, streamed live.',
      },
    })
  }
  return channel
}

export interface GenerateResult {
  ok: boolean
  videoId?: string
  playlistItemId?: string
  topic?: string
  error?: string
}

/**
 * Generate one AI video from a trending topic and add it to the channel playlist.
 * Reuses the real video-generation orchestrator (Video + VideoQueue + BullMQ).
 */
export async function generateTvVideo(opts?: { topic?: string; style?: string }): Promise<GenerateResult> {
  await ensureSchema()

  const ownerId = await getTvOwnerCustomerId()
  if (!ownerId) {
    return { ok: false, error: 'NO_OWNER: no admin user found to own TV videos' }
  }

  // Pick a topic
  let topic = opts?.topic?.trim()
  if (!topic) {
    const topics = await fetchTrendingTopics(5)
    if (!topics.length) {
      return { ok: false, error: 'NO_TOPICS: could not fetch any RSS topics' }
    }
    topic = topics[Math.floor(Math.random() * topics.length)].title
  }

  const style = opts?.style || 'cinematic'
  const prompt = buildTvPrompt(topic, style)
  const title = `[TV] ${topic.slice(0, 80)}`

  // Create the Video record (owned by the system admin)
  const video = await prisma.video.create({
    data: {
      customerId: ownerId,
      title,
      prompt,
      topic,
      duration: 30,
      format: 'mp4',
      resolution: '720p',
      language: 'bn',
      status: 'processing',
    },
  })

  // Enqueue via the real orchestrator path (VideoQueue row + BullMQ)
  const queueRow = await prisma.videoQueue.create({
    data: {
      customerId: ownerId,
      topic,
      type: 'tv-generate',
      status: 'queued',
      priority: 3, // lower than user jobs
      videoId: video.id,
    },
  })

  try {
    await enqueueVideoGeneration({
      script: prompt,
      style,
      voiceOver: 'bn',
      duration: 30,
      userId: ownerId,
      videoId: video.id,
    })
  } catch (e: any) {
    console.warn('[tv/generator] BullMQ enqueue failed (VideoQueue row holds job):', e?.message?.slice(0, 120))
  }

  // Add to playlist (url filled in when render completes; use videoId ref)
  const channel = await getOrCreateDefaultChannel()
  const maxPos = await prisma.tvPlaylistItem.aggregate({
    where: { channelId: channel.id },
    _max: { position: true },
  })
  const playlistItem = await prisma.tvPlaylistItem.create({
    data: {
      channelId: channel.id,
      videoId: video.id,
      title,
      url: `/videos/${video.id}.mp4`, // resolved by player when ready
      source: 'generated',
      position: (maxPos._max.position ?? 0) + 1,
    },
  })

  return { ok: true, videoId: video.id, playlistItemId: playlistItem.id, topic }
}

/** Count current playlist items for a channel. */
export async function getPlaylistLength(channelId: string): Promise<number> {
  return prisma.tvPlaylistItem.count({ where: { channelId } })
}
