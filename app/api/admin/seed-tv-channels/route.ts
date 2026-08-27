export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import prisma from '@/lib/prisma'

const WORLD_M3U = 'https://iptv-org.github.io/iptv/index.m3u'
const BD_M3U = 'https://iptv-org.github.io/iptv/countries/bd.m3u'

function parseM3U(text: string): { name: string; tvg: string; group: string; logo: string; url: string }[] {
  const lines = text.split('\n')
  const channels: { name: string; tvg: string; group: string; logo: string; url: string }[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF:')) {
      const info = lines[i]
      const url = (lines[i + 1] || '').trim()
      if (!url || !url.startsWith('http')) continue
      const name = (info.split(',').pop() || 'Unknown').trim()
      const tvg = info.match(/tvg-name="([^"]+)"/)?.[1] || name
      const group = (info.match(/group-title="([^"]+)"/)?.[1] || 'General').toLowerCase()
      const logo = info.match(/tvg-logo="([^"]+)"/)?.[1] || ''
      channels.push({ name, tvg, group, logo, url })
    }
  }
  return channels
}

/**
 * POST /api/admin/seed-tv-channels — seed 1200 channels from iptv-org to Neon
 * Fetches directly from iptv-org, parses M3U, saves to TvIptvChannel.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    // Check if already seeded
    const existing = await prisma.tvIptvChannel.count()
    if (existing > 0) {
      return NextResponse.json({ error: `Already seeded: ${existing} channels exist. Delete first to re-seed.` }, { status: 409 })
    }

    // Fetch from iptv-org
    console.log('[seed-tv-channels] fetching iptv-org...')
    const res = await fetch(WORLD_M3U)
    if (!res.ok) return NextResponse.json({ error: `Failed to fetch: HTTP ${res.status}` }, { status: 500 })
    const text = await res.text()

    const raw = parseM3U(text)
    console.log(`[seed-tv-channels] found ${raw.length} raw channels`)

    // Filter: free-to-air, skip adult/religion/politics, keep m3u8
    const SKIP = ['adult', 'religion', 'politics', 'xxx']
    const filtered = raw.filter((c) => {
      const g = c.group.toLowerCase()
      return !SKIP.some((s) => g.includes(s)) && c.url.includes('.m3u8')
    })

    // Dedupe by URL
    const seen = new Set<string>()
    const deduped = filtered.filter((c) => {
      if (seen.has(c.url)) return false
      seen.add(c.url)
      return true
    })

    const limited = deduped.slice(0, 1200)
    console.log(`[seed-tv-channels] seeding ${limited.length} channels...`)

    // Seed to DB
    let saved = 0
    for (const c of limited) {
      try {
        await prisma.tvIptvChannel.create({
          data: {
            name: c.name,
            url: c.url,
            logo: c.logo || null,
            category: c.group.split('/')[0] || 'General',
            country: c.url.includes('bd') ? 'bd' : 'global',
            tvgId: c.tvg || null,
            isLive: false,
          },
        })
        saved++
      } catch {
        // skip duplicates/errors
      }
    }

    console.log(`[seed-tv-channels] done: ${saved} seeded`)
    return NextResponse.json({ ok: true, seeded: saved, total: limited.length })
  } catch (err) {
    console.error('[seed-tv-channels] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR', details: (err as any)?.message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/seed-tv-channels — clear all channels (for re-seed)
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req)
    const deleted = await prisma.tvIptvChannel.deleteMany({})
    return NextResponse.json({ ok: true, deleted: deleted.count })
  } catch (err) {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
