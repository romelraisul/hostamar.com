#!/usr/bin/env node
/**
 * Backfill videoUrl and thumbnailUrl for existing Video records.
 *
 * Safe to run multiple times (idempotent — skips rows that already have values).
 *
 * Usage:
 *   npx tsx scripts/backfill-video-urls.ts           # dry-run (default)
 *   npx tsx scripts/backfill-video-urls.ts --apply    # write to DB
 *
 * Prerequisites:
 *   - DATABASE_URL env var or .env file with DB connection
 *   - Video thumbnails/videos exist on disk at /app/videos/ (Docker path)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = !process.argv.includes('--apply')
const VIDEO_BASE = process.env.VIDEO_BASE_URL || '/videos'

async function main() {
  const records = await prisma.video.findMany({
    where: {
      OR: [
        { url: null },
        { thumbnailUrl: null },
      ],
    },
    select: { id: true, url: true, title: true },
    orderBy: { createdAt: 'desc' },
  })

  console.log(`Found ${records.length} records missing videoUrl/thumbnailUrl\n`)

  let updated = 0
  for (const r of records) {
    // Derive filename from existing url or from id
    let filename = ''
    if (r.url && !r.url.startsWith('pending:')) {
      filename = r.url.split('/').pop() || ''
    }

    if (!filename) {
      console.log(`  SKIP  ${r.id}  no source filename (url=${r.url})`)
      continue
    }

    const stem = filename.replace(/\.mp4$/i, '')
    const videoUrl = `${VIDEO_BASE}/${stem}.mp4`
    const thumbnailUrl = `${VIDEO_BASE}/${stem}.jpg`

    console.log(`  ${DRY_RUN ? 'WOULD' : 'WILL'}  update ${r.id}`)
    console.log(`         url:          ${videoUrl}`)
    console.log(`         thumbnailUrl: ${thumbnailUrl}`)

    if (!DRY_RUN) {
      await prisma.video.update({
        where: { id: r.id },
        data: { url: videoUrl, thumbnailUrl },
      })
      updated++
    } else {
      updated++
    }
  }

  console.log(`\nDone. ${DRY_RUN ? '[DRY RUN] ' : ''}${updated} records would be updated.`)
  if (DRY_RUN) {
    console.log('Run with --apply to write changes.')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
