/**
 * kv-seed-free-models.ts — refresh HOSTAMAR_CATALOG.FREE_MODELS from WSL.
 *
 * Why this lives here and not in the Worker: the free-model merge pulls ~1.25MB
 * of upstream JSON and costs 26-363ms CPU. On a Worker cache miss that exceeded
 * the CPU budget and the whole site went 1102 (Ray a47d58db1eb8db4f). So the
 * hourly refresh runs here, where there is no CPU limit, and the Worker only
 * ever does a <1ms KV read.
 *
 *   npx tsx scripts/kv-seed-free-models.ts          # fetch upstreams, write KV
 *   npx tsx scripts/kv-seed-free-models.ts --dry    # print, do not write
 *
 * Wire-up: scripts/model-router.sh (hourly). Imports the real module, so the
 * seeded list cannot drift from what the route would have computed.
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { computeFreeModels } from '../lib/free-model-router'

const KV_NAMESPACE_ID = '7ce14c69f70d48449dd50edd4be3dca3' // HOSTAMAR_CATALOG
const KEY = 'FREE_MODELS'

async function main() {
  const models = await computeFreeModels()
  if (!models.length) {
    // Upstreams down > losing the cached list: keep KV as-is and fail loudly.
    console.error('kv-seed-free-models: upstreams returned 0 models — KV untouched')
    process.exit(1)
  }
  const top = models.slice(0, 5).map(m => `${m.id} qs=${m.quality_score}`).join('; ')
  console.log(`kv-seed-free-models: ${models.length} models. Top5: ${top}`)

  if (process.argv.includes('--dry')) {
    console.log('kv-seed-free-models: --dry, not writing KV')
    return
  }

  const path = '/tmp/free-models-kv.json'
  writeFileSync(path, JSON.stringify(models))
  const env = { ...process.env }
  delete env.CLOUDFLARE_API_TOKEN // wrangler must use the OAuth session, not a scoped token
  execFileSync(
    'npx',
    ['wrangler', 'kv', 'key', 'put', KEY, '--path', path, '--namespace-id', KV_NAMESPACE_ID, '--remote'],
    { stdio: 'inherit', env }
  )
  console.log(`kv-seed-free-models: ${KEY} written (${JSON.stringify(models).length} bytes)`)
}

main().catch(e => {
  console.error('kv-seed-free-models:', e?.message || e)
  process.exit(1)
})
