/**
 * catalog-kv.ts — HOSTAMAR_CATALOG access from inside a Worker request.
 *
 * Same account KV the ai-gateway worker populates (MODEL_CATALOG / binance_rate),
 * bound in wrangler-pages.toml as HOSTAMAR_CATALOG. Used to take a per-request
 * CPU spike off the Worker: reading KV is <1ms, while re-deriving a catalog from
 * upstream JSON cost 26-363ms and killed the isolate as
 * "1102 Worker exceeded resource limits" (Ray a47d58db1eb8db4f).
 *
 * Returns null when there is no Worker context (next build, Vercel, node scripts,
 * next dev without initOpenNextCloudflareForDev) — callers MUST keep their compute
 * fallback, never assume KV exists.
 */
type KvNamespace = {
  get(key: string, type?: 'text' | 'json'): Promise<unknown>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<unknown>
}

export type CatalogKv = {
  kv: KvNamespace
  /** Run a post-response task (the populate-on-miss KV write). Never throws. */
  waitUntil: (p: Promise<unknown>) => void
}

export async function catalogKv(): Promise<CatalogKv | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    let ctx: any = getCloudflareContext()
    // 1.20.x returns the context synchronously; older/other call styles return a promise.
    if (ctx && typeof ctx.then === 'function') ctx = await ctx
    const kv = ctx?.env?.HOSTAMAR_CATALOG as KvNamespace | undefined
    if (!kv) return null
    return {
      kv,
      waitUntil: (p: Promise<unknown>) => {
        // Attach the catch first: an unhandled KV rejection must never surface as a
        // route error, and ctx.waitUntil keeps it alive past the response.
        const safe = Promise.resolve(p).catch(() => {})
        try {
          if (ctx?.ctx?.waitUntil) ctx.ctx.waitUntil(safe)
        } catch {
          /* no request ctx (dev) — the bare promise is enough */
        }
      },
    }
  } catch {
    return null
  }
}
