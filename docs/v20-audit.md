# V20 Audit — MCP billing flip + FB token + Vercel/token owner actions (2026-09-01)

## PHASE 1 SHIPPED: MCP billing → REAL DEDUCTION

Ground truth vs spec: the spec claimed all 3 MCP files were audit-insert-0.
Actually **facebook-mcp's bill() was already real deduction** (race-safe guarded
UPDATE + CreditTransaction audit). What was free:
- `lib/mcp/registry.ts` bill() — audit-insert 0 → **flipped to real deduction**
  (authed users pay; anonymous/cron/0-cost stays free; DB-unavailable = allow
  with remaining:-1, audit row lost — never blocks a customer on DB hiccup)
- `lib/mcp/seo-marketing-mcp/index.ts` bill() — audit-insert 0 → **flipped to real**
- `lib/mcp/facebook-mcp/index.ts` — tightened catch: remaining 6000 → -1 (fail-open
  comment updated; behavior unchanged: DB error = allow, never fail a paid customer)

### V20 cost map (registry costCr — now ENFORCED: costCr>0 + unauth → 401 at dispatch)
Core tools: analyze_image 5 · sequential_thinking 2 · deep_think 2 ·
run_browser_agent 5 · gateway_chat 1
facebook-mcp: create_post 2 · page_insights 1 · get_posts 1 · reply_comment 1 ·
create_ad 10 · ad_insights 2 · instagram_create_post 3 · get_messages 1 ·
post_reel 5 · schedule_post 2
seo-marketing-mcp: meta 1 · sitemap 1 · robots 1 · audit_page 2 · schema 1 ·
blog_post 10 · social_create_campaign 5 · schedule_posts 2 · analytics 2 ·
backlinks 5 · optimize_content 3 · auto_post_new_service 3 · faq_schema 1 ·
check_rankings 3 · hashtags 1
Free (costCr 0): search_catalog, list_webmcp_tools, activate_service (bills service
cost internally), dashboard_stats, call_webmcp_tool (routes to target tool).

Billing position: tools bill at the END of run() (post-action) — a FB API failure
still charges; that's the safer direction vs the spec's pre-charge (no double-charge
on retries). Drained-user 402 = same guarded-UPDATE pattern proven by orca
worktree 402 in core suite (V9 playbook); arranging a 0-balance test user without
admin is not feasible in this session (documented honestly in test 68).

## PHASE 2 — FB TOKEN LIVE POSTING: OWNER ACTION (cannot be done from this session)
No FACEBOOK_PAGE_ACCESS_TOKEN exists in any env file (checked .env.local, .env,
.env.example, .env.prod). A Facebook Page token requires a human logging into
Facebook as the Page owner. Exact 10-step runbook (Graph API Explorer →
me/accounts → Page token → fb_exchange_token → long-lived → Vercel env) is in
docs/v19-audit.md. Until set: every FB tool returns the honest
`FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN required` error — verified live
(test 65: honest error, 0cr charged on the failed call). NEVER fake a post.

## PHASE 3+4 — DUPLICATE VERCEL DELETE + vcp_ ROTATION: OWNER ACTIONS
No VERCEL_TOKEN in env; the vcp_ pasted in an earlier chat must be ROTATED and
never re-used or re-pasted (standing security rule). 60-second dashboard path:
1. Vercel → Account → Tokens → DELETE the old vcp_ token (kills the leak)
2. Create new token: scope = hostamar-build ONLY, 90 days → store as env var
   VERCEL_TOKEN locally (never in chat)
3. Vercel → Projects → `hostamar.com` (hostamarcom-*.vercel.app) → Settings →
   Delete Project → type "hostamar.com" → Delete. Keep hostamar-build only.
4. Verify: `curl https://hostamar.com/api/health` still 200 (hostamar-build owns
   the domain). Future deploys count for ONE project only.

## PHASE 5 — NEXTAUTH V5: dedicated-session plan (unchanged from v19-audit)
Current: next-auth@^4.24.13 + @auth/core@^0.34.3 + @auth/prisma-adapter@^2.11.2
already in package.json. Production auth = custom JWT (lib/auth.ts) — INDEPENDENT.
Migration touches only lib/auth-config.ts + app/api/auth/[...nextauth]/route.ts.
Branch feature/nextauth-v5, full 60/70 suite re-run before merge. NOT done this
session — SSO on a live billing site with zero SSO users today is not worth the
regression risk without a dedicated window (per owner: "when you schedule it").

## Verification (V20)
- tsc 0 · vitest 25/25 · build ✓ Compiled
- suite v20-70 live: 60 core + 10 billing (real deduction 1cr/2cr deltas verified
  against /api/dashboard/credits balance before/after)
- test 65 asserts the HONEST no-token state + 0cr charged (flip assertion to
  postId when the Page token lands)
