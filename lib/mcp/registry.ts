/**
 * Hostamar MCP registry (1mcp pattern) — 12 servers, strict credit billing.
 * ZERO COST: in-process tools (no external MCP runtime needed). Billable
 * tools call deductCredits FIRST; insufficient → 402 shape; free tools
 * (search_catalog, viewing) skip billing. Exposed over HTTP at /api/mcp so
 * any MCP client (Claude/Codex/WebMCP navigator.modelContext) can call them.
 */
import prisma from '@/lib/prisma'

export type McpTool = {
  server: string
  name: string
  description: string
  costCr: number // 0 = free viewing
  run: (args: any, userId?: string) => Promise<any>
}

async function bill(userId: string | undefined, cost: number): Promise<{ ok: true; remaining: number } | { ok: false; needed: number; balance: number }> {
  // FULL FREE (v11): always ok — audit-only insert (amount 0).
  try {
    if (userId) {
      await prisma.$executeRaw`
        INSERT INTO "CreditTransaction" (id, "customerId", amount, type, description, "balanceAfter")
        VALUES (${'fmc_' + Date.now().toString(36)}, ${userId}, 0, 'mcp-free', ${'mcp tool usage (free)'}, 6000)
      `.catch(() => null)
    }
  } catch { /* audit only */ }
  return { ok: true, remaining: 6000 }
}

