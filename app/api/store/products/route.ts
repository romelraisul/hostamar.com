// Catalog changes ~never (116-123 products, manual admin edits). Stale-by-5min
// at the edge is irrelevant for a 2-click buyer and removes the per-request
// cold function + bridge hop that made 2/3 prod loads take ~20s.
export const revalidate = 300
export const dynamic = 'force-dynamic' // FORGE 2026-10-18: caches.* is Workers-only; static gen crashes

// FORGE 2026-10-18: Cloudflare Workers Cache API edge cache.
// Next's fetch cache (cache:'default') doesn't persist across Worker
// isolates, so every request was a MISS and hammered Medusa ~every 1.2s.
// caches.open() is the Workers-native edge cache — same 300s TTL, zero
// Medusa hits on cache hit, survives isolate recycling.
// ponytail: catalog changes ~never; the cache is best-effort (dev/local
// without `caches` falls through to Medusa — same as the old behavior).
const CACHE_KEY = 'https://hostamar.com/api/store/products'

// ============================================================================
// GET /api/store/products — public Medusa catalog bridge (FORGE, 2026-09-14).
// /api/store/checkout needs a variant_id; until now NO public surface exposed
// Medusa variant ids + BDT prices, so no buy button could exist anywhere.
// Server-side bridge: publishable key + Medusa origin stay hidden from browser.
// Edge-cached 300s. Response: { count, products: [{id,title,variantId,amountBdt}] }
// ============================================================================

import { NextResponse } from 'next/server'

const REGION = 'reg_01M27QBX4C3XKZFWCQD47CM2EJ'

export async function GET() {
  // Edge cache: check before hitting Medusa. caches.open() is available in the
  // CF Workers runtime; in dev/Vercel Node it is undefined and throws synchronously
  // (NOT a rejected promise) so .catch can't swallow it — guard by typeof.
  const edgeCache = typeof caches !== 'undefined'
    ? await caches.open('store-products').catch(() => null)
    : null
  if (edgeCache) {
    const cached = await edgeCache.match(CACHE_KEY).catch(() => null)
    if (cached) return cached
  }

  // FORGE 2026-10-04: prod MEDUSA_URL is set but EMPTY ("") — the old
  // `fallbackBase = bridgeUrl` made both bases identical, so the
  // store.hostamar.com fallback was dead code. Fallback is now always the
  // real independent origin; empty/unset MEDUSA_URL just means no primary.
  const bridgeUrl = (process.env.MEDUSA_URL || '').trim()
  // Use workers.dev bridge as primary; store.hostamar.com as fallback for GET-only scenarios.
  const primaryBase = bridgeUrl || 'https://hostamar-medusa-bridge.romelraisul.workers.dev'
  const fallbackBase = 'https://store.hostamar.com'

  async function tryFetch(base: string) {
    const pk = process.env.MEDUSA_PK
    if (!pk) throw new Error('MEDUSA_PK not set')
    const res = await fetch(`${base}/store/products?limit=250&region_id=${REGION}&fields=id,title,variants.id,variants.calculated_price.calculated_amount`, {
      headers: { 'x-publishable-api-key': pk, 'user-agent': 'HostamarStorefront/1.0 (Vercel SSR)' },
      signal: AbortSignal.timeout(15_000),
      cache: 'default',
    })
    const data: any = await res.json().catch(() => null)
    if (!res.ok || !data) throw new Error(`catalog ${res.status}`)
    return data
  }

  // Helper: map raw Medusa products to the thin shape the storefront needs
  function mapProducts(data: any) {
    return (data.products || []).map((p: any) => {
      const v = p.variants?.[0]
      const cp = v?.calculated_price
      return {
        id: p.id,
        title: p.title,
        variantId: v?.id,
        amountBdt: Math.round(((Array.isArray(cp) ? cp[0]?.calculated_amount : cp?.calculated_amount) ?? 0) / 100),
      }
    }).filter((p: any) => p.variantId)
  }

  // Cache the response: store in edge cache, then return
  async function cacheAndReturn(data: any) {
    const products = mapProducts(data)
    const res = NextResponse.json({ count: data.count ?? products.length, products }, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600',
        'CDN-Cache-Control': 'max-age=300, stale-while-revalidate=600, stale-if-error=3600',
      }
    })
    // Fire-and-forget: store in edge cache so subsequent requests skip Medusa
    if (edgeCache) edgeCache.put(CACHE_KEY, res.clone()).catch(() => {})
    return res
  }

  try {
    const data = await tryFetch(primaryBase)
    return cacheAndReturn(data)
  } catch (e: any) {
    if (fallbackBase) {
      console.warn('[store/products] bridge failed, falling back to store.hostamar.com:', e?.message?.slice(0, 120))
      try {
        const data = await tryFetch(fallbackBase)
        return cacheAndReturn(data)
      } catch {
        return NextResponse.json({ error: 'catalog unavailable' }, { status: 502 })
      }
    }
    return NextResponse.json({ error: 'catalog unavailable' }, { status: 502 })
  }
}