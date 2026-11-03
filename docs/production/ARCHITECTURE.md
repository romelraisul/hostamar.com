# ARCHITECTURE — Full Stack Map

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** LIVE — 13/13 endpoints green

---

## Production Topology (Verified Live)

```
Cloudflare zone hostamar.com
 ├─ hostamar.com / www      AAAA 100:: (Pages-managed) → Next.js app (OpenNext worker hostamar-pages)
 │    ├── /tv /api/tv /api/tv/* /models.json  → f005 CDN Worker → B2 private (Cache API, 5min TTL)
 │    └── everything else                        → Next.js origin (hostamar-pages worker)
 ├─ api.hostamar.com        Worker api-router (api-primary.hostamar.com tunnel 2d67d851)
 │    ├── PRIMARY   omni :20128 via Cloudflare tunnel "hostamar-primary" (2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f)
 │    └── FALLBACK  hostamar.alwaysdata.net (circuit breaker: 2 fails → skip primary 60s)
 └─ WAF                     rate limit 100 req/10s per IP
```

---

## Frontend / App Layer

- **Next.js 14.2.35** (App Router) + React 18.3.1, Tailwind 3.4.1, TypeScript 5.3.3
- **Primary origin:** Cloudflare Pages via OpenNext (`@opennextjs/cloudflare` 1.20.12)
- **Worker config:** `wrangler-pages.toml` (top-level keys only, no routes in TOML), `open-next.config.ts`
- **Externals:** `["node:sqlite", "@libsql/isomorphic-ws"]` — stubbed in `scripts/patch_handler_sqlite.mjs` (11 occurrences)
- **Build:** `npm run worker:build` → `npx wrangler deploy -c wrangler-pages.toml`

---

## TV / CDN Layer (f005-cdn Worker)

- **Worker:** `hostamar-f005-cdn` (`workers/f005-cdn/src/index.ts`)
- **Storage:** B2 bucket `hostamar-prod` (PRIVATE, us-east-005, 324 mp4, 1.7GB/10GB)
- **Delivery:** AWS SDK S3Client + `getSignedUrl` (SigV4) → Bandwidth Alliance free egress
- **Manifests:** `tv.json`, `models.json`, `live.json` synced via `scripts/sync-manifest-to-b2.mjs`
- **Routes:** `hostamar.com/models.json`, `hostamar.com/tv`, `f005.hostamar.com/*`
- **Secrets:** `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY` via `wrangler secret put` (currently in vars, migrating to secrets)

---

## API Gateway Layer (api.hostamar.com)

- **Worker:** api-router (separate from hostamar-pages)
- **Primary:** `omni :20128` via Cloudflare tunnel `hostamar-primary` (2d67d851)
- **Fallback:** `hostamar.alwaysdata.net` (1GB forever free)
- **Circuit breaker:** 2 consecutive failures → skip primary for 60s, serve queued 202
- **Rate limit:** Cloudflare WAF 100 req/10s per IP

---

## Database Layer

- **Primary:** Turso (libsql) — `@libsql/client/web` fetch-only (HTTPS/Hrana over 443)
- **Edge pattern:** `getTursoEdgeClient()` in `lib/turso-edge.ts` — converts `libsql://` → `https://`
- **Mirrors:** 6h schedule Turso → Supabase → Neon (GitHub Actions, currently gated by GitHub suspension)
- **Local:** Podman postgres:15432 (Infisical DB), postgres-infisical:15433 (real), postgres-15432 (decoy)

---

## Local Fleet (WSL Podman)

| Container | Port | Status |
|-----------|------|--------|
| hostamar-postgres | 15432 | Up (decoy) |
| postgres-infisical | 15433 | Up (real Infisical DB) |
| redis-infisical | 6379 | Up |
| redis-foundation | 6380 | Up |
| forgejo | 3000 | Up (git.hostamar.com) |
| webcmd | 3001 | Up |
| gateway | 11442 | Up |
| agent-s | 8765 | Up |
| openwebui | 3003 | Up |
| uptime | 3002 | Up |
| minio | 9000 | Up |
| tv-rtmp | 1935/8088 | Up |
| tv-hls2 | 8090 | Up |
| infisical | 8089 | Up |

---

## Auth Architecture

- **Custom JWT:** HS256 via `lib/auth-utils.ts` (node:crypto, timingSafeEqual)
- **verifyToken:** Ultra-defensive — handles null/undefined/non-string/short strings
- **NextAuth:** **Removed from worker** — `[...nextauth]/route.ts` returns 501 stub
- **Admin:** `requireAdmin()` in `lib/auth.ts` uses Turso edge client inline
- **TV Agent:** `TV_AGENT_SECRET` header/query auth for `/api/tv/agent/commands`

---

## DNS & Certificates

- **AAAA 100::** — Cloudflare Pages managed, **NEVER DELETE**
- **Custom domains:** hostamar.com + www.hostamar.com attached to hostamar-pages worker via dashboard (not TOML routes)
- **Cert SAN:** hostamar.com, www.hostamar.com, *.www.hostamar.com (Google Trust WE1, valid to 2027-01-17)
- **Vercel CNAMEs:** deleted before worker custom domain attach

---

## Git Remotes

| Remote | URL | Status |
|--------|-----|--------|
| forgejo | https://git.hostamar.com/romel/hostamar.com.git | **LIVE** (SQLite, tunnel 5affa5bd) |
| gitlab | https://gitlab.com/romelraisul/hostamar.com.git | Mirror |
| codeberg | https://codeberg.org/romelraisul/hostamar.com.git | Quota-blocked |
| github | git@github.com:romelraisul/hostamar.com.git | Suspended (appeal #4892433) |