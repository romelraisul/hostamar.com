#!/usr/bin/env node
/**
 * repoint-seo-contenturl.js — make every TvVideoSeo VideoObject contentUrl
 * PC-off-safe.
 *
 * The shelf (public/tv/*.mp4, git-tracked, Vercel+Cloudflare) is the ONLY
 * delivery path that survives the box being off. Any contentUrl still pointing
 * at tv.hostamar.com (the tunnel) or the live HLS is a viewer who loses the
 * video the moment this PC reboots.
 *
 * For each row: resolve the viral render on disk -> if the same file is ALSO on
 * the edge shelf, rewrite schemaJson.contentUrl to https://hostamar.com/tv/<f>.
 * Nothing is deleted; rows with no shelf copy keep their existing URL.
 */
'use strict'
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const REPO = '/home/romel/hostamar-build'
const VIRAL = path.join(REPO, 'docker/tv-station/videos/viral')
const EDGE = path.join(REPO, 'public/tv')
const SITE = 'https://hostamar.com'

function viralFile(srcId) {
  for (const s of ['_free_bn.mp4', '_viral_bn.mp4']) {
    const p = path.join(VIRAL, srcId + s)
    if (fs.existsSync(p)) return p
  }
  return null
}

function edgeFor(localPath) {
  if (!localPath) return null
  const base = path.basename(localPath)
  for (const cand of [base, base.replace('_free_bn', '').replace('_viral_bn', '')]) {
    if (fs.existsSync(path.join(EDGE, cand))) return `${SITE}/tv/${cand}`
  }
  return null
}

async function main() {
  const p = new PrismaClient()
  try {
    const rows = await p.$queryRawUnsafe(
      `SELECT id, "videoSourceId", slug, "schemaJson" FROM "TvVideoSeo"`)
    let repointed = 0, ok = 0, untouched = 0
    const report = []
    for (const r of rows) {
      const schema = (r.schemaJson || {})
      const cur = schema.contentUrl
      if (cur && cur.startsWith(SITE + '/tv/')) { ok++; continue }
      const e = edgeFor(viralFile(r.videoSourceId))
      if (!e) { untouched++; continue }
      const next = { ...schema, contentUrl: e }
      await p.$executeRawUnsafe(
        `UPDATE "TvVideoSeo" SET "schemaJson" = $1::jsonb, "updatedAt" = NOW() WHERE id = $2`,
        JSON.stringify(next), r.id)
      repointed++
      report.push(`${r.slug}: ${cur || '(none)'} -> ${e}`)
    }
    console.log(`rows=${rows.length} already-edge=${ok} repointed=${repointed} no-shelf-copy=${untouched}`)
    for (const x of report) console.log('  ' + x)
  } finally {
    await p.$disconnect()
  }
}
main().catch(e => { console.error(e); process.exit(1) })