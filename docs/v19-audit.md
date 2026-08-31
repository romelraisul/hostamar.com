# V19 Audit — Facebook MCP + SEO/Marketing MCP + Vercel duplicate + NextAuth v5 (2026-09-01)

## Ground truth (what's actually in the repo vs the spec)

### Facebook MCP — BUILT (lib/mcp/facebook-mcp/index.ts)
10 tools live in `lib/mcp/registry.ts` under server `facebook-mcp`, dispatched via the
existing public `/api/mcp` POST {tool, params} (no new route needed — /api/mcp already
serves every registry tool and self-guards auth):
facebook_create_post · facebook_get_page_insights · facebook_get_posts ·
facebook_reply_comment · facebook_create_ad · facebook_get_ad_insights ·
instagram_create_post · facebook_get_messages · facebook_post_reel · facebook_schedule_post

- Real FB Graph API v18.0 calls (GET for reads, POST for feed/comments/campaigns/
  adsets/ads/creatives/IG media+publish/reels).
- Without tokens every tool returns an honest `error: 'FACEBOOK_PAGE_ID +
  FACEBOOK_PAGE_ACCESS_TOKEN required'` — never a fake success.
- Billing: registry `bill()` today is audit-insert 0 (FREE) — the real-deduction
  follow-up is documented in registry.ts. Tools report intended cost in description.

**Owner action to go live:** create a Facebook app + Page token with permissions
`pages_manage_posts, pages_read_engagement, pages_show_list, instagram_content_publish,
ads_management, ads_read`, exchange for a long-lived Page token, then set in Vercel env:
`FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID, FACEBOOK_AD_ACCOUNT_ID,
FACEBOOK_IG_USER_ID` (all added to `.env.example`).

### SEO/Marketing MCP — BUILT (lib/mcp/seo-marketing-mcp/index.ts)
15 tools under server `seo-marketing-mcp`, same `/api/mcp` dispatch:
seo_generate_meta · seo_generate_sitemap · seo_generate_robots · seo_audit_page ·
seo_generate_schema · seo_generate_blog_post · social_create_campaign ·
social_schedule_posts · social_get_analytics · seo_generate_backlinks ·
seo_optimize_content · social_auto_post_new_service · seo_generate_faq_schema ·
seo_check_rankings · social_generate_hashtags

- Content generation rides the existing `callBestModel` chain (hostamar-1m-a branded
  slot → kilocode/edge fallbacks) — zero new LLM cost.
- rankings requires `SERPAPI_KEY` (honest error without it).
- SEO repo: `find /home/romel -maxdepth 3 -iname "*seo*"` finds ONLY
  `HOSTAMAR_SEO_MODULE.md` (docs for the existing seo-sync cron) — **there is no
  separate seo repo on this machine**. Nothing to integrate; this MCP is the fresh
  build. The existing `app/api/cron/seo-sync` (GSC + Bing indexing) stays untouched.

### New cron — app/api/cron/seo-auto-post/route.ts
Daily: finds ServiceCatalog rows created in last 24h → calls
social_auto_post_new_service for each → writes a SeoEvent history row.
Auth identical to the other crons (x-vercel-cron OR Bearer/?secret= CRON_SECRET,
fail-closed when unset). Until FACEBOOK_PAGE_ACCESS_TOKEN is set it runs green and
reports `fbConfigured: false` — no fake posts.

## Duplicate Vercel project `hostamar.com` — HOW TO DELETE (owner action)
`vercel` CLI here is scoped to the authenticated account; the duplicate project list
requires dashboard/API-token access I don't have in this session (no VERCEL_TOKEN env;
`vcp_` was pasted in chat previously and MUST be rotated before reuse — do NOT paste
it again). Manual 60-second path:
1. https://vercel.com/romelraisul-8939s-projects → project `hostamar.com`
   (the duplicate with hostamarcom-*.vercel.app URL)
2. Settings → General → Delete Project → type `hostamar.com` → Delete
3. Keep `hostamar-build` (it owns hostamar.com + www + all env).
Then `npx vercel ls` should list only hostamar-build deployments.

## NextAuth v5 — SCHEDULED (dedicated session, branch feature/nextauth-v5)
Current state (grounded):
- `next-auth@^4.24.13` + `@auth/core@^0.34.3` + `@auth/prisma-adapter@^2.11.2` already in package.json.
- `app/api/auth/[...nextauth]/route.ts` = v4 pattern (`NextAuth(authOptions)` → `export {handler as GET, POST}`).
- `lib/auth-config.ts` = v4 `NextAuthOptions` with Credentials + 6 SSO providers, JWT strategy.
- The production auth path (login/signup cookie `auth_token`, signToken/verifyToken,
  isAdmin DB re-check, MFA TOTP gate, all V18 guards) is CUSTOM JWT in lib/auth.ts —
  INDEPENDENT of NextAuth. Migrating NextAuth v4→v5 does not touch the money surface.

Migration plan (when scheduled): npm i next-auth@beta → rewrite auth-config to v5
`NextAuth({ adapter: PrismaAdapter, providers })` exporting `{handlers, auth, signIn,
signOut}` → `route.ts` becomes `export const {GET, POST} = handlers` → replace the one
`getServerSession(authOptions)` call site (lib/auth.ts getAuthUser method-1) with
`auth()` → set `AUTH_SECRET=NEXTAUTH_SECRET` in Vercel env → run full 50-test suite →
merge feature branch → push. Estimated one focused session; NOT done now to avoid
breaking SSO on a live, billing-active deployment.

## Not done in V19 (deliberately)
- MCP real billing: `bill()` in registry + facebook + seo modules is audit-insert-0
  (v11 free stance). Flipping to real deduction is a one-flag change in three files
  but needs a drained-user test pass (the V9 policy-flip playbook). Scheduled follow-up.
- FB ad creation full flow (targeting/billing/currency) is the 3-step skeleton — real
  ads need an ad account with payment method (owner has none — $0 constraint).
