/**
 * Hostamar SEO + social marketing MCP — in-process tools, no external MCP server.
 *
 * Env needed for real integrations:
 *   FACEBOOK_PAGE_ACCESS_TOKEN + FACEBOOK_PAGE_ID + FACEBOOK_AD_ACCOUNT_ID + FACEBOOK_IG_USER_ID
 *   LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET
 *   TWITTER_BEARER_TOKEN (X API v2)
 *   SERPAPI_KEY (or similar) for rankings
 *   GOOGLE_SEARCH_CONSOLE_KEY / GOOGLE_SERVICE_ACCOUNT for sitemap ping
 *   hostamar-1m-a used for content generation (via lib/ai-fallback, no OpenAI key needed today)
 *
 * Today most of these tools return UNAUTHENTICATED / NOT_CONFIGURED until a real
 * token is added to Vercel env. The router (app/api/mcp/seo/*) does the real
 * billing; the in-process wrappers here are the no-server convenience path.
 */
import { callBestModel } from '@/lib/ai-fallback'
import { prisma } from '@/lib/prisma'
import { facebook_create_post, facebook_schedule_post, facebook_get_page_insights, instagram_create_post } from '@/lib/mcp/facebook-mcp'

// ── helpers ──
async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, ...init })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    return { error: `http ${r.status}: ${body.slice(0, 240)}` }
  }
  return r.json()
}

