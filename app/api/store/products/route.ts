export const dynamic = 'force-dynamic'

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
  const base = process.env.MEDUSA_URL || 'https://hostamar-medusa-bridge.romelraisul.workers' + '.dev'
  const pk = process.env.MEDUSA_PK
  if (!pk) return NextResponse.json({ error: 'not configured' }, { status: 500 })
  try {
    const res = await fetch(`${base}/store/products?limit=250&region_id=${REGION}&fields=id,title,variants.id,variants.calculated_price.calculated_amount`, {
      headers: { 'x-publishable-api-key': pk, 'user-agent': 'HostamarStorefront/1.0 (Vercel SSR)' },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })
    const data: any = await res.json().catch(() => null)
    if (!res.ok || !data) return NextResponse.json({ error: 'catalog unavailable' }, { status: 502 })
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
    return NextResponse.json({ count: data.count ?? products.length, products }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } })
  } catch {
    return NextResponse.json({ error: 'catalog unavailable' }, { status: 502 })
  }
}
