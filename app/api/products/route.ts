export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { PRODUCTS } from '@/lib/products'

/**
 * GET /api/products
 * Returns the canonical 6-product catalog (lib/products.ts — single source of
 * truth used by the overview page, navbar, and /products/[slug] detail pages).
 * Local route: no proxy to api.hostamar.com.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      count: PRODUCTS.length,
      products: PRODUCTS.map((p) => ({
        slug: p.slug,
        order: p.order,
        emoji: p.emoji,
        nameBn: p.nameBn,
        nameEn: p.nameEn,
        taglineBn: p.taglineBn,
        taglineEn: p.taglineEn,
        description: p.description,
        features: p.features,
        badge: p.badge,
        status: p.status,
        ctaLabel: p.ctaLabel,
        ctaHref: p.ctaHref,
        demoUrl: p.demoUrl,
      })),
    },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } }
  )
}
