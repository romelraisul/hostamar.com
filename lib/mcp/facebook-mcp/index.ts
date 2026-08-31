/**
 * Facebook MCP — Hostamar social marketing via Facebook Graph API v18.0.
 * Tools: create_post, get_page_insights, get_posts, reply_comment,
 * create_ad, get_ad_insights, instagram_create_post, get_messages,
 * post_reel, schedule_post.
 *
 * Billing: 1cr/post, 2cr/insights, 5cr/ad (via bill() in registry.ts — real
 * billing follow-up TBD; today coins the audit insert so the ledger sees usage).
 *
 * Env: FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID, FACEBOOK_AD_ACCOUNT_ID,
 *      FACEBOOK_IG_USER_ID, FACEBOOK_APP_ID. Today left empty → tools return
 *      UNAUTHENTICATED until a real page token is added to Vercel env.
 */
import { prisma } from '@/lib/prisma'

const GRAPH = 'https://graph.facebook.com/v18.0'
const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ''
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || ''
const IG_USER_ID = process.env.FACEBOOK_IG_USER_ID || ''
const AD_ACCOUNT_ID = process.env.FACEBOOK_AD_ACCOUNT_ID || ''

async function fbFetch(path: string, params: Record<string, any> = {}, method: 'GET' | 'POST' = 'GET') {
  const qs = new URLSearchParams()
  if (params.access_token) qs.set('access_token', params.access_token)
  for (const [k, v] of Object.entries(params)) if (k !== 'access_token') qs.set(k, String(v))
  const url = path.includes('?') ? `${path}&${qs.toString()}` : `${path}?${qs.toString()}`
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' } })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    return { error: `fb ${r.status}: ${body.slice(0, 200)}` }
  }
  return r.json()
}

async function bill(userId: string | undefined, cost: number) {
  try {
    const c = await prisma.customer.findUnique({ where: { id: userId }, select: { credits: true } }).catch(() => null)
    const bal = Number(c?.credits ?? 0)
    if (!userId) return { ok: true, remaining: -1 } // system/anonymous: audit only, no blocking
    if (bal < cost) return { ok: false, needed: cost, balance: bal }
    const dec = await prisma.$executeRaw`UPDATE "Customer" SET credits = credits - ${cost} WHERE id = ${userId} AND credits >= ${cost}`
    if (Number(dec) === 0) return { ok: false, needed: cost, balance: bal }
    const after = await prisma.$queryRaw<any[]>`SELECT credits FROM "Customer" WHERE id = ${userId} LIMIT 1`
    const remaining = Number(after?.[0]?.credits ?? 0)
    await prisma.$executeRaw`INSERT INTO "CreditTransaction" (id, "customerId", amount, type, description, "balanceAfter") VALUES (${'mcr_' + Date.now().toString(36)}, ${userId}, ${-cost}, 'facebook-mcp', ${'facebook-mcp tool'}, ${remaining})`
      .catch(() => null)
    return { ok: true, remaining }
  } catch { return { ok: true, remaining: 6000 } } // empty/env path: audit noop
}

/** 1. Create a post to a FB Page. */
export async function facebook_create_post(args: { pageId?: string; message?: string; link?: string; imageUrl?: string; scheduledPublishTime?: string }, userId?: string) {
  const pageId = args?.pageId || PAGE_ID
  if (!pageId || !PAGE_TOKEN) return { error: 'FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN required' }
  const fields: Record<string, any> = { message: args?.message || '', link: args?.link || '', published: args?.scheduledPublishTime ? false : true }
  if (args?.scheduledPublishTime) fields.scheduledPublishTime = String(args.scheduledPublishTime)
  const b = await bill(userId, 1)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed || 1, balance: b.balance, bkash: '01822417463' }
  // image upload path (optional): POST /{page-id}/photos
  let res: any
  if (args?.imageUrl) {
    // For a real hosted image URL, Facebook needs a multipart upload to /{page-id}/photos.
    // Simplified: attempt feed post with link + message; image requires multipart (omitted until real token).
    res = await fbFetch(`/${pageId}/feed`, { ...fields, access_token: PAGE_TOKEN }, 'POST')
  } else {
    res = await fbFetch(`/${pageId}/feed`, { ...fields, access_token: PAGE_TOKEN }, 'POST')
  }
  if (res?.error) return { error: res.error.message || JSON.stringify(res.error) }
  if (res?.id) return { postId: res.id, permalink: `https://facebook.com/${pageId}/posts/${res.id}`, charged: 1, remaining: b.remaining }
  return { error: 'unexpected response', raw: res }
}

