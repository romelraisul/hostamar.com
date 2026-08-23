/**
 * hunter_parallel.ts — Parallel audience-focused hunter (3× faster).
 *
 * Runs all 6 product hunts concurrently with p-limit 3 (camofox can handle 3
 * tabs at once before 429). Each hunt is browser_search_youtube_cc (camofox
 * REST + CC filter + yt-dlp verify). 12 videos in ~30 sec vs 90 sec sequential.
 *
 * Usage:
 *   npx tsx scripts/tv/hunter_parallel.ts --max-per-product=2 --audience-focused
 */
import { prisma } from '../../lib/prisma'
import { ensureSchema } from '../../lib/ensure-schema'
import { browser_search_youtube_cc, PRODUCT_QUERIES } from '../../lib/tv/hunter/browserTool'

async function pLimit<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < tasks.length; i += limit) {
    const chunk = tasks.slice(i, i + limit)
    const chunkResults = await Promise.all(chunk.map(fn => fn()))
    results.push(...chunkResults)
  }
  return results
}

async function main() {
  await ensureSchema()
  const args = process.argv.slice(2)
  const maxPer = parseInt(args.find(a => a.startsWith('--max-per-product='))?.split('=')[1] || '2', 10)
  const audienceFocused = args.includes('--audience-focused') // flag kept for compat, queries already audience-focused

  const products = Object.keys(PRODUCT_QUERIES)
  console.log(`Parallel hunter: ${products.length} products × ${PRODUCT_QUERIES[products[0]].length} queries, maxPer=${maxPer}, limit=3`)

  const start = Date.now()
  const tasks = products.map(product => async () => {
    // Rotate through product's queries round-robin via time bucket, same as single hunter
    const queries = PRODUCT_QUERIES[product]
    let insertedForProduct = 0
    for (const query of queries) {
      if (insertedForProduct >= maxPer) break
      try {
        const r = await browser_search_youtube_cc(product, query, { maxInsert: 1 })
        if (r.inserted > 0) {
          insertedForProduct += r.inserted
          console.log(`  ✓ [${product}] "${query.slice(0,40)}" → ${r.candidates?.[0]?.title?.slice(0,50)}`)
        } else {
          console.log(`  · [${product}] "${query.slice(0,40)}" → no CC found`)
        }
      } catch (e: any) {
        console.warn(`  ✗ [${product}] ${e?.message?.slice(0,80)}`)
      }
      if (insertedForProduct >= maxPer) break
    }
    return insertedForProduct
  })

  const results = await pLimit(tasks, 3)
  const total = results.reduce((a, b) => a + b, 0)
  const sec = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\nDONE: ${total} CC videos in ${sec}s (parallel 3)`)
  console.log(JSON.stringify({ inserted: total, perProduct: Object.fromEntries(products.map((p, i) => [p, results[i]])) }))
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