async function bill(userId: string | undefined, cost: number): Promise<{ ok: boolean; remaining?: number; needed?: number; balance?: number }> {
  // V20 REAL DEDUCTION: authed users pay the tool cost (race-safe guarded
  // UPDATE + CreditTransaction audit). Anonymous/cron stays free. 1cr=1TK=1COIN.
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
      VALUES (${'seo_' + Date.now().toString(36)}, ${userId}, ${-cost}, 'seo-mcp', ${'seo tool usage (paid)'}, ${remaining})
    `.catch(() => null)
    return { ok: true, remaining }
  } catch { return { ok: true, remaining: -1 } }
}

// ── meta generator ──
export async function seo_generate_meta(args: { url?: string; title?: string; description?: string; keywords?: string[] }, userId?: string) {
  const url = args?.url || 'https://hostamar.com'
  const title = args?.title || 'Hostamar — 106 AI Services · 120 Models · 1cr=1TK=1COIN · 6000 Bonus'
  // Short title (≤60 chars) + expanded with keyword
  const metaPrompt = 'Return ONE JSON object {title, description, keywords, ogTitle, ogDescription}. title max 60 chars, description max 160 chars, keywords array max 10 tokens. Bangla+English. No markdown. Generate SEO meta for a page. URL: ' + url + ' Base title: ' + title + ' Keywords hint: ' + (args?.keywords?.join(', ') || 'AI services Bangladesh, AI video maker, AI voiceover, hosting') + ' Return ONLY the JSON object.'
  const m = await callBestModel([{ role: 'user', content: metaPrompt }], 'You are an SEO meta generator. Output only JSON.')
  try { return { ...JSON.parse(m.text), charged: 1, remaining: (await bill(userId, 1)).remaining } } catch { return { error: 'meta generation parse failed', note: m.text, charged: 1, remaining: (await bill(userId, 1)).remaining } }
}

// ── sitemap.xml ──
export async function seo_generate_sitemap(args: { baseUrl?: string; urls?: Array<{ loc?: string; lastmod?: string; changefreq?: string; priority?: number }> }, userId?: string) {
  const bS = await bill(userId, 1)
  if (!bS.ok) return { error: 'INSUFFICIENT_CREDITS', needed: bS.needed, balance: bS.balance, bkash: '01822417463' }
  const base = args?.baseUrl || 'https://hostamar.com'
  const urls: Array<{ loc?: string; lastmod?: string; changefreq?: string; priority?: number }> = args?.urls || [{ loc: '' }]
  const now = new Date().toISOString().slice(0, 10)
  const rows = urls.map(u => {
    const loc = (u.loc || '').replace(/^\/+/, '').replace(/\/+$/, '')
    // keep absolute URLs intact
    const parts = [
      '  <url>',
      '    <loc>' + base.replace(/\/$/, '') + '/' + loc + '</loc>',
      '    <lastmod>' + (u.lastmod || now) + '</lastmod>',
      '    <changefreq>' + (u.changefreq || 'monthly') + '</changefreq>',
      '    <priority>' + (u.priority ?? (loc === '' ? 1.0 : 0.5)).toString() + '</priority>',
      '  </url>',
    ]
    return parts.join(String.fromCharCode(10))
  })
  const head = '<?xml version="1.0" encoding="UTF-8"?>'
  const openTag = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  const closeTag = '</urlset>'
  const NL = String.fromCharCode(10)
  const xml = [head, openTag, ...rows, closeTag].join(NL)
  return { sitemap: xml, charged: 1, remaining: bS.remaining }
}

// ── robots.txt ──
export async function seo_generate_robots(args: { allow?: string[]; disallow?: string[]; sitemap?: string }, userId?: string) {
  const b = await bill(userId, 1)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed, balance: b.balance, bkash: '01822417463' }
  const allow = args?.allow ?? ['/', '/docs', '/pricing', '/video', '/hosting', '/chat', '/browser', '/ide', '/game']
  const disallow = args?.disallow ?? ['/api/', '/dashboard/', '/admin/', '/editor/', '/studio/', '/internal/', '/_next/', '/_vercel/']
  const sitemap = args?.sitemap ?? 'https://hostamar.com/sitemap.xml'
  const lines = ['User-agent: *', ...allow.map(a => 'Allow: ' + a), ...disallow.map(d => 'Disallow: ' + d), 'Sitemap: ' + sitemap]
  const b0 = await bill(userId, 0)
  return { robots: lines.join(String.fromCharCode(10)) + String.fromCharCode(10), charged: 1, remaining: b.remaining }
}

// ── SEO audit ──
export async function seo_audit_page(args: { url?: string }, userId?: string) {
  const target = args?.url || 'https://hostamar.com'
  let html = ''
  try {
    const r = await fetch(target, { signal: AbortSignal.timeout(15000) })
    html = await r.text()
  } catch { html = '' }
  if (!html || html.length < 200) {
    const bE = await bill(userId, 0)
    return { error: 'Could not fetch page', url: target, charged: 0, remaining: bE.remaining }
  }
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
  const h1 = (html.match(/<h1[^>]*>/gi) || []).length
  const imgs = (html.match(/<img[^>]*>/gi) || []).length
  const imgsWithAlt = (html.match(/<img[^>]*alt=["'][^"']*["'][^>]*>/gi) || []).length
  const score = Math.max(0, Math.min(100,
    (titleMatch ? 20 : 0) + (descMatch ? 20 : 0) + (h1 === 1 ? 15 : 0) +
    (Math.min(imgs, 5) * 6) + (imgsWithAlt === imgs ? 15 : 0) +
    (html.length > 2000 ? 10 : 0) - ((titleMatch && titleMatch[1].length > 70) ? 5 : 0)))
  const issues: string[] = []
  if (!titleMatch) issues.push('Missing <title>')
  if (!descMatch) issues.push('Missing meta description')
  if (h1 === 0) issues.push('No <h1>')
  else if (h1 > 1) issues.push(String(h1) + ' <h1> tags (ideally 1)')
  if (imgs === 0) issues.push('No images')
  else if (imgsWithAlt < imgs) issues.push(String(imgsWithAlt) + '/' + String(imgs) + ' images missing alt')
  if (html.length < 2000) issues.push('Page content very short (<2000 chars)')
  const b = await bill(userId, 2)
  return { score, url: target, title: titleMatch?.[1] || null, description: descMatch?.[1] || null, issues, charged: 2, remaining: b.remaining }
}

// ── schema.org ──
export async function seo_generate_schema(args: { type?: 'Organization' | 'Product' | 'Service' | 'FAQ' | 'FAQPage' | 'Article' | 'BreadcrumbList'; data?: any }, userId?: string) {
  const type = args?.type || 'Organization'
  const data = args?.data || {}
  const b = await bill(userId, 1)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed || 1, balance: b.balance, bkash: '01822417463' }
  const json = ({
    '@context': 'https://schema.org', '@type': type,
    ...(type === 'Organization' && { name: data.name || 'Hostamar', url: data.url || 'https://hostamar.com', logo: data.logo || 'https://hostamar.com/logo.png', sameAs: data.sameAs || ['https://facebook.com/hostamar', 'https://youtube.com/@hostamar'] }),
    ...(type === 'Product' && { name: data.name || 'Hostamar AI Service', description: data.description || '', image: data.image || [], brand: { '@type': 'Brand', name: 'Hostamar' }, offers: { '@type': 'Offer', priceCurrency: 'BDT', price: data.price || 599, availability: 'InStock' } }),
    ...(type === 'Service' && { name: data.name || 'Hostamar AI Service', description: data.description || '', provider: { '@type': 'Organization', name: 'Hostamar' }, areaServed: 'BD', serviceType: data.serviceType || 'AI' }),
    ...(type === 'FAQPage' && { mainEntity: (data.faqs || []).map((q: any) => { return { '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.answer } } }) }),
    ...(type === 'Article' && { headline: data.headline || '', image: data.image || [], publisher: { '@type': 'Organization', name: 'Hostamar', logo: { '@type': 'ImageObject', url: 'https://hostamar.com/logo.png' } }, author: { '@type': 'Organization', name: 'Hostamar' } }),
    ...(type === 'BreadcrumbList' && { itemListElement: (data.items || []).map((i: any, idx) => { return { '@type': 'ListItem', position: idx + 1, name: i.name, item: i.item || ('https://hostamar.com/' + (i.id || '')) } }) }),
  } as any)
  return { jsonLd: json, json: json, charged: 1, remaining: b.remaining }
}

// ── blog post ──
export async function seo_generate_blog_post(args: { topic?: string; keywords?: string[]; length?: number; serviceId?: string; language?: string }, userId?: string) {
  const topic = args?.topic || 'Best AI Voiceover in Bangladesh'
  const kw = args?.keywords || ['bangla voiceover', 'AI voiceover', 'cheap voiceover', 'Hostamar']
  const words = Math.max(600, args?.length || 1500)
  const prompt = `Write an SEO-optimized blog post (target ~${words} words) about: "${topic}".\nKeywords to weave naturally: ${kw.join(', ')}.\nStructure: H1 title, intro, H2 sections, FAQ at end, CTA to https://hostamar.com/pricing (Starter 599 TK → 6000cr, 1cr=1TK=1COIN, 6000 bonus).\nBangla + English mix. Return ONLY the markdown article, no meta commentary.`
  const { text } = await callBestModel([{ role: 'user', content: prompt }], 'You are a senior SEO content writer. Return a complete markdown article.')
  const genTitle = topic.replace(/^(Best|How to|Why)\s+/i, '').slice(0, 70)
  const slug = genTitle.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || ('post-' + Date.now().toString(36))
  const metaDescription = (text.slice(0, 160) || topic).replace(/\s+/g, ' ')
  const b10 = await bill(userId, 10)
  return { title: topic.slice(0, 90), slug, metaDescription, topic, keywords: kw, content: text, charged: 10, remaining: b10.remaining }
}

