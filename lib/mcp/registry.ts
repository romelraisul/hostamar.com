/**
 * Hostamar MCP registry (1mcp pattern) — 12 servers, strict credit billing.
 * ZERO COST: in-process tools (no external MCP runtime needed). Billable
 * tools call deductCredits FIRST; insufficient → 402 shape; free tools
 * (search_catalog, viewing) skip billing. Exposed over HTTP at /api/mcp so
 * any MCP client (Claude/Codex/WebMCP navigator.modelContext) can call them.
 */
import prisma from '@/lib/prisma'
import { facebook_create_post, facebook_get_page_insights, facebook_get_posts, facebook_reply_comment, facebook_create_ad, facebook_get_ad_insights, instagram_create_post, facebook_get_messages, facebook_post_reel, facebook_schedule_post } from './facebook-mcp'

export type McpTool = {
  server: string
  name: string
  description: string
  costCr: number // 0 = free viewing; real billing follow-up TBD (today: audit-insert + free)
  run: (args: any, userId?: string) => Promise<any>
}

async function bill(userId: string | undefined, cost: number): Promise<{ ok: true; remaining: number } | { ok: false; needed: number; balance: number }> {
  // V20 REAL DEDUCTION: race-safe UPDATE guarded by balance; authed users pay,
  // anonymous/system callers (cron, public viewing) stay free. 1cr = 1TK = 1COIN.
  if (!userId || cost === 0) return { ok: true, remaining: -1 }
  try {
    const c = await prisma.customer.findUnique({ where: { id: userId }, select: { credits: true } }).catch(() => null)
    const bal = Number(c?.credits ?? 0)
    if (bal < cost) return { ok: false, needed: cost, balance: bal }
    const dec: any = await prisma.$executeRaw`UPDATE "Customer" SET credits = credits - ${cost} WHERE id = ${userId} AND credits >= ${cost}`
    if (Number(dec) === 0) return { ok: false, needed: cost, balance: bal }
    const after: any = await prisma.$queryRaw<any[]>`SELECT credits FROM "Customer" WHERE id = ${userId} LIMIT 1`
    const remaining = Number(after?.[0]?.credits ?? 0)
    await prisma.$executeRaw`
      INSERT INTO "CreditTransaction" (id, "customerId", amount, type, description, "balanceAfter")
      VALUES (${'reg_' + Date.now().toString(36)}, ${userId}, ${-cost}, 'mcp', ${'mcp tool usage (paid)'}, ${remaining})
    `.catch(() => null)
    return { ok: true, remaining }
  } catch { return { ok: true, remaining: -1 } } // DB unavailable: allow (audit row lost, not a customer outage)
}

