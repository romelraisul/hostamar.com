/**
 * ponytail self-check for lib/queue.ts lazy-loading (the workerd hang fix).
 *
 * Run: npx tsx scripts/check-queue-lazy.ts
 *
 * Fails if lib/queue ever regains a module-load dependency on bullmq/ioredis
 * (which re-breaks every route that merely imports it), or if a queue op stops
 * failing fast on the edge.
 */
// Node exposes `navigator` as a non-writable global, so a plain assignment is a
// silent no-op — override it by descriptor to emulate the workerd runtime.
Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'Cloudflare-Workers' },
  configurable: true,
  writable: true,
})

async function main() {
  const t0 = Date.now()
  const mod: any = await import('../lib/queue')
  const importMs = Date.now() - t0

  if (importMs > 500) {
    console.error(
      `FAIL: importing lib/queue took ${importMs}ms — it is pulling bullmq/ioredis at module load again`,
    )
    process.exit(1)
  }

  const t1 = Date.now()
  try {
    await mod.getRedisConnection()
    console.error('FAIL: expected QueueUnavailableError on workerd, got a connection')
    process.exit(1)
  } catch (e: any) {
    const ms = Date.now() - t1
    if (e?.name !== 'QueueUnavailableError') {
      console.error('FAIL: wrong error →', e?.name || e)
      process.exit(1)
    }
    console.log(
      `PASS: lib/queue imported in ${importMs}ms (no bullmq/ioredis at load); workerd guard threw ${e.name} in ${ms}ms`,
    )
  }
}

main()