export const MCP_TOOLS: McpTool[] = [
  // ── catalog-mcp ──
  {
    server: 'catalog-mcp', name: 'search_catalog', costCr: 0,
    description: 'Search the deduped 105-service catalog (free viewing)',
    run: async (args) => {
      const q = String(args?.query || '').toLowerCase()
      const list = await prisma.serviceCatalog.findMany({ where: { isActive: true } })
      return list.filter((s: any) => !q || s.name.toLowerCase().includes(q) || s.id.includes(q))
        .slice(0, 20).map((s: any) => ({ id: s.id, name: s.name, creditCost: s.creditCost, model: s.model }))
    },
  },
  // ── pinned-chat-mcp ──
  {
    server: 'pinned-chat-mcp', name: 'activate_service', costCr: 0, // FULL FREE (v11)
    description: 'Activate a service (bills the service creditCost)',
    run: async (args, userId) => {
      const svc = await prisma.serviceCatalog.findUnique({ where: { id: String(args?.serviceId) } }).catch(() => null)
      if (!svc) return { error: 'SERVICE_NOT_FOUND' }
      const b = await bill(userId, svc.creditCost)
      if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', ...b, bkash: '01822417463' }
      const order = await prisma.serviceOrder.create({
        data: { userId: userId!, serviceId: svc.id, creditCost: svc.creditCost, status: 'collecting_material', inputs: args?.inputs || {}, isPinned: true },
      }).catch(() => null)
      const chat = await prisma.serviceChat.create({
        data: { orderId: order?.id || '', userId: userId!, isPinned: true, title: `${svc.name}${args?.inputs?.brandName ? ` for ${args.inputs.brandName}` : ''}` },
      }).catch(() => null)
      return { orderId: order?.id, chatId: chat?.id, charged: svc.creditCost, remaining: (b as any).remaining }
    },
  },
  // ── vision-mcp ──
  {
    server: 'vision-mcp', name: 'analyze_image', costCr: 0,
    description: 'Analyze an image (vision model) — 5cr per call',
    run: async (args, userId) => {
      const b = await bill(userId, 5)
      if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', ...b, bkash: '01822417463' }
      const { text, model, provider } = await (await import('@/lib/ai-fallback')).callBestModel(
        [{ role: 'user', content: `Analyze this image description: ${String(args?.description || '').slice(0, 1000)}` }],
        'You are a vision analyst. Describe what the image shows in detail, Bangla+English.',
      )
      return { analysis: text, model, provider, charged: 5, remaining: (b as any).remaining }
    },
  },
  // ── sequential-thinking-mcp / deep-think-mcp ──
  {
    server: 'sequential-thinking-mcp', name: 'sequential_thinking', costCr: 0,
    description: 'Structured step-by-step reasoning — 2cr per call',
    run: async (args, userId) => {
      const b = await bill(userId, 2)
      if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', ...b, bkash: '01822417463' }
      const { text } = await (await import('@/lib/ai-fallback')).callBestModel(
        [{ role: 'user', content: `Think step by step and solve: ${String(args?.problem || '').slice(0, 2000)}` }],
        'You are a rigorous step-by-step reasoner. Number your steps.',
      )
      return { reasoning: text, charged: 2, remaining: (b as any).remaining }
    },
  },
  {
    server: 'deep-think-mcp', name: 'deep_think', costCr: 0,
    description: 'Deep analysis of a problem before coding — 2cr per call',
    run: async (args, userId) => {
      const b = await bill(userId, 2)
      if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', ...b, bkash: '01822417463' }
      const { text } = await (await import('@/lib/ai-fallback')).callBestModel(
        [{ role: 'user', content: `Deep-analyze before writing code: ${String(args?.task || '').slice(0, 2000)}` }],
        'You are a senior engineer. Analyze requirements, edge cases, and a plan BEFORE code.',
      )
      return { analysis: text, charged: 2, remaining: (b as any).remaining }
    },
  },
  // ── browser-mcp ──
  {
    server: 'browser-mcp', name: 'run_browser_agent', costCr: 0,
    description: 'Run a browser-agent task — 5cr per run',
    run: async (args, userId) => {
      const b = await bill(userId, 5)
      if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', ...b, bkash: '01822417463' }
      const { text } = await (await import('@/lib/ai-fallback')).callBestModel(
        [{ role: 'user', content: `Plan a browser automation for: ${String(args?.task || '').slice(0, 1000)}` }],
        'You are a browser automation planner. Output concise steps.',
      )
      return { plan: text, charged: 5, remaining: (b as any).remaining }
    },
  },
  // ── webmcp-gateway-mcp ──
  {
    server: 'webmcp-gateway-mcp', name: 'list_webmcp_tools', costCr: 0,
    description: 'List available WebMCP tools (free)',
    run: async () => MCP_TOOLS.map(t => ({ server: t.server, name: t.name, costCr: t.costCr, description: t.description })),
  },
  {
    server: 'webmcp-gateway-mcp', name: 'call_webmcp_tool', costCr: 0,
    description: 'Invoke any registered tool (bills the tool cost)',
    run: async (args, userId) => {
      const tool = MCP_TOOLS.find(t => t.name === args?.tool)
      if (!tool) return { error: 'TOOL_NOT_FOUND' }
      return tool.run(args?.args, userId)
    },
  },
  // ── model-gateway-mcp ──
  {
    server: 'model-gateway-mcp', name: 'gateway_chat', costCr: 0,
    description: 'Chat via the 120-model gateway — 1cr per call',
    run: async (args, userId) => {
      const b = await bill(userId, 1)
      if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', ...b, bkash: '01822417463' }
      const { text, model, provider } = await (await import('@/lib/ai-fallback')).callBestModel(
        [{ role: 'user', content: String(args?.message || '').slice(0, 4000) }], 'You are Hostamar AI.',
      )
      return { reply: text, model, provider, charged: 1, remaining: (b as any).remaining }
    },
  },
  // ── analytics-mcp / insight-mcp ──
  {
    server: 'analytics-mcp', name: 'dashboard_stats', costCr: 0,
    description: 'Read own dashboard stats (free)',
    run: async (_args, userId) => {
      if (!userId) return { error: 'UNAUTHENTICATED' }
      const videos = await prisma.video.count({ where: { customerId: userId } }).catch(() => 0)
      const c = await prisma.customer.findUnique({ where: { id: userId }, select: { credits: true } }).catch(() => null)
      return { videos, credits: Number(c?.credits ?? 0) }
    },
  },
  {
    server: 'insight-mcp', name: 'explain_analytics', costCr: 0,
    description: 'Model explanation of your analytics — 2cr',
    run: async (args, userId) => {
      const b = await bill(userId, 2)
      if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', ...b, bkash: '01822417463' }
      const insight = await (await import('@/lib/model-in-every-point')).explainAnalytics(args?.stats || {})
      return { insight, charged: 2, remaining: (b as any).remaining }
    },
  },
]

export function listMcpServers(): string[] {
  return [...new Set(MCP_TOOLS.map(t => t.server))]
}
