import { NextResponse } from 'next/server'
import tools from '@/lib/services-catalog-tools.json'

/**
 * GET /api/v1/tools — public catalog listing with credit costs.
 * One API for the store catalog. Derived from lib/services-catalog.json
 * (icon/name-only projection, ensure_ascii — the source file's double-escaped
 * icon strings break JSON embedding at build time). No fs, no DB.
 */
export async function GET() {
  const data = (tools as any[]).map((s) => ({
    ...s,
    endpoint: '/api/tools/run',
    pay: 'bKash 01822417463 · 1cr = 1TK',
  }))
  return NextResponse.json({ object: 'list', count: data.length, data }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}
