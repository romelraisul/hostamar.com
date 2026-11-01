# API — public endpoints: models.json, /api/tv family, B2 signed-URL flow, /v1 gateway, WAF limits.

## Core public endpoints (all currently HTTP 200)

| Endpoint | Auth | Shape / notes |
|----------|------|---------------|
| `GET /models.json` | public | Catalog: `version: 40`, `models: {total: 152, categories: 10, edge_tools: 53, renders: 168, worker, ground}`. ~4491 bytes, served from B2 via the f005 CDN Worker. |
| `GET /api/tv` | public | `{count: 362, videos: [...], b2_only: true, source: "b2-cache", total}`. `source` is `b2-live` when freshly read from the B2 manifest, `b2-cache` when served from the edge Cache API copy. The old hardcoded `count: 353` fallback is REMOVED — `grep -r "353" app/api/tv/` must return 0. |
| `GET /api/tv/live` | public | HLS `.m3u8` manifest from B2 via the f005 worker (5s edge cache). |
| `GET /tv` | public | TV page + JSON-LD watch surfaces; `X-Source: nextjs-proxy` when proxied. |
| `GET /api/tv/epg.xml`, `/api/tv/iptv.m3u` | public | EPG + IPTV playlist for external players. |
| `GET /v1/*` (api.hostamar.com) | varies | Model gateway routed by api-router → omni :20128 (tunnel) or alwaysdata fallback. |
| `/api/auth/*` | public | NextAuth v4 callbacks. |
| `/api/billing/*` | — | **PENDING**: bKash tokenized checkout not live; do not treat as shipped. |
| `/api/admin/*` | ADMIN only | Dashboard data; guarded by middleware + role check. |

## B2 signed-URL flow (video delivery)

```
client → /tv (or /api/tv/*)
       → Cloudflare Worker: S3Client (AWS SDK, S3-compatible endpoint
         s3.us-east-005.backblazeb2.com) → getSignedUrl(object, ttl)
       → 302/URL to signed B2 URL (media host f005.backblazeb2.com/file/hostamar-prod)
       → object served over the Bandwidth Alliance (zero egress fee)
```

- Bucket `hostamar-prod` is PRIVATE and must stay private — signed URLs are the only
  delivery path; the public-toggle option is permanently rejected.
- Worker requests are SigV4-signed; B2 keys are worker secrets (`wrangler secret put`),
  never committed.

## Model gateway (/v1 on api.hostamar.com)

- Served by the api-router worker: 2s primary timeout → omni :20128 via Cloudflare tunnel
  `hostamar-primary`; fallback alwaysdata (`x-served-by: alwaysdata-lite`); circuit
  breaker skips a dead primary for 60s after 2 consecutive failures so callers get the
  queued-202 response instead of a 502 hang.
- Rate limiting: Cloudflare WAF rule **100 req/10s per IP** sits in front of everything.

## Auth, validation, pagination

- Auth: NextAuth v4, JWT strategy, session maxAge 30 days. Middleware guards
  `/dashboard`, `/admin`, `/api/admin/*`; admin routes require `session.user.role === 'ADMIN'`.
- Validation: all POST bodies validated with Zod (schemas in `lib/validators/`).
- bKash webhook (when payments land): HMAC-SHA256 signature verification, idempotent via
  event dedupe — design rule stands even though the integration is PENDING.
- Pagination: TV `?limit=20&offset=0` (max 100); store `?page=1&per_page=20`;
  chat messages cursor-based (`?cursor=<id>`).

## Response discipline (rules)

- No endpoint returns raw SQL errors: wrap DB calls, fail with typed JSON
  (e.g. `{"error": "internal"}`) and an honest status code.
- Cloudflare-served responses carry `cf-ray`; a response with `x-vercel` headers means the
  request fell through to the Vercel origin — investigate routing before "fixing" code.
- Cache headers for TV manifests live in `vercel.json` (10s + SWR 30 on `/api/tv`, 5s on
  `/api/tv/live`); the f005 worker applies its own 5min edge TTL on the B2 copies.
- Adding an endpoint? Add its probe to TESTING.md in the same change.
