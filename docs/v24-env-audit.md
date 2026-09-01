# V24 Env Audit — full computer scan (2026-09-01, repo @ 7e7b9a8)

## Method
Walked `/home/romel` (depth ≤4, node_modules/.git/.next excluded) + shallow
`/mnt/c/Users/User` for `.env*` files: **335 env files found**. Keys inventoried by
NAME only (values never printed — redaction rule). Non-empty credential check ran
a second grep restricted to non-template files.

## Findings (the honest table)

| Credential | Status | Where |
|---|---|---|
| FACEBOOK_PAGE_ACCESS_TOKEN | **NOT FOUND** (only empty `.env.example` template, 0-length) | — |
| FACEBOOK_PAGE_ID / IG_USER_ID / AD_ACCOUNT_ID / APP_ID+SECRET | **NOT FOUND** (no non-template hits) | — |
| GOOGLE_SERVICE_ACCOUNT_JSON | **NOT FOUND** (content scan for `service_account` JSON across hostamar dirs, Downloads: zero files) | — |
| VERCEL_TOKEN | **NOT FOUND** (no vct_/vcp_ in any env file — consistent with V19–V23: the pasted vcp_ was chat-only and must stay revoked) | — |
| TURBO_TOKEN / TURBO_TEAM | **NOT FOUND** | — |
| BING_WEBMASTER_KEY | **NOT FOUND** | — |
| SERPAPI_KEY | **NOT FOUND** (empty template only) | — |
| OPENAI_API_KEY | found — Hermes agent env + hostamar-build .env.local (LIVE, used by gpt-researcher/dev; NOT a FB/GSC/Vercel cred) | multiple |
| KILOCODE_API_KEY | found + LIVE (already wired — powers the model chain in prod) | multiple |
| CLOUDFLARE_API_TOKEN + ZONE_ID | found in .env.example templates + hostamar-build envs | templates + some live |
| DATABASE_URL / NEXTAUTH_SECRET / JWT_SECRET / CRON_SECRET / REDIS_URL | found (already wired — the app runs on them) | multiple |
| B2_* | found in prod config (already wired — storage works) | .env/.vercel config |

## Conclusion — no wire-able tokens exist on this machine
The V24 hypothesis ("check all env, you'll find FB/GSC/Vercel keys, wire them") is
DISPROVEN by a full scan: **none of the six missing credentials (FB Page token,
GSC service-account JSON, VERCEL_TOKEN, TURBO_TOKEN, BING key, SERPAPI key)
exists in any of the 335 env files.** The keys found (OPENAI, KILOCODE, DATABASE,
CRON_SECRET, B2) were already wired in earlier versions — they are the ones the
site runs on today.

That is CONSISTENT with how these credentials work:
- A Facebook Page token can only be minted by a human logging into Facebook as the
  Page owner (Graph API Explorer) — it cannot exist on disk before that.
- A GSC service-account JSON is created in Google Cloud Console and its client
  email must be added as Owner in Search Console — no local file exists.
- Vercel tokens are created in the dashboard; the only one ever seen was pasted in
  chat (vcp_…) and must remain revoked for security.

So "no more owner actions — automate via API" is NOT achievable for these six:
there is nothing to wire. The honest state machine stands: MCP tools already
return "FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN required" / "GOOGLE_
SERVICE_ACCOUNT_JSON missing" and tests 102/103/105/106 branch HONEST/LIVE.

## What CAN be automated (and is already shipped in V23)
scripts/vercel-prebuilt-deploy.sh + scripts/prune-old-deployments.js — they read
VERCEL_TOKEN from env the moment one is created; zero further code needed.

## Security observations from the scan (worth acting on)
1. `.env.local.merged` (spec step 5) would DUPLICATE secrets across even more
   files — NOT created (increases leak surface; the repo already has the right
   env wired where it matters).
2. The archived Windows copies (`hostamar.com.ARCHIVED-20260819`) and
   `hostamar-build-verify` carry real DATABASE_URL/NEXTAUTH_SECRET duplicates.
   Recommend deleting those archives when convenient (owner housekeeping — not
   urgent since the machine is single-user, but they rotate if ever leaked).
3. CRON_SECRET exists in some old copies — prod CRON_SECRET remains owner-only
   (not on this machine's readable envs in plaintext), which is correct.
