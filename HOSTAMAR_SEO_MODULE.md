# Hostamar SEO Module — Preferred Sources + Google + Bing + Microsoft Graph

Production module for hostamar.com (Next.js 14 App Router on Vercel). All API keys are read from environment at runtime — never hardcoded, never logged.

## What it does

1. **Preferred Source badge** (Google official 2025-08-20 spec) auto-injected at the end of every blog post. Readers click → Hostamar becomes their Preferred Source → more Top Stories + AI Overview visibility.
2. **Google Indexing API** — submit URL_UPDATED when you want fresh content picked up fast.
3. **Search Console URL Inspection** — checks if a page is indexed + canonical-on-domain (the prerequisite for Preferred Source eligibility).
4. **Bing Webmaster** — SubmitUrlBatch + crawl stats.
5. **Microsoft Graph** — send the Preferred Source campaign email via your own tenant mailbox; upload article markdown backups to OneDrive.
6. **Click analytics** — every badge click lands in Postgres (`SeoEvent`) + GA4 `preferred_source_click` event.

## Files

```
components/seo/PreferredSourceBadge.tsx     # 'standard' (official btn) | 'custom' (Hostamar brand)
lib/seo/preferredSourcesInjector.tsx        # WordPress-style filter: inject unless preferredSource:false
lib/google/auth.ts                          # service-account JWT -> access token (zero deps, node crypto)
lib/google/indexingApi.ts                   # urlNotifications:publish
lib/google/searchConsole.ts                 # urlInspection + eligibility check
lib/bing/webmaster.ts                       # SubmitUrlBatch + GetCrawlStats
lib/microsoft/graphClient.ts                # client-credentials OAuth2, sendMail, OneDrive
lib/microsoft/sendPreferredSourceCampaign.ts# campaign mail with deeplink
app/api/seo/submit/route.ts                 # POST admin: Google+Bing parallel submit (+inspect)
app/api/seo/bing/submit/route.ts            # POST admin: Bing only
app/api/seo/bing/stats/route.ts             # GET admin: Bing crawl stats
app/api/seo/track/route.ts                  # POST public: badge click analytics
app/api/auth/microsoft/route.ts             # GET admin: Graph health | POST admin: send campaign
app/api/cron/seo-sync/route.ts              # daily cron: inspect blog + bing stats + report
prisma/schema.prisma                        # SeoEvent model
```

## Env vars to add (Vercel → Project Settings → Environment Variables)

| Key | Required for | Where to get |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Indexing API + Search Console | console.cloud.google.com → IAM → Service Accounts → Keys → JSON. Enable "Web Search Indexing API" + "Search Console API". Add the `client_email` as a **Delegated Owner** in Search Console → Settings → Users. |
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` | GSC calls | Exactly as shown in GSC: `https://hostamar.com` (URL-prefix property) or `scdomain:hostamar.com` (Domain property) |
| `BING_WEBMASTER_API_KEY` | Bing submit/stats | bing.com/webmasters → Settings → API access |
| `MICROSOFT_GRAPH_CLIENT_ID` / `_SECRET` / `_TENANT_ID` | Campaign mail / OneDrive | portal.azure.com → App registration → client secret. **API permissions:** `Mail.Send`, `Files.ReadWrite.All` (Application) + admin consent |
| `MICROSOFT_GRAPH_SENDER` | sendMail from app-only token | Mailbox that will send (e.g. `newsletter@hostamar.com`) |
| `MICROSOFT_GRAPH_DRIVE_ID` | OneDrive backup | Graph explorer: `GET https://graph.microsoft.com/v1.0/me/drive` → `id` |
| `CRON_SECRET` | protects `/api/cron/seo-sync` | any random string |

None of them are required for the module to boot — every integration reports `missing` and skips gracefully.

## Test URLs (after deploy)

```bash
# Badge click analytics (public)
curl -X POST https://hostamar.com/api/seo/track -H "Content-Type: application/json" \
  -d '{"type":"preferred_source_click","url":"/blog/ai-marketing-video"}'

# Daily sync report (cron or secret)
curl "https://hostamar.com/api/cron/seo-sync?secret=$CRON_SECRET"

# Admin endpoints need an auth_token cookie of an admin user:
#   POST /api/seo/submit         {urls:[...], inspect:true}
#   GET  /api/seo/bing/stats
#   POST /api/auth/microsoft     {to:"you@example.com"}   <- test campaign mail
```

## Opt a post out of the badge

In `lib/blog.ts`, add `preferredSource: false` to that post object.

## Deeplink for email/social (no code needed)

https://www.google.com/preferences/source?q=hostamar.com
