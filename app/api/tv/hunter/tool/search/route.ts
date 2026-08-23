import { NextResponse } from 'next/server'
import { browser_search_youtube_cc, PRODUCT_QUERIES } from '@/lib/tv/hunter/browserTool'
import { ensureSchema } from '@/lib/ensure-schema'

export const maxDuration = 300

/**
 * POST /api/tv/hunter/tool/search
 * Body: { product: string, query?: string }
 *  - product required (Video|Hosting|Chat|Browser|IDE|Gaming)
 *  - query optional → cycles that product's query list round-robin
 * The AI-facing tool shape:
 *   browser_search_youtube_cc({ product, query }) → FreeVideoSource candidates
 */
export async function POST(req: Request) {
  try {
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    const product = String(body.product || '')
    if (!PRODUCT_QUERIES[product]) {
      return NextResponse.json({ ok: false, error: `product must be one of ${Object.keys(PRODUCT_QUERIES).join('|')}` }, { status: 400 })
    }

    let query = body.query ? String(body.query) : undefined
    if (!query) {
      // pick the product's least-used query (simple round-robin by existing rows count is
      // overkill; rotate deterministically by time so consecutive calls vary)
      const list = PRODUCT_QUERIES[product]
      const idx = Math.floor(Date.now() / 60000) % list.length
      query = list[idx]
    }

    const result = await browser_search_youtube_cc(product, query)
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message?.slice(0, 200) }, { status: 500 })
  }
}
