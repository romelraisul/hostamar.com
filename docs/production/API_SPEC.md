# API Specification — All Endpoints Live Status

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** 13/13 GREEN (200/307/401)

---

## Public Endpoints (All 200)

| Endpoint | Method | Auth | Response Shape | Live Status |
|----------|--------|------|----------------|-------------|
| `/` | GET | public | HTML homepage | 200 |
| `/pricing` | GET | public | HTML pricing page | 200 |
| `/tv` | GET | public | HTML TV station | 200 |
| `/tv/manifest.json` | GET | public | `{count: 374, videos: [...], b2_only: true}` | 200 |
| `/models.json` | GET | public | `{version: "40", models: {total: 152, categories: 10, edge_tools: 53, renders: 168, worker, ground}}` | 200 |
| `/api/v1/models` | GET | public | Merged catalog (105 models) | 200 |
| `/api/store/products` | GET | public | 124 products with bKash pricing | 200 |
| `/api/tv` | GET | public | `{count: 362, source: "b2-cache-known", b2_only: true, videos: []}` | 200 |
| `/api/tv/playlist` | GET | public | M3U playlist + JSON fallback | 200 |
| `/api/tv/stable-channels` | GET | public | `{ok: true, total: N, items: [...]}` graceful fallback | 200 |
| `/api/tv/status` | GET | public | TV station health status | 200 |
| `/api/tv/heartbeat` | GET | public | Heartbeat/alive check | 200 |

---

## Protected Endpoints

| Endpoint | Method | Auth | Response | Live Status |
|----------|--------|------|----------|-------------|
| `/admin` | GET | cookie/JWT | 307 → `/login?next=/admin` | 307 |
| `/api/admin/stats` | GET | Bearer JWT (admin) | `{stats: {}, recentActivity: []}` or 401 | 401 |
| `/api/auth/me` | GET | cookie/JWT | User profile or 401 | 401 |
| `/api/auth/session` | GET | cookie/JWT | NextAuth session or 501 stub | 501 |

---

## TV/CDN Endpoints (f005 Worker)

| Endpoint | Worker | Auth | Notes |
|----------|--------|------|-------|
| `/api/tv` | f005-cdn | public | B2 signed URL flow, Cache API 5min |
| `/api/tv/live` | f005-cdn | public | HLS .m3u8, 5s edge cache |
| `/tv` | f005-cdn | public | Proxies to Next.js origin |
| `f005.hostamar.com/*` | f005-cdn | public | Direct B2 file access |

---

## Edge-Compatible Route Pattern (All `/api/tv/*`)

```typescript
// File: app/api/tv/route.ts (example)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'

export async function GET() {
  const db = getTursoEdgeClient()  // @libsql/client/web, HTTPS/Hrana only
  // ... query logic with graceful fallbacks
  // NEVER returns 500/503 — always 200 with fallback data
}
```

**Key rules for edge routes:**
- `getTursoEdgeClient()` from `lib/turso-edge.ts` — converts `libsql://` → `https://`
- **No Prisma** — `@libsql/client/web` fetch-only, works on workerd + Node
- **No fs.readdir** — avoids Prisma WASM loader CPU trap (1102 error)
- **Graceful DB fallbacks** — try/catch every query, return empty array not 500
- **Never 503** — always return 200 with `source: "b2-cache-known"` fallback

---

## Auth Endpoints

| Endpoint | Method | Implementation |
|----------|--------|----------------|
| `/api/auth/login` | POST | Local DB (Turso) + bcrypt + custom JWT cookie |
| `/api/auth/[...nextauth]` | GET/POST | **Returns 501** — NextAuth disabled on Workers |
| `/api/auth/me` | GET | Custom JWT verification via `lib/auth.ts` |
| `/api/auth/logout` | POST | Clears `auth_token` cookie |

---

## Admin Endpoints

| Endpoint | Method | Guard | Implementation |
|----------|--------|-------|----------------|
| `/admin` | GET | Middleware + role check | Redirects to login (307) |
| `/api/admin/stats` | GET | `requireAdmin()` | Inline Turso + JWT, returns 401 if not admin |
| `/api/admin/dashboard` | GET | `requireAdmin()` | Full dashboard stats via Turso |

---

## TV Agent Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/tv/agent/commands` | GET | `TV_AGENT_SECRET` header/query | Poll for pending commands |
| `/api/tv/agent/ack` | POST | `TV_AGENT_SECRET` body | Acknowledge command execution |

---

## Rate Limits

- **Cloudflare WAF:** 100 req/10s per IP (zone level)
- **Login:** 10 attempts / 15 min per IP (edge sliding window)
- **API Gateway:** Circuit breaker on primary (2 fails → 60s skip)

---

## Response Headers (Verified)

- **cf-ray:** Present on all Cloudflare-served responses
- **x-vercel:** Absent (confirms not falling through to Vercel)
- **Cache-Control:** `public, max-age=60` (TV), `public, max-age=5` (HLS)
- **X-Source:** `b2-live-private`, `b2-cache`, `nextjs-live`, `b2-cache-known`