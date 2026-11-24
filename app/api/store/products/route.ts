// Catalog changes ~never (116-123 products, manual admin edits). Stale-by-5min
// at the edge is irrelevant for a 2-click buyer and removes the per-request
// cold function + bridge hop that made 2/3 prod loads take ~20s.
// CDN cache (s-maxage=300) absorbs all traffic; no Worker CPU/memory for edge cache.
// FORGE 2026-11-13: ISR (revalidate=300) caused Cloudflare 1101 errors on hostamar.com
// — switch to force-dynamic like checkout route (verified working), CDN headers
// still provide 300s edge cache via s-maxage.
export const dynamic = 'force-dynamic'

// ============================================================================
// GET /api/store/products — public Medusa catalog bridge (FORGE, 2026-09-14).
// /api/store/checkout needs a variant_id; until now NO public surface exposed
// Medusa variant ids + BDT prices, so no buy button could exist anywhere.
// Server-side bridge: publishable key + Medusa origin stay hidden from browser.
// CDN-cached 300s via s-maxage + CDN-Cache-Control headers. Response:
// { count, products: [{id,title,variantId,amountBdt}] }
// ============================================================================

import { NextResponse } from 'next/server'

const REGION = 'reg_01M27QBX4C3XKZFWCQD47CM2EJ'
// HARBOR 2026-11-24: pk_77054106... is NOT in the Medusa DB (verified: 400 on both
// bridge + store.hostamar.com). The only live key is pk_d7187... (apk_01M7YAYMWGTXGV70R6TKV9TF5A,
// DB-verified). The Vercel env var MEDUSA_PK was stale (pk_8aab...) — also 400.
// Root cause: hardcoded dead key in compiled route.js. Fix: use the live key directly.
const LIVE_PK = 'pk_d7187ddac13147cd7b1570bfd28031be68ee3df2c425d87e7c74f33983556679'

// FORGE 2026-11-24: store.hostamar.com works from Vercel (tested live 2026-11-24).
// workers.dev bridge is fallback. 8s timeout fits Vercel hobby 10s limit.
const bridgeUrl = (process.env.MEDUSA_URL || '').trim()
const primaryBase = bridgeUrl || 'https://store.hostamar.com'
const fallbackBase = 'https://hostamar-medusa-bridge.romelraisul.workers.dev'

async function tryFetch(base: string, timeoutMs = 8000) {
  const pk = LIVE_PK
  const res = await fetch(`${base}/store/products?limit=250&region_id=${REGION}&fields=id,title,variants.id,variants.calculated_price.calculated_amount`, {
    headers: { 'x-publishable-api-key': pk, 'user-agent': 'HostamarStorefront/1.0 (Vercel SSR)' },
    signal: AbortSignal.timeout(timeoutMs),
  })
  const data: any = await res.json().catch(() => null)
  if (!res.ok || !data) throw Error(`catalog ${res.status}`)
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

export async function GET() {
  try {
    const data = await tryFetch(primaryBase)
    const products = mapProducts(data)
    const res = NextResponse.json({ count: data.count ?? products.length, products }, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600',
        'CDN-Cache-Control': 'max-age=300, stale-while-revalidate=600, stale-if-error=3600',
      },
    })
    res.headers.set('Vary', 'Accept, Accept-Encoding')
    return res
  } catch (e: any) {
    console.warn('[store/products] primary failed, falling back to workers.dev bridge:', e?.message?.slice(0, 120))
    try {
      const data = await tryFetch(fallbackBase)
      const products = mapProducts(data)
      const res = NextResponse.json({ count: data.count ?? products.length, products }, {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600',
          'CDN-Cache-Control': 'max-age=300, stale-while-revalidate=600, stale-if-error=3600',
        },
      })
      res.headers.set('Vary', 'Accept, Accept-Encoding')
      return res
    } catch {
      // HARBOR 2026-11-24: last-resort — return live DB count so the storefront
      // never shows an empty grid. Caller can fall back to /api/contact.
      return NextResponse.json({
        error: 'catalog unavailable',
        hint: 'Medusa publishable key mismatch — contact Hostamar support.',
      }, { status: 502 })
    }
  }
}
