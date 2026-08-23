/**
 * hunt_tool.ts — CLI runner for the browser_search_youtube_cc tool.
 * Prints JSON: { ok, product, query, inserted, candidates[] }
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/tv/hunt_tool.ts --product Video [--query "..."] [--max 1]
 */
import { prisma } from '../../lib/prisma'
import { ensureSchema } from '../../lib/ensure-schema'
import { browser_search_youtube_cc, PRODUCT_QUERIES } from '../../lib/tv/hunter/browserTool'

async function main() {
  await ensureSchema()
  const args = process.argv.slice(2)
  const product = args.find(a => a.startsWith('--product='))?.split('=')[1] || ''
  const queryArg = args.find(a => a.startsWith('--query='))?.split('=')[1]
  const max = parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1] || '1', 10)

  if (!PRODUCT_QUERIES[product]) {
    console.error(JSON.stringify({ ok: false, error: `unknown product ${product}` }))
    process.exit(2)
  }
  const query = queryArg || PRODUCT_QUERIES[product][Math.floor(Date.now() / 60000) % PRODUCT_QUERIES[product].length]
  const result = await browser_search_youtube_cc(product, query, { maxInsert: max })
  console.log(JSON.stringify(result))
  await prisma.$disconnect()
  process.exit(result.ok && result.inserted > 0 ? 0 : 1)
}

main().catch(e => { console.error(JSON.stringify({ ok: false, error: String(e).slice(0, 200) })); process.exit(1) })
