export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * GET /api/tv/credits (public)
 * Attribution for CC0/Public-Domain videos currently in the pure library.
 * Reads attribution.json written by scripts/tv/burn_still_ads.py.
 */
export async function GET() {
  try {
    const p = path.join(process.cwd(), 'docker/tv-station/videos/pure/attribution.json')
    let items: unknown[] = []
    try {
      items = JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch {
      items = []
    }
    return NextResponse.json({
      ok: true,
      count: items.length,
      licenseNote:
        'All clips are CC0 / Public Domain (Blender films CC-BY, credited). Still ad text burned per product.',
      items,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'CREDITS_ERROR' }, { status: 500 })
  }
}
