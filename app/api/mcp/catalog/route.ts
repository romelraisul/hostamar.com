import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ensureFiverrCatalog } from '@/lib/pinned-chat'

export const runtime = 'nodejs'
// FORGE 09-15 (18:4x): was force-dynamic — same edge-strip as 6cf5412/aa4b18b:
// every hit MISS + re-ran ensureFiverrCatalog. Route was already paramless, so
// the flag was the only thing making it per-request dynamic. revalidate=3600:
// seed now runs once per ISR rebuild instead of per visitor.
export const revalidate = 3600
export const maxDuration = 60

/**
 * GET /api/mcp/catalog — V6 Phase A (read-only).
 * Plain-JSON tool endpoint exposing the deduped service catalog for external
 * agents (Kai-style MCP clients): {object:'list', total, data:[...]}.
 * No MCP SDK dependency — same data path as /api/ai-services/catalog
 * (idempotent seed + active-only read). Public via middleware '/api/mcp'.
 * Write operations (activate/chat) stay authed behind /api/ai-services/* —
 * this endpoint never mints orders or spends credits.
 */
export async function GET() {
  await ensureFiverrCatalog().catch(() => 0)
  const rows = await prisma.serviceCatalog.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, nameBn: true, category: true, categoryBn: true,
      creditCost: true, dollarRange: true, benefit: true, benefitBn: true,
      perfectFor: true, perfectForBn: true, icon: true,
    },
    orderBy: { category: 'asc' },
  })
  const ids = rows.map(r => r.id)
  const dupes = ids.length - new Set(ids).size
  return NextResponse.json(
    { object: 'list', total: rows.length, duplicateIds: dupes, data: rows },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}
