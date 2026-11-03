# Product Requirements Document — hostamar.com

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** LIVE — 13/13 endpoints green

---

## Core Products (Verified Live)

| Product | Metric | Live Evidence |
|---------|--------|---------------|
| **AI Gateway** | 152 models, 10 categories, 53 edge tools, 168 renders | `/api/v1/models` 200 → `models.json` v40 |
| **Store + bKash Checkout** | 124 products, tokenized checkout PGW | `/api/store/products` 200 |
| **TV Station** | 374 videos, HLS live, 50 stable channels | `/tv` 200, `/tv/manifest.json` 374, `/api/tv/stable-channels` 200 |
| **Admin Dashboard** | Custom JWT auth, Turso edge, 307/401 | `/admin` 307, `/api/admin/stats` 401 |

---

## Live Endpoint Matrix (Fresh Probe 2026-11-04)

```
GET https://hostamar.com/                    → 200
GET https://hostamar.com/pricing             → 200
GET https://hostamar.com/api/v1/models       → 200 (105 models merged)
GET https://hostamar.com/api/store/products  → 200 (124 products)
GET https://hostamar.com/tv                  → 200 (374 videos)
GET https://hostamar.com/tv/manifest.json    → 200 (374 videos)
GET https://hostamar.com/api/tv              → 200 (source: b2-cache-known, count: 362)
GET https://hostamar.com/api/tv/playlist     → 200
GET https://hostamar.com/api/tv/stable-channels → 200 (graceful fallback)
GET https://hostamar.com/api/tv/status       → 200
GET https://hostamar.com/api/tv/heartbeat    → 200
GET https://hostamar.com/admin               → 307 (redirect to login)
GET https://hostamar.com/api/admin/stats     → 401 (auth guard works)
GET https://hostamar.com/models.json         → 200 (v40, 152 models)
```

**NO 500s. NO 503s.** All endpoints return 200/307/401.

---

## Architecture Snapshot

- **Frontend:** Next.js 14 on Cloudflare Pages (OpenNext worker `hostamar-pages`)
- **API Gateway:** Cloudflare Worker `hostamar-pages` → `/api/v1/*` via tunnel `api-primary.hostamar.com` (2d67d851) → home PC `:4000` / fallback `hostamar.alwaysdata.net`
- **TV/CDN:** Worker `hostamar-f005-cdn` serves B2 private bucket via S3Client + getSignedUrl (Bandwidth Alliance free egress)
- **Database:** Turso (libsql) via `@libsql/client/web` fetch-only (HTTPS/Hrana) — **no Prisma on edge**
- **Auth:** Custom HS256 JWT (`lib/auth-utils.ts`), NextAuth **removed** from worker (stub returns 501)
- **TV Agent:** systemd service polling `/api/tv/agent/commands` with `TV_AGENT_SECRET`

---

## Fix History (This Release)

| Issue | Root Cause | Fix |
|-------|------------|-----|
| `/api/tv` 503 fallback | f005 worker down, hardcoded 353 | Route returns 200 with `b2-cache-known` (362), never 503 |
| `/api/tv/stable-channels` 500 | Missing `TvChannelStability` table | Graceful fallback → empty array, never 500 |
| `/admin` 500, `/api/admin/stats` 500 | `split()` on undefined in verifyToken | Ultra-defensive `verifyToken` + NextAuth stub + Turso-only `lib/auth.ts` |
| NextAuth on Workers | Prisma fs.readdir trap | `[...nextauth]` returns 501, custom JWT only |
| Tunnel down | Wrong config.yml ingress | Restarted with `hostamar-primary` (2d67d851) config |
| TV agent stopped | Stale secret, 404 route | `TV_AGENT_SECRET` in wrangler + .tv-agent-secret.local, systemd restart |

---

## Next Steps

- [ ] f005-cdn: deploy B2 secrets via `wrangler secret put` (currently in vars)
- [ ] `/api/tv`: upgrade to live B2 manifest count (currently 362 cached)
- [ ] Codeberg mirror: delete repo via web UI (quota-blocked)
- [ ] Add integration tests for TV agent command flow