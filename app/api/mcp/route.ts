export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { MCP_TOOLS, listMcpServers } from '@/lib/mcp/registry'

/**
 * MCP over HTTP (1mcp pattern) — zero cost.
 * GET  /api/mcp → server + tool manifest (free)
 * POST /api/mcp → { tool, args } — bills credits per tool cost;
 *                 insufficient → 402 + bKash 01822417463.
 * WebMCP clients can register these via navigator.modelContext.
 */
export async function GET() {
  return NextResponse.json({
    servers: listMcpServers(),
    tools: MCP_TOOLS.map(t => ({ server: t.server, name: t.name, costCr: t.costCr, description: t.description })),
    billing: 'every billable tool deducts credits — only viewing/search is free',
  })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const userId = user?.id
  const body = await req.json().catch(() => ({}))
  const tool = MCP_TOOLS.find(t => t.name === body?.tool)
  if (!tool) return NextResponse.json({ error: 'TOOL_NOT_FOUND', available: MCP_TOOLS.map(t => t.name) }, { status: 404 })
  if (tool.costCr !== 0 && !userId) {
    return NextResponse.json({ error: 'Unauthorized (billable tool)' }, { status: 401 })
  }
  const result = await tool.run(body?.args, userId)
  if (result && (result as any).error === 'INSUFFICIENT_CREDITS') {
    return NextResponse.json({ ...result, bkash: '01822417463', topUp: '/dashboard/payment' }, { status: 402 })
  }
  return NextResponse.json({ success: true, tool: tool.name, result })
}