// ── social campaign ──
export async function social_create_campaign(args: { name?: string; platforms?: string[]; posts?: Array<{ message?: string; imageUrl?: string; link?: string; scheduledTime?: string }> }, userId?: string) {
  const platforms = args?.platforms || ['facebook']
  const posts = args?.posts || [{ message: `🚀 Hostamar — 106 AI services · 120 models · 1cr=1TK=1COIN · 6000 bonus · bKash 01822417463 — https://hostamar.com` }]
  const b = await bill(userId, platforms.length * 5)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed || (platforms.length * 5), balance: b.balance, bkash: '01822417463' }
  const created = await Promise.all(platforms.map(p => {
    if (p === 'facebook') return facebook_create_post({ message: posts[0]?.message || '', link: posts[0]?.link, imageUrl: posts[0]?.imageUrl, scheduledPublishTime: posts[0]?.scheduledTime }, userId)
    if (p === 'instagram') return instagram_create_post({ caption: posts[0]?.message || '', imageUrl: posts[0]?.imageUrl }, userId)
    return { platform: p, status: 'not_configured', error: `${p} token/config not added to env yet` }
  }))
  return { campaignId: `camp-${Date.now().toString(36)}`, name: args?.name || 'Hostamar Campaign', platforms, created, charged: platforms.length * 5, remaining: b.remaining }
}

