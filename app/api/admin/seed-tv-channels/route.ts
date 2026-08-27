export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import fs from 'fs'

/**
 * POST /api/admin/seed-tv-channels — seed 1200 channels from channels-fetched.json to Neon
 * This is a one-time seed endpoint. Remove after use.
 */
export async function POST(req: NextRequest) {
  try {
    // Read the local channels file
    const raw = fs.readFileSync('data/channels-fetched.json', 'utf-8')
    const channels = JSON.parse(raw)

    if (!channels.length) {
      return NextResponse.json({ error: 'No channels found in channels-fetched.json' }, { status: 400 })
    }

    // Check if already seeded
    const existing = await prisma.tvIptvChannel.count()
    if (existing > 0) {
      return NextResponse.json({ error: `Already seeded: ${existing} channels exist. Delete first to re-seed.` }, { status: 409 })
    }

    // Seed channels
    let saved = 0
    for (const c of channels) {
      try {
        await prisma.tvIptvChannel.create({
          data: {
            name: c.name,
            url: c.url,
            logo: c.logo || null,
            category: c.group?.split('/')[0] || 'General',
            country: c.country || (c.url.includes('bd') ? 'bd' : 'global'),
            tvgId: c.tvg || null,
            isLive: false,
          },
        })
        saved++
      } catch (e) {
        console.warn(`  skip ${c.name}: ${(e as any)?.message?.slice(0, 60)}`)
      }
    }

    return NextResponse.json({ ok: true, seeded: saved, total: channels.length })
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
    const deleted = await prisma.tvIptvChannel.deleteMany({})
    return NextResponse.json({ ok: true, deleted: deleted.count })
  } catch (err) {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
