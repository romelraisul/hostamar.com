// scripts/launch/scrape-daraz-shops.mjs - ESM, top-level await, GROUNDED to real repo
//
// Usage:
//   node scripts/launch/scrape-daraz-shops.mjs --input scripts/launch/daraz-shop-urls.txt --out working/outbound/daraz-20.csv
//   daraz-shop-urls.txt = up to 20 lines, each https://www.daraz.com.bd/shop/{shop-slug}
//
// GROUNDING NOTES (do not trust the unverified paste):
//   - There is NO /api/browser/render endpoint in this repo. The Browser product
//     is POST /api/browser/screenshot -> returns an IMAGE (base64), NOT html.
//     So we cannot parse product JSON from the screenshot. HTML parsing below
//     uses a direct fetch of the shop URL instead.
//   - Daraz is a JS-rendered SPA and (from this VPS IP) returns a 302 with an
//     empty body. So fetch often yields no __NEXT_DATA__. We handle that
//     HONESTLY: write the row with the URL + a painSignal TODO and leave product
//     fields blank for manual fill. We NEVER fabricate product names/images.
//   - When the fetch DOES return SSR html with __NEXT_DATA__, we parse shopName
//     + first product name + image from the embedded JSON.

import fs from 'node:fs'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    input: { type: 'string', default: 'scripts/launch/daraz-shop-urls.txt' },
    out: { type: 'string', default: 'working/outbound/daraz-20.csv' },
  },
})

const HEADER = 'shopName,fbPageUrl,darazUrl,topProduct,topProductImageUrl,ownerName,emailOrFbProfile,painSignal,personalizedVideoUrl,loomUrl'
const urls = fs.readFileSync(values.input, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#')).slice(0, 20)
if (urls.length === 0) { console.error('No URLs in', values.input); process.exit(1) }

const rows = [HEADER]
let parsed = 0

function slugToName(u) {
  const m = u.match(/shop\/([^/?#]+)/)
  return m ? decodeURIComponent(m[1]).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown Shop'
}

for (const darazUrl of urls) {
  try {
    const res = await fetch(darazUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' },
    })
    const html = await res.text().catch(() => '')
    let shopName = slugToName(darazUrl)
    let topProduct = ''
    let img = ''
    let painSignal = 'MANUAL_FILL: open shop, paste topProduct + image'

    // Try to extract from __NEXT_DATA__ JSON (best effort).
    const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (nd) {
      try {
        const data = JSON.parse(nd[1])
        const flat = JSON.stringify(data)
        const nameM = flat.match(/"shopName":"([^"]+)"/) || flat.match(/"name":"([^"]+)"/)
        if (nameM) shopName = nameM[1].slice(0, 60)
        const prodM = flat.match(/"name":"([^"]+)","?(?:price|originalPrice)/)
        if (prodM) topProduct = prodM[1].replace(/"/g, '')
        const imgM = flat.match(/"image":"(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/)
        if (imgM) img = imgM[1]
        if (topProduct) painSignal = 'boosting but no video (parsed)'
      } catch { /* keep defaults */ }
    }

    // Fallback regex on raw html (sometimes SSR includes product JSON).
    if (!topProduct) {
      const r = html.match(/"name":"([^"]+)","price"/)
      if (r) { topProduct = r[1]; painSignal = 'boosting but no video (regex)' }
    }
    if (!img) {
      const r = html.match(/<img[^>]+src="(https:\/\/[^"]+daraz[^"]+\.(?:jpg|jpeg|png))"/)
      if (r) img = r[1]
    }

    rows.push([shopName, '', darazUrl, `"${topProduct.replace(/"/g, '')}"`, img, '', '', painSignal, '', ''].join(','))
    if (topProduct) parsed++
    console.log(`${topProduct ? '✓' : '·'} ${shopName} — ${topProduct || '(manual fill)'} [${res.status}]`)
    await new Promise((r) => setTimeout(r, 1200)) // be nice, $0 infra = your IP
  } catch (e) {
    // Network/parse failure: still record the URL so nothing is lost.
    rows.push([slugToName(darazUrl), '', darazUrl, '', '', '', '', 'MANUAL_FILL: fetch failed', '', ''].join(','))
    console.error(`x ${darazUrl} ${e.message}`)
  }
}

fs.mkdirSync('working/outbound', { recursive: true })
fs.writeFileSync(values.out, rows.join('\n') + '\n')
console.log(`Wrote ${rows.length - 1} rows to ${values.out} (${parsed} auto-parsed, ${rows.length - 1 - parsed} need manual fill)`)
console.log('Next: add fb-export.txt then `node scripts/launch/enrich-fb-manual.mjs`, then fill manual topProduct/image cols.')