// ── schedule posts ──
export async function social_schedule_posts(args: { posts?: Array<{ platform?: string; message?: string; imageUrl?: string; scheduledTime?: string; pageId?: string }> }, userId?: string) {
  const posts = args?.posts || []
  const b = await bill(userId, posts.length * 5)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed || (posts.length * 5), balance: b.balance, bkash: '01822417463' }
  const scheduled = await Promise.all(posts.map(p => {
    if (p.platform === 'facebook' && p.scheduledTime) return facebook_schedule_post({ pageId: p.pageId, message: p.message, imageUrl: p.imageUrl, scheduledPublishTime: p.scheduledTime }, userId)
    if (p.platform === 'facebook') return facebook_create_post({ pageId: p.pageId, message: p.message, imageUrl: p.imageUrl }, userId)
    return { platform: p.platform, status: 'not_configured', error: `${p.platform} not configured` }
  }))
  return { scheduled, charged: posts.length * 5, remaining: b.remaining }
}

// ── social analytics ──
export async function social_get_analytics(args: { platforms?: string[]; dateRange?: { from?: string; to?: string }; metrics?: string[] }, userId?: string) {
  const platforms = args?.platforms || ['facebook']
  const metrics = args?.metrics || ['impressions', 'engagement', 'clicks', 'followers']
  const b = await bill(userId, 2)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed || 2, balance: b.balance, bkash: '01822417463' }
  const agg = await Promise.all(platforms.map(p => {
    if (p === 'facebook') return facebook_get_page_insights({ metric: metrics.join(','), pageId: process.env.FACEBOOK_PAGE_ID }, userId)
    return { platform: p, error: `${p} token/config not added to env yet` }
  }))
  return { analytics: agg, charged: 2, remaining: b.remaining }
}

// ── backlinks ──
export async function seo_generate_backlinks(args: { niche?: string; competitorUrls?: string[] }, userId?: string) {
  const niche = args?.niche || 'AI tools Bangladesh'
  const b = await bill(userId, 3)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed || 3, balance: b.balance, bkash: '01822417463' }
  const ideaPrompt = `List 12 realistic backlink opportunities for a ${niche} business like Hostamar (106 AI services, BD). For each: domain, url, type (guest post / directory / forum / resource page), and a plausible contact email pattern. Return ONLY a JSON array.`
  const { text } = await callBestModel([{ role: 'user', content: ideaPrompt }], 'You are an SEO backlink researcher. Return a JSON array only.')
  try { const arr = JSON.parse(text); return { backlinks: arr, charged: 3, remaining: b.remaining } } catch { return { error: 'backlink parse failed', raw: text, charged: 3, remaining: b.remaining } }
}

