// scripts/launch/enrich-fb-manual.mjs - ESM, GROUNDED to real 10-column CSV
//
// Safe manual FB enrichment (FB ToS-safe: you export names/urls by hand, we
// never scrape FB). fb-export.txt = 1 line per shop, tab-separated:
//   <ownerName>\t<fbPageUrl>
// Lines are matched to daraz-20.csv rows IN ORDER (row 1 = header, skipped).
//
// CSV header (from db9356b):
//   shopName(0), fbPageUrl(1), darazUrl(2), topProduct(3), topProductImageUrl(4),
//   ownerName(5), emailOrFbProfile(6), painSignal(7), personalizedVideoUrl(8), loomUrl(9)

import fs from 'node:fs'

const CSV = 'working/outbound/daraz-20.csv'
const FB = 'scripts/launch/fb-export.txt'

if (!fs.existsSync(FB)) {
  console.error(`Missing ${FB} — create it manually (ownerName<TAB>fbPageUrl per line).`)
  process.exit(1)
}

const fbLines = fs.readFileSync(FB, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)
const csvLines = fs.readFileSync(CSV, 'utf8').split('\n').filter((l) => l.length)
if (csvLines.length < 2) { console.error('daraz-20.csv has no data rows.'); process.exit(1) }

const header = csvLines[0]
const out = [header]
for (let i = 1; i < csvLines.length; i++) {
  const parts = csvLines[i].split(',')
  const fb = fbLines[i - 1] // row 1 -> fbLines[0]
  if (fb) {
    const [name, url] = fb.split('\t')
    if (url) parts[1] = url.trim() // fbPageUrl
    if (name) parts[5] = name.trim() // ownerName
  }
  out.push(parts.join(','))
}

fs.writeFileSync(CSV, out.join('\n') + '\n')
console.log(`Enriched ${Math.min(fbLines.length, csvLines.length - 1)} rows with FB owner names + page urls.`)
console.log('Remaining: fill topProduct / topProductImageUrl / painSignal where blank, then record Looms.')
