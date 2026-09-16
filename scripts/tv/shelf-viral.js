#!/usr/bin/env node
/**
 * shelf-viral.js — publish the whole viral/ render set to the edge shelf.
 *
 * docker/tv-station/videos/viral/*.mp4 are the finished Bangla-dubbed renders
 * (31 files, ~120MB total). They live only behind the Cloudflare Tunnel, so a
 * viewer needs THIS PC on. Copying them into public/tv/ makes them git-tracked
 * and edge-served at hostamar.com/tv/<slug>.mp4 — the ONLY path that survives
 * the box being off.
 *
 * Disk is 497G free; the set is 120MB. Durability rule respected: nothing is
 * deleted, every source render is untouched.
 */
'use strict'
const fs = require('fs')
const cp = require('child_process')
const path = require('path')

const REPO = '/home/romel/hostamar-build'
const VIRAL = path.join(REPO, 'docker/tv-station/videos/viral')
const EDGE = path.join(REPO, 'public/tv')

function slug(name) {
  // cmt60qu730003c4ofhqvsvt25_free_bn.mp4 -> cmt60qu730003c4ofhqvsvt25
  return name.replace(/_(free_bn|viral_bn)?\.mp4$/, '')
}

function probe(p) {
  const out = cp.spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,width,height', '-show_entries',
    'format=duration,size', '-of', 'default=noprint_wrappers=1', p],
    { encoding: 'utf8' })
  if (out.status !== 0) return null
  const d = {}
  for (const l of out.stdout.split('\n')) {
    const i = l.indexOf('=')
    if (i > 0) d[l.slice(0, i)] = l.slice(i + 1)
  }
  if (d.codec_name !== 'h264' || Number(d.width) < 480 || Number(d.duration) <= 0) return null
  return d
}

function main() {
  fs.mkdirSync(EDGE, { recursive: true })
  const files = fs.readdirSync(VIRAL).filter(f => f.endsWith('.mp4') && !f.startsWith('_tmp'))
  files.sort()
  let published = 0, skipped = 0, already = 0
  const list = []
  for (const f of files) {
    const src = path.join(VIRAL, f)
    const dst = path.join(EDGE, slug(f) + '.mp4')
    const info = probe(src)
    if (!info) { console.log(`SKIP ${f}: not a usable h264 mp4`); skipped++; continue }
    if (fs.existsSync(dst)) { already++; list.push({ f: path.basename(dst), info }); continue }
    fs.copyFileSync(src, dst)
    console.log(`PUBLISHED ${f} -> ${path.basename(dst)} (${info.width}x${info.height} ${Number(info.duration).toFixed(1)}s ${Number(info.size)}B)`)
    published++
    list.push({ f: path.basename(dst), info })
  }
  console.log(`\nshelf: published=${published} already=${already} skipped=${skipped} total=${list.length}`)
  fs.writeFileSync('/tmp/shelf-list.json', JSON.stringify(list, null, 2))
}
main()