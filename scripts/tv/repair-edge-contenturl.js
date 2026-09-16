#!/usr/bin/env node
/**
 * repair-edge-contenturl.js — 2026-09-16 shift fix.
 *
 * The 2026-09-16 safety commits (c2802b5, 098f227) removed third-party cmt*.mp4
 * from the git-tracked edge shelf (they still sit on disk but Vercel only ships
 * tracked files, so hostamar.com/tv/cmt*.mp4 -> 404). 31 TvVideoSeo rows still
 * pointed schemaJson.contentUrl at those now-missing edge files, so their
 * /tv/watch/<slug> pages loaded a 404 mp4 instead of degrading to the live HLS.
 *
 * Fix: repoint those rows at the live HLS URL. The watch page only uses
 * contentUrl as a direct mp4 when it matches \.mp4; an HLS URL makes mp4Url=null
 * and WatchPlayer falls back to the live stream — graceful, PC-on, and honest
 * (the third-party footage is retired; we do NOT present it as our content).
 * Rows whose edge file still exists are untouched.
 */
'use strict'
const { PrismaClient } = require('@prisma/client')

const REPO = '/home/romel/hostamar-build'
const HLS = 'https://tv.hostamar.com/master.m3u8'

// Vercel only ships git-tracked files, so disk presence is NOT the test —
// a file can sit on disk but 404 at hostamar.com/tv/ (the 098f227 safety
// commits gitignored all cmt*.mp4). Check the actual shipping surface.
function onShelf(file) {
  try {
    const out = require('child_process')
      .execSync(`git -C ${REPO} ls-files --error-unmatch public/tv/${file}`,
        { stdio: 'pipe', timeout: 10000 }).toString().trim()
    return out === `public/tv/${file}`
  } catch { return false }
}

async function main() {
  const p = new PrismaClient()
  try {
    const rows = await p.$queryRawUnsafe(
      `SELECT id, slug, "schemaJson" FROM "TvVideoSeo"`)
    let fixed = 0, ok = 0
    const report = []
    for (const r of rows) {
      const schema = r.schemaJson || {}
      const cur = schema.contentUrl || ''
      if (!cur) { ok++; continue }
      const m = cur.match(/\/tv\/([^?/]+\.mp4)$/)
      if (!m) { ok++; continue }          // not an edge mp4 claim (e.g. HLS/pc url)
      if (onShelf(m[1])) { ok++; continue } // still on shelf
      const next = { ...schema, contentUrl: HLS, description: schema.description || '' }
      await p.$executeRawUnsafe(
        `UPDATE "TvVideoSeo" SET "schemaJson" = $1::jsonb, "updatedAt" = NOW() WHERE id = $2`,
        JSON.stringify(next), r.id)
      fixed++
      report.push(`${r.slug}: ${cur} -> ${HLS}`)
    }
    console.log(`rows=${rows.length} still-on-shelf=${ok} repointed-to-HLS=${fixed}`)
    for (const x of report) console.log('  ' + x)
  } finally {
    await p.$disconnect()
  }
}
main().catch(e => { console.error(e); process.exit(1) })