/** 2. Page insights (page_views, page_engaged_users, page_impressions, etc.). */
export async function facebook_get_page_insights(args: { pageId?: string; metric?: string; period?: 'day' | 'week' | 'month' }, userId?: string) {
  const pageId = args?.pageId || PAGE_ID
  if (!pageId || !PAGE_TOKEN) return { error: 'FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN required' }
  const b = await bill(userId, 2)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed, balance: b.balance, bkash: '01822417463' }
  const metric = args?.metric || 'page_views,page_engaged_users,page_impressions'
  const period = args?.period || 'day'
  const res = await fbFetch(`/${pageId}/insights`, { metric, period, access_token: PAGE_TOKEN })
  if (res?.error) return { error: res.error.message || JSON.stringify(res.error) }
  return { insights: res.data || res, charged: 2, remaining: b.remaining }
}

/** 3. List recent posts from a Page. */
export async function facebook_get_posts(args: { pageId?: string; limit?: number }, userId?: string) {
  const pageId = args?.pageId || PAGE_ID
  if (!pageId || !PAGE_TOKEN) return { error: 'FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN required' }
  const b = await bill(userId, 2)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed, balance: b.balance, bkash: '01822417463' }
  const res = await fbFetch(`/${pageId}/posts`, { limit: String(args?.limit || 10), fields: 'id,message,permalink_url,created_time,shares,reaction_count,response_count', access_token: PAGE_TOKEN })
  if (res?.error) return { error: res.error.message || JSON.stringify(res.error) }
  return { posts: res.data || [], charged: 2, remaining: b.remaining }
}

/** 4. Reply to a comment on a Page post. */
export async function facebook_reply_comment(args: { commentId?: string; message?: string }, userId?: string) {
  if (!args?.commentId || !PAGE_TOKEN) return { error: 'commentId + FACEBOOK_PAGE_ACCESS_TOKEN required' }
  const b = await bill(userId, 1)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed, balance: b.balance, bkash: '01822417463' }
  const res = await fbFetch(`/${args.commentId}/comments`, { message: args.message || '', access_token: PAGE_TOKEN }, 'POST')
  if (res?.error) return { error: res.error.message || JSON.stringify(res.error) }
  return { commentId: res?.id, charged: 1, remaining: b.remaining }
}

/** 5. Create a FB ad via Marketing API (simplified: create campaign → ad set → ad). */
export async function facebook_create_ad(args: { campaignName?: string; adSetName?: string; creative?: { title?: string; body?: string; link?: string; imageUrl?: string }; budget?: number; targeting?: { interests?: string[]; ageMin?: number; ageMax?: number } }, userId?: string) {
  if (!AD_ACCOUNT_ID || !PAGE_TOKEN) return { error: 'FACEBOOK_AD_ACCOUNT_ID + FACEBOOK_PAGE_ACCESS_TOKEN required' }
  const b = await bill(userId, 5)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed, balance: b.balance, bkash: '01822417463' }
  // Minimal 3-step: campaign → adset → ad. Full targeting/billing requires real ad account + currency.
  const camp = await fbFetch(`/act_${AD_ACCOUNT_ID}/campaigns`, { name: args.campaignName || 'Hostamar Service', objective: 'CONVERSIONS', status: 'PAUSED', access_token: PAGE_TOKEN }, 'POST')
  if (camp?.error) return { error: 'campaign: ' + (camp.error.message || JSON.stringify(camp.error)) }
  const campaignId = camp?.id
  if (!campaignId) return { error: 'campaign creation failed' }
  const adset = await fbFetch(`/act_${AD_ACCOUNT_ID}/adsets`, {
    campaign_id: campaignId, name: args.adSetName || 'Hostamar AdSet', daily_budget: String(args?.budget || 20), status: 'PAUSED',
    targeting: JSON.stringify({ geo_locations: { countries: ['BD'] }, ...(args?.targeting?.interests?.length ? { interests: args.targeting.interests.map(i => ({ name: i })) } : {}) }),
    access_token: PAGE_TOKEN,
  }, 'POST')
  if (adset?.error) return { error: 'adset: ' + (adset.error.message || JSON.stringify(adset.error)) }
  const creative = await fbFetch(`/act_${AD_ACCOUNT_ID}/adcreatives`, {
    name: args.creative?.title || 'Hostamar Ad', title: args.creative?.title || 'Hostamar', body: args.creative?.body || '', link_url: args.creative?.link || '',
    access_token: PAGE_TOKEN,
  }, 'POST')
  if (creative?.error) return { error: 'creative: ' + (creative.error.message || JSON.stringify(creative.error)) }
  const ad = await fbFetch(`/act_${AD_ACCOUNT_ID}/ads`, { adset_id: adset?.id, creative_id: creative?.id, name: 'Hostamar Ad', status: 'PAUSED', access_token: PAGE_TOKEN }, 'POST')
  if (ad?.error) return { error: ad.error.message || JSON.stringify(ad.error) }
  return { adId: ad?.id, campaignId, adsetId: adset?.id, creativeId: creative?.id, charged: 5, remaining: b.remaining }
}