export const MCP_TOOLS: McpTool[] = [
  // ── catalog-mcp ──
  {
    server: 'catalog-mcp', name: 'search_catalog', costCr: 0,
    description: 'Search the deduped 106-service catalog (free viewing)',
    run: async (args) => {
      const q = String(args?.query || '').toLowerCase()
      const list = await prisma.serviceCatalog.findMany({ where: { isActive: true } })
      return list.filter((s: any) => !q || s.name.toLowerCase().includes(q) || s.id.includes(q))
        .slice(0, 20).map((s: any) => ({ id: s.id, name: s.name, creditCost: s.creditCost, model: s.model }))
    },
  },
  // ── pinned-chat-mcp ──
  {
    server: 'pinned-chat-mcp', name: 'activate_service', costCr: 0, // bills the service creditCost internally
    description: 'Activate a service — bills the service creditCost',
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
    server: 'vision-mcp', name: 'analyze_image', costCr: 5,
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
  // ── sequential-thinking-mcp ──
  {
    server: 'sequential-thinking-mcp', name: 'sequential_thinking', costCr: 2,
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
  // ── deep-think-mcp ──
  {
    server: 'deep-think-mcp', name: 'deep_think', costCr: 2,
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
    server: 'browser-mcp', name: 'run_browser_agent', costCr: 5,
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
    description: 'List available MCP tools (free)',
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
    server: 'model-gateway-mcp', name: 'gateway_chat', costCr: 1,
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
  // ── facebook-mcp ──
  // Facebook Graph API v18.0 social-marketing tools.
  // Env: FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID, FACEBOOK_AD_ACCOUNT_ID, FACEBOOK_IG_USER_ID
  // Real posting requires a long-lived Page token with pages_manage_posts,
  // pages_read_engagement, pages_show_list, instagram_content_publish (IG),
  // ads_management + ads_read (ads). Without tokens, tools return UNAUTHENTICATED.
  //
  // Today: costCr = 0 because the real billing follow-up isn't wired yet.
  // TODOs: move the per-tool charge out of the tool body into `bill()` at the
  // registry wrapper and make `bill()` actually deduct (not just audit-insert 0).
  {
    server: 'facebook-mcp', name: 'facebook_create_post', costCr: 2,
    description: 'Create a post to a Facebook Page — 1cr (real billing TBD)',
    run: async (args, userId) => {
      const r = await facebook_create_post(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'facebook-mcp', name: 'facebook_get_page_insights', costCr: 1,
    description: 'Page insights (page_views, engaged users, impressions) — 2cr (real billing TBD)',
    run: async (args, userId) => {
      const r = await facebook_get_page_insights(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'facebook-mcp', name: 'facebook_get_posts', costCr: 1,
    description: 'List recent posts from a Page — 2cr (real billing TBD)',
    run: async (args, userId) => {
      const r = await facebook_get_posts(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'facebook-mcp', name: 'facebook_reply_comment', costCr: 1,
    description: 'Reply to a comment on a Page post — 1cr (real billing TBD)',
    run: async (args, userId) => {
      const r = await facebook_reply_comment(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'facebook-mcp', name: 'facebook_create_ad', costCr: 10,
    description: 'Create a FB ad (campaign → ad set → ad) — 5cr (real billing TBD)',
    run: async (args, userId) => {
      const r = await facebook_create_ad(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'facebook-mcp', name: 'facebook_get_ad_insights', costCr: 2,
    description: 'Ad/AdSet/Campaign insights — 2cr (real billing TBD)',
    run: async (args, userId) => {
      const r = await facebook_get_ad_insights(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'facebook-mcp', name: 'instagram_create_post', costCr: 3,
    description: 'Create an Instagram post via Graph API — 2cr (real billing TBD)',
    run: async (args, userId) => {
      const r = await instagram_create_post(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'facebook-mcp', name: 'facebook_get_messages', costCr: 1,
    description: 'Get Page conversations/messages — 2cr (real billing TBD)',
    run: async (args, userId) => {
      const r = await facebook_get_messages(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'facebook-mcp', name: 'facebook_post_reel', costCr: 5,
    description: 'Post a Reel to a Page (video) — 5cr (real billing TBD, multipart video required)',
    run: async (args, userId) => {
      const r = await facebook_post_reel(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'facebook-mcp', name: 'facebook_schedule_post', costCr: 2,
    description: 'Schedule a Page post for a future ISO8601 time — 1cr (real billing TBD)',
    run: async (args, userId) => {
      const r = await facebook_schedule_post(args?.params || {}, userId)
      return { ...r }
    },
  },
  // ── seo-marketing-mcp ──
  {
    server: 'seo-marketing-mcp', name: 'seo_generate_meta', costCr: 1,
    description: 'Generate SEO meta tags for a URL (title/desc/og/jsonLd) — 1cr (real billing TBD)',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).seo_generate_meta(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'seo_generate_sitemap', costCr: 1,
    description: 'Generate sitemap.xml from a URL list — free (build-time-ish)',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).seo_generate_sitemap(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'seo_generate_robots', costCr: 1,
    description: 'Generate robots.txt — free',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).seo_generate_robots(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'seo_audit_page', costCr: 2,
    description: 'Audit a page URL for SEO (title/desc/h1/images/links/schema/performance) — 2cr',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).seo_audit_page(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'seo_generate_schema', costCr: 1,
    description: 'Generate schema.org JSON-LD (Organization/Product/Service/FAQ/Article) — 1cr',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).seo_generate_schema(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'seo_generate_blog_post', costCr: 10,
    description: 'Generate an SEO-optimized blog post (1500 words) via hostamar-1m-a — 10cr',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).seo_generate_blog_post(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'social_create_campaign', costCr: 5,
    description: 'Create a cross-platform social campaign (FB/IG/LinkedIn/Twitter) — 5cr per platform',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).social_create_campaign(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'social_schedule_posts', costCr: 2,
    description: 'Schedule posts across platforms — 5cr per post',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).social_schedule_posts(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'social_get_analytics', costCr: 2,
    description: 'Aggregate social analytics across platforms — 2cr',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).social_get_analytics(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'seo_generate_backlinks', costCr: 5,
    description: 'Generate backlink outreach list from niche/competitors — 3cr',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).seo_generate_backlinks(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'seo_optimize_content', costCr: 3,
    description: 'Optimize existing content for SEO (keyword density/readability/internal links) — 3cr',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).seo_optimize_content(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'social_auto_post_new_service', costCr: 3,
    description: 'Auto-post a new AI service to social + generate blog post — 5cr (cron)',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).social_auto_post_new_service(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'seo_generate_faq_schema', costCr: 1,
    description: 'Generate FAQPage schema.org JSON-LD — 1cr',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).seo_generate_faq_schema(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'seo_check_rankings', costCr: 3,
    description: 'Check keyword rankings for a domain — 2cr (SERPAPI_KEY env)',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).seo_check_rankings(args?.params || {}, userId)
      return { ...r }
    },
  },
  {
    server: 'seo-marketing-mcp', name: 'social_generate_hashtags', costCr: 1,
    description: 'Generate platform-optimized hashtags for a post — 1cr',
    run: async (args, userId) => {
      const r = await (await import('./seo-marketing-mcp')).social_generate_hashtags(args?.params || {}, userId)
      return { ...r }
    },
  },
]

export function listMcpServers(): string[] {
  return [...new Set(MCP_TOOLS.map(t => t.server))]
}
