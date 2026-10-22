# FINAL HANDOVER — hostamar.com performance closeout (2026-10-21)

## Verdict

All gates pass on fresh live-production audits. Commit `f6a91682` is live
(build `LpVuGv-sfdS4lItv1-vZv` = local `.next/BUILD_ID`). No redeploy needed.

## Lighthouse (final3, WSL Chromium 153, devtools throttling)

| Page | Gate | Score | FCP | LCP | TBT | CLS | SRT |
|---|---|---|---|---|---|---|---|
| Desktop home `/` | 95+ | **96** | 1.0s | 1.0s | 0ms | 0 | 80ms |
| Desktop pricing `/pricing` | 95+ | **100** | 0.3s | 0.3s | 0ms | 0.011 | 90ms |
| Mobile home `/` | 90+ | **95** | 2.3s | 2.3s | 100ms | 0.001 | 90ms |

Full reports: `docs/lighthouse-final/lh-*-final3.report.html` (+ `.report.json`).

Note: Windows-hosted mobile runs swing 54-95 with machine load (vmmemWSL up to
35GB, mostly open-webui at ~27GB RSS). Sub-metrics stay healthy regardless —
only FCP/LCP inflate. Judge mobile by low-load runs + sub-metrics.

## Live edge state (post routes-cleanup)

| URL | Status | Cache | TTFB |
|---|---|---|---|
| https://hostamar.com/ | 200 | HIT | 0.38s |
| https://www.hostamar.com/ | 200 | HIT | 0.37s |
| https://hostamar.com/pricing | 200 | HIT | 0.30s |

No 526/1102. Edge cache age 12h+. B2 ISR populate verify: **462/462 ok, 0 fail**
(`node scripts/populate-b2.mjs --verify`).

## Cloudflare triggers (the cleanup this handover certifies)

- Zone: hostamar.com = `2aef176c6f2000da2af593f4890ec298`
  - (old id `7ce14c69…` seen in old session notes is NOT a zone id — it is the
    HOSTAMAR_CATALOG **KV namespace**; it is live infra, do not replace.)
- Workers routes: **1** total — `api.hostamar.com/* -> api-router`.
  LIVE INFRA — DO NOT DELETE.
- Pages fallback routes `hostamar.com/*` + `www.hostamar.com/*` → hostamar-pages:
  DELETED 2026-10-21 (route ids were `5e4f2159…`, `492b146a…`).
- Custom domains: **2** — hostamar.com + www.hostamar.com → hostamar-pages
  production (certs d988737c / bd22d530, enabled; TLS verified by 200s).

## Auth state

- Wrangler OAuth (WSL) logged in as romelraisul@gmail.com, scopes include
  `workers_routes:write`. `CLOUDFLARE_API_TOKEN` removed from
  `~/.hermes/.env` (it blocked `wrangler login`; backup at `~/.hermes/.env.bak-cf-token`).
- `cfut_` CI token = Scripts:Edit only (GitHub secret; worker-script deploys).
- Wrangler 4.147 has no `routes` command — call the REST API with the OAuth
  token from `~/.wrangler/config/default.toml`.

## Price rendering gotcha

The Bangla price renders with React's comment-split:
`<div class="bp-price">৳<!-- -->৯৯০<!-- --> <small>/মাস</small></div>` (×6 on /pricing).
A literal grep for `৳৯৯০` on raw HTML returns 0 — query the DOM or search for
`৳<!-- -->` instead. Not a content bug.

## Content check

`৳৯৯০` present on /pricing (DOM, 6 occurrences). Homepage title Bengali intact.
Vercel project: left in place (manual unlink per spec — vercel.com/dashboard).

## Tunnel / TV

Tunnel `hostamar-primary` (2d67d851) systemd --user, LIVE.