// ── optimize content ──
export async function seo_optimize_content(args: { url?: string; content?: string; targetKeywords?: string[] }, userId?: string) {
  const kw = args?.targetKeywords || ['AI services Bangladesh']
  let content: string | null = null
  if (args?.content) content = String(args.content)
  else if (args?.url) {
    try {
      const r = await fetch(args.url, { signal: AbortSignal.timeout(15000) })
      content = await r.text()
    } catch { content = null }
  }
  const b = await bill(userId, 3)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed || 3, balance: b.balance, bkash: '01822417463' }
  if (!content) return { error: 'Provide content (or a public URL to fetch)', charged: 0, remaining: b.remaining }
  const { text } = await callBestModel(
    [{ role: 'user', content: 'Target keywords: ' + kw.join(', ') + ' --- Content --- ' + String(content).slice(0, 8000) }],
    'Optimize the provided content for SEO: improve keyword density for the target keywords, fix heading hierarchy, add internal link suggestions, remove fluff, improve readability.',
    )
  return { optimized: text, charged: 3, remaining: b.remaining }
}

// ── auto post new service ──
export async function social_auto_post_new_service(args: { serviceId?: string; serviceName?: string; description?: string; price?: number; discount?: number }, userId?: string) {
  const svc = args || {}
  const msg = `🚀 NEW SERVICE: ${svc.serviceName || 'New AI Service'} — ${svc.price ? `৳${svc.price} = ${svc.price}cr` : ''} — ${svc.description || 'Hostamar AI'}.\n1cr=1TK=1COIN · 6000 bonus · bKash 01822417463 · https://hostamar.com`
  const posts: Array<{ platform: string; message: string }> = [
    { platform: 'facebook', message: msg },
    { platform: 'instagram', message: '🚀 ' + (svc.serviceName || 'New Service') + ' — ' + (svc.price ? ('৳' + svc.price + ' = ' + svc.price + 'cr') : '') + ' — 1cr=1TK=1COIN #BanglaAI #AIVoiceover #Hostamar' },
  ]
  const b = await bill(userId, posts.length * 5)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed || (posts.length * 5), balance: b.balance, bkash: '01822417463' }
  const created = await Promise.all(posts.map(p => {
    if (p.platform === 'facebook') return facebook_create_post({ message: p.message, link: 'https://hostamar.com' }, userId)
    if (p.platform === 'instagram') return instagram_create_post({ caption: p.message }, userId)
    return { platform: p.platform, status: 'not_configured' }
  }))
  return { campaignId: `auto-${svc.serviceId || 'new'}`, posts: created, charged: posts.length * 5, remaining: b.remaining }
}