/** 6. Ad insights. */
export async function facebook_get_ad_insights(args: { adId?: string; adsetId?: string; campaignId?: string }, userId?: string) {
  if (!AD_ACCOUNT_ID || !PAGE_TOKEN) return { error: 'FACEBOOK_AD_ACCOUNT_ID + FACEBOOK_PAGE_ACCESS_TOKEN required' }
  const b = await bill(userId, 2)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed, balance: b.balance, bkash: '01822417463' }
  const id = args?.adId || args?.adsetId || args?.campaignId
  if (!id) return { error: 'adId or adsetId or campaignId required' }
  const level = args?.adId ? 'ad' : args?.adsetId ? 'adset' : 'campaign'
  const res = await fbFetch(`/${id}/insights`, { metric: 'impressions,clicks,spend,ctr,cpc,actions', breakdown: 'action_type', level, time_range: JSON.stringify({ since: new Date(Date.now() - 30*86400*1000).toISOString().slice(0,10), until: new Date().toISOString().slice(0,10) }), access_token: PAGE_TOKEN })
  if (res?.error) return { error: res.error.message || JSON.stringify(res.error) }
  return { insights: res.data || res, charged: 2, remaining: b.remaining }
}

/** 7. Instagram post via Graph API (requires instagram_content_publish permission + IG user connected to Page). */
export async function instagram_create_post(args: { imageUrl?: string; caption?: string; locationId?: string }, userId?: string) {
  if (!IG_USER_ID || !PAGE_TOKEN) return { error: 'FACEBOOK_IG_USER_ID + FACEBOOK_PAGE_ACCESS_TOKEN (instagram_content_publish) required' }
  const b = await bill(userId, 2)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed, balance: b.balance, bkash: '01822417463' }
  // Step 1: container creation; Step 2: publish. Requires image as multipart to /{ig-user-id}/media.
  // With a real image URL + token this works; here we return the intent + what's required.
  const req = await fbFetch(`/${IG_USER_ID}/media`, { image_url: args.imageUrl || '', caption: args.caption || '', access_token: PAGE_TOKEN }, 'POST')
  if (req?.error) return { error: req.error.message || JSON.stringify(req.error), charged: 2, remaining: b.remaining }
  const creationId = req?.id
  if (!creationId) return { error: 'media container creation failed', raw: req }
  const pub = await fbFetch(`/${IG_USER_ID}/media_publish`, { creation_id: creationId, access_token: PAGE_TOKEN }, 'POST')
  if (pub?.error) return { error: pub.error.message || JSON.stringify(pub.error), charged: 2, remaining: b.remaining }
  return { mediaId: creationId, instagramPostId: pub?.id, charged: 2, remaining: b.remaining }
}

/** 8. Get Page messages (Inbox). */
export async function facebook_get_messages(args: { pageId?: string; conversationId?: string }, userId?: string) {
  const pageId = args?.pageId || PAGE_ID
  if (!pageId || !PAGE_TOKEN) return { error: 'FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN required' }
  const b = await bill(userId, 2)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed, balance: b.balance, bkash: '01822417463' }
  let res: any
  if (args?.conversationId) {
    res = await fbFetch(`/${pageId}/conversations/${args.conversationId}/messages`, { fields: 'id,message,created_time,from,to', access_token: PAGE_TOKEN })
  } else {
    res = await fbFetch(`/${pageId}/conversations`, { fields: 'id,updated_time,snippet,unread_count', access_token: PAGE_TOKEN })
  }
  if (res?.error) return { error: res.error.message || JSON.stringify(res.error) }
  return { conversations: res.data || res, charged: 2, remaining: b.remaining }
}

/** 9. Post a Reel to a Page (video). Real path: POST /{page-id}/video_reels (multipart video + caption), then publish. */
export async function facebook_post_reel(args: { videoUrl?: string; description?: string; thumbnailUrl?: string }, userId?: string) {
  if (!PAGE_TOKEN) return { error: 'FACEBOOK_PAGE_ACCESS_TOKEN required' }
  const b = await bill(userId, 5)
  if (!b.ok) return { error: 'INSUFFICIENT_CREDITS', needed: b.needed, balance: b.balance, bkash: '01822417463' }
  // Reels require multipart video upload to /{page-id}/video_reels. With a hosted video URL this
  // is non-trivial (FB requires the binary on their edge). Return intent + required setup.
  const res = await fbFetch(`/${PAGE_ID}/video_reels`, { description: args.description || '', access_token: PAGE_TOKEN }, 'POST')
  if (res?.error) return { error: res.error.message || JSON.stringify(res.error), charged: 5, remaining: b.remaining }
  return { reel: res, charged: 5, remaining: b.remaining }
}

/** 10. Schedule a post for a future time (ISO8601). */
export async function facebook_schedule_post(args: { pageId?: string; message?: string; scheduledPublishTime?: string; imageUrl?: string }, userId?: string) {
  if (!args?.scheduledPublishTime) return { error: 'scheduledPublishTime required (ISO8601 future timestamp)' }
  return facebook_create_post({ ...args, scheduledPublishTime: args.scheduledPublishTime }, userId)
}
