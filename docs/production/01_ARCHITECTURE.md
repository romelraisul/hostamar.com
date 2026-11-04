# Hostamar.com — Architecture

**Last verified:** 2026-11-04 13:25 Asia/Dhaka

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE EDGE (Global Anycast)                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  hostamar-pages Worker (OpenNext)                                    │   │
│  │  - Serves Next.js app (/_next/*, /login, /tv, /admin, /api/*)        │   │
│  │  - KV: HOSTAMAR_CATALOG (model catalog, binance_rate)                │   │
│  │  - B2 Incremental Cache (hostamar-prod, S3 API)                      │   │
│  │  - Custom domains: hostamar.com, www.hostamar.com                    │   │
│  │  - Routes: hostamar.com/*, www.hostamar.com/*                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  hostamar-f005-cdn Worker                                            │   │
│  │  - /tv/*.mp4 → S3 getSignedUrl → stream from B2 private             │   │
│  │  - /tv/manifest.json → proxies Next.js origin                        │   │
│  │  - /models.json → B2 cache or Next.js fallback                       │   │
│  │  - /api/tv/* → B2 cache or Next.js fallback                          │   │
│  │  - Routes: hostamar.com/tv/*, hostamar.com/api/tv/*, f005.*          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│   TURSO (libSQL)      │  │   BACKBLAZE B2        │  │   API GATEWAY         │
│   - Edge client       │  │   - hostamar-prod     │  │   (api.hostamar.com)  │
│   - @libsql/client/web│  │     324 MP4, 1.7GB    │  │   CF Worker PRIMARY   │
│   - HTTP over 443     │  │   - Private, signed   │  │   → omni :20128       │
│   - No Prisma in edge │  │   - Bandwidth Alliance│  │   FALLBACK → alwaysdata│
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
              │                      │                      │
              ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WSL (Source of Truth)                              │
│  - Hermes Agent (primary)                                                   │
│  - Podman fleet: postgres-15432, redis:6379, webcmd:3001, forgejo:3000     │
│  - gateway:11442, agent_s:8765, tv-hls2:8090, teldrive:8091               │
│  - Infisical:8089 (postgres-infisical:15433, 773 tables, 171 secrets)     │
│  - nvidia-guard:12436 (5 live models)                                      │
│  - Tunnels: hostamar-primary, git, ai, comfy, browser                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. Edge-First Runtime (OpenNext on Cloudflare Workers)
- `wrangler-pages.toml`: `compatibility_flags = ["nodejs_compat"]`
- `open-next.config.ts`: `useWorkerdCondition: true`, `external = ["node:sqlite", "@libsql/isomorphic-ws"]`
- Prisma **excluded** from worker bundle (`@libsql/client/web` fetch-only)
- WASM imports compiled as modules to avoid "hung" isolate kills

### 2. Custom JWT Auth (No NextAuth)
- `lib/auth-utils.ts`: Ultra-defensive `verifyToken()` — handles `null`, `undefined`, non-string, short tokens
- `lib/auth.ts`: Turso edge client only, `runtime = 'nodejs'` for admin routes
- `app/api/auth/[...nextauth]/route.ts`: Returns 501 "NextAuth disabled"
- `app/api/auth/login/route.ts`: Custom login → Turso + `signToken` → HttpOnly cookie

### 3. Private B2 Video Serving (Zero Public Egress Cost)
- Bucket `hostamar-prod`: **Private** (never public)
- `hostamar-f005-cdn` worker: `S3Client` + `getSignedUrl` (expiresIn: 3600)
- Bandwidth Alliance: B2 → Cloudflare free egress
- Player gets signed URLs via `/api/tv/playlist` → worker route `/tv/*.mp4`

### 4. Database: Turso libSQL over HTTPS
- 5432 DPI-blocked → `@libsql/client/web` over 443
- Connection string: `libsql://hostamar-db-romelraisul.aws-us-east-1.turso.io`
- Admin routes use inline Turso + JWT (no Prisma in worker)

### 5. AI Model Gateway (`api.hostamar.com`)
- **PRIMARY**: `omni` tunnel `:20128` (hostamar-primary)
- **FALLBACK**: `hostamar.alwaysdata.net` (AlwaysData 1GB free, suspend risk if commercial)
- nvidia-guard `:12436` local proxy with 6 live models, fallback chain

### 6. WSL is Source of Truth
- Hermes Agent runs in WSL (not Desktop)
- `/mnt/c` stripped from PATH so Linux `node`/`npx` wins over `.cmd` shims
- All deployments, fleet ops, git pushes from WSL

## Runtime Split

| Route | Runtime | Reason |
|-------|---------|--------|
| `/api/tv/*` | edge (workerd) | `@libsql/client/web` fetch-only |
| `/api/auth/login` | edge (workerd) | Custom JWT, no Prisma |
| `/api/admin/*` | nodejs | Prisma allowed, inline Turso+JWT |
| `/tv/*` | edge (workerd) | f005 worker handles signing |
| `/models.json` | edge (workerd) | Static asset via f005 |

## Verification Commands

```bash
# Check worker routes
curl -s https://hostamar.com/api/tv/playlist?format=json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['videos'][0]['url'][:80])"

# Verify signed URL playback
curl -I $(curl -s https://hostamar.com/api/tv/playlist?format=json | python3 -c "import json,sys; print(json.load(sys.stdin)['videos'][0]['url'])") 2>&1 | grep -E "HTTP|content-type"

# Check Turso edge client
grep -r "getTursoEdgeClient" /home/romel/hostamar.com/app/api/

# Verify NextAuth disabled
curl -s https://hostamar.com/api/auth/signin 2>&1 | head -5
```