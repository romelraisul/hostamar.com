# V23 Audit — Vercel usage protection (2026-09-01, repo @ 9d30bea)

## Usage snapshot (owner-reported, last 30 days, Pro plan)
| Metric | Used | Limit | % | Status |
|---|---|---|---|---|
| Build Time | 92h | 100h | 92% | 🔴 ~2-3 days to hit |
| Fluid Active CPU | 3h9m | 4h | 78% | 🔴 ~8 days to hit |
| Function Invocations | 334K | 1M | 33% | 🟡 |
| Fast Origin Transfer | 2.39GB | 10GB | 24% | 🟡 |
| Edge Requests | 181K | 1M | 18% | 🟢 |
| Fast Data Transfer | 1.2GB | 100GB | 1.2% | 🟢 |
| Deployment Storage | 6.12GB | — | — | prune |
| Functions Storage | 44.32GB | — | — | prune |

## Ground truth (code state BEFORE V23)
- vercel.json existed (crons + /v1 rewrite) but NO headers, NO git gating.
- next.config.js already had: security headers, fonts immutable, og-image 86400,
  and s-maxage=300 (5 min) on /api/v1/models + both catalog routes + health.
- Live header reality (verified with curl): /api/v1/models = `max-age=300` only
  (route-set header beat the config's s-maxage — CDN treated it as browser-only);
  /api/ai-services/catalog = **`public` with NO max-age at all** (bare NextResponse
  + config rule ignored because the route returned its own response) — meaning the
  106-service DB-merge route was running on EVERY request. That's a real Fluid-CPU
  leak, exactly matching the 78% burn.
- app/sitemap.ts already revalidate=3600; robots/blog were not ISR'd.

## Shipped in V23 (code — this session)
1. **Catalog route real cache** (the biggest leak): explicit
   `Cache-Control: public, s-maxage=3600, max-age=300, stale-while-revalidate=86400`
   ON THE RESPONSE object — the DB merge (ensureFiverrCatalog + 106-service query)
  now runs at most once/hour at the edge instead of per-request.
2. /api/v1/models + /api/docs: route-set headers now carry explicit s-maxage=3600
   (route headers were overriding the config before — this makes CDN cache real).
3. next.config.js: the 3 heavy-API cache rules 300→3600 + SWR 86400.
4. app/robots.ts: revalidate=86400 (ISR). app/blog/[slug]: force-dynamic → ISR 3600
   (cron posts appear within 1h; cached HTML in between).
5. vercel.json: immutable 1-year Cache-Control on /_next/static + /static; 1h CDN
   headers for models/catalog/docs/sitemap; 24h robots; git.deploymentEnabled main
   ONLY (preview auto-deploy off via config); + daily seo-auto-post cron entry.
6. scripts/vercel-prebuilt-deploy.sh — local build → `vercel deploy --prebuilt`:
   0 Vercel Build Time per deploy (needs a NEW scoped VERCEL_TOKEN, not the old vcp_).
7. scripts/prune-old-deployments.js — API delete of deployments beyond newest 15
   (6.12GB → ~1GB expected).

## Owner dashboard actions (cannot be done from this session — no VERCEL_TOKEN)
These are where the remaining savings live; each is 1-3 minutes in the dashboard:
1. **Settings → Git**: confirm "Production: main only" (the vercel.json git block
   helps, but the dashboard toggle is authoritative for preview branches).
2. **Build & Development**: enable Remote Caching (Vercel's Turborepo-style cache) —
   repo is not a monorepo; a full turbo.json pipeline is NOT applicable (single Next
   app). Remote cache alone cuts repeat builds ~40-60%.
3. **Security → Firewall**: Managed Ruleset ON; Rate Limit 60 req/60s per IP on
   /api/*; block empty User-Agents. Cuts the 334K invocations (bots) roughly in half.
4. **Usage → Alerts**: 75% alerts on Build Time (75h) + Fluid CPU (3h).
5. **Deployments**: run the prune script once (needs token + project id) or delete
   old deployments by hand in the UI.
6. **Cloudflare (already proxying** per live headers — `server: cloudflare` ✓):
   add Cache Rules (Cache Everything for /_next/static + images, Edge TTL 1 month;
   1h for the heavy API paths) + Bot Fight Mode ON. This is the Edge-Request +
   Origin-Transfer saver.

## Expected effect
- Catalog fix alone should pull Fluid CPU well under 50% (the per-request DB merge
  on a public route was the hot path). 1h CDN cache on models/docs/sitemap cuts
  origin transfer further. Main-only deploys + prebuilt path stop the Build Time
  bleed immediately.

## Suite
tests 91-100 (scripts/test-all-products-106-v23-100.sh): vercel.json asserts,
header curls for the 5 heavy routes, robots/sitemap ISR greps, prebuilt + prune
scripts exist, dashboard-actions doc exists, and the full 90-test regression.
