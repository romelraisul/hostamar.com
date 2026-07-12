export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { kilo } from '@/lib/kilo-client'

// tRPC v11 payloads for the four analytics procedures. They're loose here
// intentionally — kilo.ai's spec is permissive and we want to relay
// whatever shape they return without losing fields.
type AnyRecord = Record<string, unknown>

export async function GET(_req: NextRequest, ctx: { params: Promise<{ procedure?: string[] }> }) {
  try {
    await requireAdmin(_req)
  } catch (e: any) {
    const status = e?.cause?.status || 401
    return NextResponse.json({ error: e?.message || 'Unauthorized' }, { status })
  }

  if (!kilo.isConfigured()) {
    return NextResponse.json({
      success: false,
      configured: false,
      error: 'KILO_API_TOKEN not set on the server',
    }, { status: 503 })
  }

  const { procedure = [] } = await ctx.params
  const [name, ...rest] = procedure
  if (!name) {
    // Default: return all four procedures summarized.
    const [summary, breakdown, table, timeseries] = await Promise.all([
      kilo.getSummary<AnyRecord>(),
      kilo.getBreakdown<AnyRecord>(),
      kilo.getTable<AnyRecord>(),
      kilo.getTimeseries<AnyRecord>(),
    ])
    return NextResponse.json({
      success: true,
      configured: true,
      base: kilo.base(),
      procedure: 'all',
      scope: ['getSummary', 'getBreakdown', 'getTable', 'getTimeseries'],
      results: { summary, breakdown, table, timeseries },
    })
  }

  // Specific procedure: GET /api/admin/billing/kilo/getSummary?input={...}
  const allowed = new Set(['getSummary', 'getTimeseries', 'getBreakdown', 'getTable'])
  if (!allowed.has(name)) {
    return NextResponse.json({ error: 'Unknown procedure', allowed: [...allowed] }, { status: 400 })
  }

  let input: AnyRecord | null = null
  const url = new URL(_req.url)
  const inputParam = url.searchParams.get('input')
  if (inputParam) {
    try {
      const parsed = JSON.parse(inputParam)
      const json = (parsed && typeof parsed === 'object' && 'json' in parsed) ? parsed.json : parsed
      if (json !== null && typeof json !== 'object') {
        return NextResponse.json({ error: 'input must be a JSON object' }, { status: 400 })
      }
      input = (json as AnyRecord | null) ?? null
    } catch (e: any) {
      return NextResponse.json({ error: `bad input JSON: ${e?.message || 'parse'}` }, { status: 400 })
    }
  }

  const fn = kilo[name as 'getSummary' | 'getTimeseries' | 'getBreakdown' | 'getTable']
  const result = await fn(input)
  if (!result.ok) {
    const status = result.retryable ? 503 : (result.status === 401 || result.status === 403 ? 502 : 502)
    return NextResponse.json({
      success: false,
      configured: true,
      procedure: name,
      status: result.status,
      error: result.error?.slice(0, 600),
      retryable: result.retryable,
    }, { status })
  }

  // REST-ish shape: let callers chain /breakdown/foo?input=... etc.
  // (We still accept the trailing path param `rest` to allow future
  // sub-resources, but it's unused for these 4 analytics endpoints.)
  void rest
  return NextResponse.json({
    success: true,
    configured: true,
    base: kilo.base(),
    procedure: name,
    data: result.data,
  })
}