// ── FAQ schema ──
export async function seo_generate_faq_schema(args: { faqs?: Array<{ question: string; answer: string }> }, userId?: string) {
  const b = await bill(userId, 1)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed || 1, balance: b.balance, bkash: '01822417463' }
  const data: any = { faqs: (args?.faqs || []).map((q: any) => ({ '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.answer } })) }
  const json = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: data.faqs }
  return { jsonLd: json, json, charged: 1, remaining: b.remaining }
}

// ── rankings ──
export async function seo_check_rankings(args: { keywords?: string[]; domain?: string }, userId?: string) {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) return { error: 'SERPAPI_KEY env required for rankings', charged: 0, remaining: (await bill(userId, 0)).remaining }
  const keywords = args?.keywords || ['bangla voiceover', 'AI video maker Bangladesh', 'AI hosting Bangladesh']
  const domain = args?.domain || 'hostamar.com'
  const results = await Promise.all(keywords.map(k =>
    fetchJson(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(k)}&location=BD&hl=bd` as string, { headers: { 'User-Agent': 'HostamarSEO/1.0' } })
      .then(d => {
        const organic = (d as any)?.organic || []
        const pos = organic.findIndex((o: any) => (o.displayLink || o.link || '').includes(domain))
        return { keyword: k, position: pos >= 0 ? pos + 1 : '—', url: organic.find((o: any) => (o.displayLink || o.link || '').includes(domain))?.link || null }
      }).catch(() => ({ keyword: k, position: '—', url: null }))
  ))
  const b2 = await bill(userId, 2)
  return { rankings: results, charged: 2, remaining: b2.remaining }
}

// ── ping GSC + Bing (V21) ──
export async function seo_ping_gsc(args: { sitemapUrl?: string; urls?: string[] }, userId?: string) {
  const b = await bill(userId, 2)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed || 2, balance: b.balance, bkash: '01822417463' }
  const sitemapUrl = args?.sitemapUrl || 'https://hostamar.com/sitemap.xml'
  const urls = (args?.urls || []).slice(0, 20)

  // Google: real Indexing API (GOOGLE_SERVICE_ACCOUNT_JSON — same service account
  // the seo-sync cron + /api/seo/submit already use). Honest result per URL.
  let googleResults: any[] = []
  try {
    const { submitUrlsToGoogle } = await import('@/lib/google/indexingApi')
    const targets = [sitemapUrl, ...urls]
    const { hasGoogleServiceAccount } = await import('@/lib/google/auth')
    if (hasGoogleServiceAccount()) {
      googleResults = await submitUrlsToGoogle(targets)
    } else {
      googleResults = [{ url: sitemapUrl, ok: false, status: 0, detail: 'GOOGLE_SERVICE_ACCOUNT_JSON missing (set it in Vercel env; owner runbook in docs/v21-audit.md)' }]
    }
  } catch (e: any) {
    googleResults = [{ url: sitemapUrl, ok: false, status: 0, detail: String(e?.message || e).slice(0, 200) }]
  }

  // Bing: public sitemap ping endpoint (no key needed)
  let bingPing = ''
  try {
    const r = await fetch('https://www.bing.com/ping?sitemap=' + encodeURIComponent(sitemapUrl), { signal: AbortSignal.timeout(10000) })
    bingPing = ('HTTP ' + r.status + ' ' + (await r.text().catch(() => ''))).slice(0, 200)
  } catch (e: any) { bingPing = 'bing ping failed: ' + String(e?.message || e).slice(0, 120) }

  const okCount = googleResults.filter(g => g?.ok).length
  return {
    sitemapUrl,
    google: googleResults,
    bing: bingPing,
    urlsSubmitted: urls.length,
    googleOk: okCount,
    charged: 2, remaining: b.remaining,
    note: okCount === 0 && googleResults[0]?.detail?.includes('missing') ? googleResults[0].detail : '',
  }
}

// ── hashtags ──
export async function social_generate_hashtags(args: { content?: string; platform?: string; count?: number }, userId?: string) {
  const platform = (args?.platform || 'instagram').toLowerCase()
  const count = Math.min(30, args?.count || 20)
  const tagPrompt = 'Return ONLY a JSON array of ' + count + ' hashtags about the following content. Short, relevant, mix of broad + niche. Content: ' + (args?.content || 'Hostamar 106 AI services 120 models 1cr=1TK=1COIN 6000 bonus https://hostamar.com')
  const generated = (await callBestModel(
    [{ role: 'user', content: tagPrompt }],
    'You are a hashtag generator for ' + platform + '. Output only a JSON array of hashtags.',
  )).text
  try {
    const arr = JSON.parse(generated)
    return { hashtags: Array.isArray(arr) ? arr.slice(0, count) : [], charged: 1, remaining: (await bill(userId, 0)).remaining }
  } catch {
    // fallback: split by space/hash
    const raw = generated.replace(/[^0-9a-zA-Z#]/g, ' ').split(/\s+/).filter(s => s.startsWith('#'))
    return { hashtags: raw.filter(Boolean).slice(0, count), charged: 1, remaining: (await bill(userId, 0)).remaining }
  }
}
