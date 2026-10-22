# Phase 1-3 Implementation Report — Stability + Growth + Features

Date: 2026-10-22 · Repo: `/home/romel/hostamar.com` (branch `main`) · Mode: NO re-deploy (live build already current)

## Final state

| Item | State | Evidence |
|---|---|---|
| Live build | `L0HWuvduFzDNQQ67Uawvx` (local `.open-next/assets/BUILD_ID` == live flight) | curl + cat |
| Workers routes | exactly 1: `api.hostamar.com/* → api-router` (untouched) | CF API |
| Custom domains | exactly 2: hostamar.com + www → hostamar-pages production (enabled) | CF API |
| KV `HOSTAMAR_CATALOG` | `7ce14c69f70d48449dd50edd4be3dca3` untouched (zone id never substituted) | docs/ENV_ORGANIZATION.md |
| Wrangler auth | OAuth `romelraisul@gmail.com`; `CLOUDFLARE_API_TOKEN` unset in WSL env, `~/.hermes/.env`, PS User+Machine | audit |
| Probe worker | deployed `hostamar-probe`, cron `*/5`, verdict UP, `telegram=200 slack=200` | workers.dev GET / |
| B2 ISR cache | 6,518 objects / 17 builds; `--verify 462` exit 0, `--verify 99999` exit 1 | scripts/populate-b2.mjs |
| Live /pricing | 200, bp-price grep ×8 (4 DOM nodes + 4 RSC-flight copies), JSON-LD 990/BDT intact | curl |
| Prerendered /pricing | FAQ ×3 (কেন ৳৯৯০ / bKash/Nagad / ৩০ দিন), SSL + ২৪/৭ + bKash + Nagad badges, JSON-LD Offer ×3 | .next/server/app/pricing.html |
| Vercel hostamar-build | NOT deleted (user confirmation pending); still auto-deploys on push | — |

## Phase 1 — Stability
1.1 ENV guard: token removed everywhere (WSL, .env, PS scopes); wrangler OAuth live. DONE.
1.2 `.wslconfig`: **DEVIATION** — requested `memory=16GB processors=6` NOT applied; existing
    `memory=36GB processors=10` retained because live `open-webui` inside WSL needs ~27GB and
    lowering RAM OOM-kills it. Revisit only with a smaller model host.
1.3 TV artifact: heavy file is `app/tv/loop.mp4/loop.mp4` (194,649,042 B), git-ignored via `*.mp4`,
    UNTRACKED, and already served byte-identically from B2 bucket `hostamar-prod` (private, proxied
    by `app/tv/loop.mp4/route.ts`). No duplicate upload to `hostamar-assets` (real bucket is
    hostamar-prod). Docs: `docs/TV_ASSETS.md`. DONE.
1.4 Probe: `workers/probe/index.js` edge check — 3 URLs (apex/www/pricing), HTTP 200, 526/1102 dead,
    `৯৯০` DOM check, TTFB>1s + cf-cache MISS recorded (not failed — cold POP is normal), two-strike
    alert via TELEGRAM_BOT_TOKEN + SLACK_WEBHOOK_URL, cron `*/5`. DEPLOYED and verified live.
1.5 B2 weekly CI: `.github/workflows/model-heal.yml` schedule `0 3 * * 1`, step
    `node scripts/populate-b2.mjs --verify 462` (script exits nonzero below threshold), GitHub
    secrets `B2_KEY_ID`/`B2_APP_KEY`/`B2_BUCKET`/`B2_ENDPOINT` mapped to the script's env names.

## Phase 2 — Growth
2.1 Pricing conversion: `app/pricing/page.tsx` — FAQ section (3 Qs) + trust badges row
    (bKash, Nagad, SSL সিকিউর, ২৪/৭ সাপোর্ট) as inline SVG under existing `bp-*` styles.
    JSON-LD untouched (price 990, priceCurrency BDT, 3 Offers). Not yet live (see deploy note).
2.2 SEO: live sitemap already includes `/pricing`; `public/robots.txt` rewritten — `Allow: /`,
    admin/API disallows, `Sitemap:` + `Host:` lines. OG image for /pricing resolves via
    existing app-level metadata + `public/opengraph-image.png`.
2.3 Analytics: `app/layout.tsx` — CF Web Analytics beacon gated on `CF_WEB_ANALYTICS_TOKEN`
    (absent today → nothing renders); literal HTML comment `<!-- Meta Pixel for 990 conversion -->`
    in output; no token hardcoded.

## Phase 3 — Features & Protection
3.1 WAF/rate limit: **APPLIED 2026-10-22 15:36 +06** — 2 rules live on zone 2aef176c6f2000da2af593f4890ec298:
    (1) rate limit api.hostamar.com — 100 req/10s per IP (cf.colo.id+ip.src), block 10s. NOTE: free plan
        caps mitigation_timeout at 10s; the requested 60s needs Pro plan (script marked with the cap).
    (2) custom rule api-curl-block — curl User-Agent blocked on api.hostamar.com/v1*.
        Functionally verified: curl UA → 403 at /v1/models; browser UA → 401 (reaches API auth).
    Applied with the dash-created scoped token (Zone.WAF Edit + Rate Limiting Edit) via
    `scripts/add-api-waf-rules.sh`; script also fixed to create phase entrypoints when CF returns
    10003 (no ruleset yet). Routes after WAF: exactly 1 (api.hostamar.com/* → api-router).
    It adds: rate limit 100 req/10s per IP block 60s on `api.hostamar.com` (free plan allows one
    rate rule, covers the >50 curl flood), and a custom rule blocking `curl` UA on
    `api.hostamar.com/v1/*` (billing/webhook `/api/*` left UA-agnostic so payment callbacks
    never break). Routes verified intact after the attempt.
3.2 Live chat: `fb-customerchat` div rendered when `NEXT_PUBLIC_FB_PAGE_ID` is set; otherwise a
    literal HTML comment placeholder (`set NEXT_PUBLIC_FB_PAGE_ID to enable Messenger chat`).
3.3 Auto-purge guard: `scripts/deploy-guarded.sh` + `npm run deploy:guarded` — reads
    `.open-next/assets/BUILD_ID` (real OpenNext output path), warns if a plain `next build` left
    `.next/BUILD_ID` newer than the shipping artifact, compares to live flight buildId, and SKIPS
    deploy AND purge when unchanged. Verified live: `local(ships)=L0HWuv… live=L0HWuv… → skip`.

## Deploy note
Per instruction "don't re-deploy unless needed": the pricing/layout/robots changes are built and
verified in `.next` but NOT yet deployed — live == shipping build `L0HWuvduFzDNQQ67Uawvx`. Deploy
when ready with `npm run deploy:guarded` (it rebuilds the worker, deploys, waits out the 1-2 min
edge staleness, purges only on a changed build). Expected post-deploy live checks: FAQ + badge
strings on /pricing, comment placeholders, bp-price count unchanged (8).

## Git
10 modified + new files (`docs/TV_ASSETS.md`, `scripts/deploy-guarded.sh`,
`scripts/add-api-waf-rules.sh`, `docs/PHASE_1_3_IMPLEMENTATION.md`, `docs/FINAL_HANDOVER.md`,
`public/hostamar5d9hk1rwnux.txt`, `public/og/tv/*.jpg`), NOT committed (user asked diff only).
No `.mp4` staged anywhere.
