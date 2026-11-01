# ARCHITECTURE — full stack map: Vercel Next.js edge, Cloudflare Workers, B2 signed delivery, Turso mirror chain, WSL local fleet.

## Production topology (verified live)

```
Cloudflare zone hostamar.com
 ├─ hostamar.com / www      AAAA 100:: (Pages-managed) → Next.js app
 │    ├── /tv /api/tv /api/tv/live /models.json  → f005 CDN Worker → B2 (Cache API, 5min TTL)
 │    └── everything else                        → Next.js origin (Vercel project hostamar-build;
 │                                                  OpenNext worker path exists as second surface)
 ├─ api.hostamar.com        Worker api-router
 │    ├── PRIMARY   omni :20128 via Cloudflare tunnel "hostamar-primary"
 │    └── FALLBACK  hostamar.alwaysdata.net (circuit breaker: 2 fails → skip primary 60s)
 └─ WAF                     rate limit 100 req/10s per IP
```

## Frontend / app layer

- Next.js **14.2.35** (App Router) + React 18.3.1, Tailwind 3.4.1, TypeScript 5.3.3.
- Primary origin: **Vercel, project hostamar-build — deploy = push to main.**
- Cloudflare Workers path via OpenNext (`@opennextjs/cloudflare` 1.20.12,
  `wrangler-pages.toml`, `open-next.config.ts`): `worker:build` chain runs
  opennextjs-cloudflare build → `scripts/patch_handler_sqlite.mjs` (stubs
  `require("node:sqlite")` in `.open-next/.../handler.mjs` — node:sqlite does not exist in
  workerd) → `scripts/sync-manifest-to-b2.mjs` (uploads models.json + regenerates tv.json
  from the live DB count). Externals kept: `["node:sqlite", "@libsql/isomorphic-ws"]`.
- Prisma 5.22.0 with `@prisma/adapter-libsql` 5.22.0 over `@libsql/client` 0.14.0; on
  Workers the WASM engine + `@libsql/client/web` fetch adapter (no fs, no native deps).

## Media delivery (never make the bucket public)

- Backblaze B2 bucket **hostamar-prod** is PRIVATE. Delivery = Cloudflare Worker issues
  **signed URLs** (AWS SDK S3Client getSignedUrl, S3-compatible endpoint
  s3.us-east-005.backblazeb2.com). Egress is free via the **Bandwidth Alliance**
  (B2 + Cloudflare). Media CDN host: `f005.backblazeb2.com/file/hostamar-prod`.
- f005 CDN Worker caches manifests at the edge (Cache API, CACHE_TTL=300) and stamps
  `X-Source: b2-live | b2-cache | nextjs-live | fallback-b2-miss | fallback-zero`.

## Data layer

- Primary DB: **Turso** (libsql). Mirror chain **Turso → Supabase → Neon** on a 6h
  schedule (GitHub Actions workflow definition; GitHub push itself is currently blocked —
  appeal #4892433 — so treat GitHub-hosted automation as at-risk and keep Forgejo green).
- See DATA.md for store-by-store detail.

## Model catalog + gateway

- `/models.json` = version 40: `models.total` 152, categories 10, edge_tools 53,
  renders 168; served from B2 through the f005 worker (4491 bytes).
- `/v1` model gateway on api.hostamar.com (routed by api-router to omni :20128).
- Local LLM guard: nvidia guard at `127.0.0.1:12436/v1` — 6 models
  (z-ai/glm-5.3-flash, deepseek-v4.1-flash, minimax-m3.1-flash, step-5-preview,
  nemotron-3-ultra-550b, nemotron-3.5-bolt); fallback kilo.ai (384 models).

## Local fleet (WSL2; host not always-on)

- **podman**: infisical, postgres-15432, redis-infisical, forgejo, hostamar-tv-rtmp,
  openwebui, code-server, uptime, minio, puppy-linux.
- **docker** (11 containers): teldrive, teldrive-db, litellm-play, freellmapi, host-hls2,
  cloudflare-tunnel, redis-foundation, medusa-wsl, coolify-wsl, openobserve-wsl,
  **hostamar-postgres** (owns host port 5432; dbs: forgejo, medusa, coolify, infisical,
  teldrive). Rule: new services reuse hostamar-postgres + redis-foundation — no new
  Postgres/Redis instances.
- Secrets: self-hosted **Infisical** on :8089 (project
  10b51614-379b-48e6-b014-80f3517be157), env mirror `/home/romel/automation/infisical.env`
  chmod 600. Logs: OpenObserve `hostamar_logs`.

## Key paths

```
app/                 Next.js App Router (tv, tv/watch/[slug], admin, api/*, ...)
lib/tv/              TV pipeline (config, generator, hunter, streamer, nowPlaying)
workers/             api-router.js, f005-cdn, probe, video-generation.ts
scripts/             200+ ops scripts (sync-manifest-to-b2.mjs, patch_handler_sqlite.mjs,
                     check-vercel-quota.sh, deploy-guarded.sh, add-api-waf-rules.sh)
prisma/schema.prisma schema (libsql provider, driverAdapters)
wrangler.toml        api-router config (route managed in dashboard; token lacks zone-routes)
wrangler-pages.toml  OpenNext worker config + workerd externals
```

## Rules

- **B2, not R2.** All manifests and video assets live on Backblaze B2 hostamar-prod.
- **AAAA `100::` records for hostamar.com/www are Pages-managed — NEVER delete.**
- The api-router worker only proxies: no app logic, no secrets, far under the 10ms CPU
  limit; origins repointed via `wrangler secret put`, not redeploy.
- No endpoint returns raw SQL errors; fail to a typed JSON error.
- Verify every deploy with the 4x200 probe + TESTING.md assertions.
