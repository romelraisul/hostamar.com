
export const runtime = 'edge'

// Catalog changes ~never (116-123 products, manual admin edits). Stale-by-5min
// at the edge is irrelevant for a 2-click buyer and removes the per-request
// cold function + bridge hop that made 2/3 prod loads take ~20s.
export const revalidate = 300

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
  const pk = process.env.MEDUSA_PK
  if (!pk) return NextResponse.json({ error: 'not configured' }, { status: 500 })

  // FORGE 2026-09-26: MEDUSA_URL points to broken CF Workers bridge (exit -1).
  // store.hostamar.com is the actual Medusa storefront and works.
  // Prefer store.hostamar.com as primary; bridge only as fallback.
  const bridgeUrl = process.env.MEDUSA_URL
  const primaryBase = 'https://store.hostamar.com'
  const fallbackBase = bridgeUrl

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

  try {
    const data = await tryFetch(primaryBase)
    const products = (data.products || [])
      .map((p: any) => {
        const v = p.variants?.[0]
        const cp = v?.calculated_price
        return {
          id: p.id,
          title: p.title,
          variantId: v?.id,
          amountBdt: Math.round(((Array.isArray(cp) ? cp[0]?.calculated_amount : cp?.calculated_amount) ?? 0) / 100),
        }
      })
      .filter((p: any) => p.variantId)
    return NextResponse.json({ count: data.count ?? products.length, products }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600' } })
  } catch (e: any) {
    if (fallbackBase) {
      console.warn('[store/products] bridge failed, falling back to store.hostamar.com:', e?.message?.slice(0, 120))
      try {
        const data = await tryFetch(fallbackBase)
        const products = (data.products || [])
          .map((p: any) => {
            const v = p.variants?.[0]
            const cp = v?.calculated_price
            return {
              id: p.id,
              title: p.title,
              variantId: v?.id,
              amountBdt: Math.round(((Array.isArray(cp) ? cp[0]?.calculated_amount : cp?.calculated_amount) ?? 0) / 100),
            }
          })
          .filter((p: any) => p.variantId)
        return NextResponse.json({ count: data.count ?? products.length, products }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600' } })
      } catch {
        return NextResponse.json({ error: 'catalog unavailable' }, { status: 502 })
      }
    }
    return NextResponse.json({ error: 'catalog unavailable' }, { status: 502 })
  }
}
