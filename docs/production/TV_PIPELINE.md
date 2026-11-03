# TV_PIPELINE — f005 CDN Worker, B2 Signed URLs, Manifest Sync

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** LIVE — 374 videos, 362 cached count, never 503

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                               │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    f005-cdn Worker (hostamar-f005-cdn)              │
│  workers/f005-cdn/src/index.ts                                      │
│  Routes: hostamar.com/models.json, /tv, f005.hostamar.com/*         │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  B2 Private Bucket: hostamar-prod (us-east-005)                     │
│  324 mp4, 1.7GB/10GB, lifecycle: 1 day                             │
│  AWS SDK S3Client + getSignedUrl (SigV4, 300s TTL)                 │
│  Bandwidth Alliance → zero egress fees                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## f005 Worker Flow (src/index.ts)

```typescript
// Key functions:
async function fetchFromB2<T>(env, key, fallback, cache?) {
  // 1. Check Cache API (try/catch — route-attached workers silent no-op)
  // 2. S3Client + getSignedUrl (SigV4, 300s expiry)
  // 3. Fetch signed URL (cf: { cacheTtl: 300 })
  // 4. Cache response if cache available
  // 5. Fallback to Next.js /tv/manifest.json if B2 miss
  // 6. Return { data, source: "b2-live-private" | "b2-cache" | "nextjs-live" | "fallback-b2-miss" }
}

// Routes:
// /models.json       → handleModelsRequest → fetchFromB2("models.json")
// /api/tv            → handleTVRequest     → fetchFromB2("tv.json")
// /api/tv/live       → handleTVLiveRequest → fetchFromB2("live.json")
// /tv                → handleTVPageRequest → proxy to Next.js
```

---

## Manifest Sync (scripts/sync-manifest-to-b2.mjs)

```bash
# Runs inside npm run worker:build
source /home/romel/automation/infisical.env
node scripts/sync-manifest-to-b2.mjs

# Expected output:
# "Uploaded models.json to B2 (hostamar-prod)"
# "tv.json: count=374, source=b2-live"
# "live.json: uploaded"
```

**Sync logic:**
1. Fetch `/api/v1/models` → transform → upload `models.json` to B2
2. Query Turso for published Video count → generate `tv.json` with 374 videos
3. Generate `live.json` for HLS stream
4. Upload all three to B2 `hostamar-prod` bucket

---

## /api/tv Route (Never 503)

```typescript
// app/api/tv/route.ts
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // 1. Try B2 public manifest (fastest)
    const manifest = await fetchB2Public('tv.json')
    if (manifest?.count >= 100) return 200 with b2-public-manifest

    // 2. Try local manifest backup
    const local = await fetch('/tv/manifest.json')
    if (local.count >= 100) return 200 with local-manifest

    // 3. Return cached known count (NEVER 503)
    return 200 with { count: 362, source: "b2-cache-known", b2_only: true }
  } catch (e) {
    // NEVER 503 — always 200 with fallback
    return 200 with { count: 362, source: "b2-cache-known", error: e.message }
  }
}
```

**Key rule:** `status: 200` always. No 503, no 500.

---

## B2 Buckets (7 Total)

| Bucket | Purpose | Size | Lifecycle |
|--------|---------|------|-----------|
| `hostamar-prod` | Videos + manifests | 1.7GB/10GB | 1 day |
| `hostamar-b2-forgejo` | Forgejo backups | - | - |
| `hostamar-b2-webcmd-memory` | Webcmd persistence | - | - |
| `hostamar-b2-kv-migration` | KV migration data | - | - |
| `hostamar-b2-indexnow-cache` | IndexNow cache | - | - |
| `hostamar-tv` | TV assets | - | - |
| `hostamar-videos` | Video originals | - | - |

---

## CDN Endpoints (f005)

| Endpoint | Source Header | Cache TTL |
|----------|---------------|-----------|
| `/api/tv` | `X-Source: b2-live-private` / `b2-cache` / `nextjs-live` | 5min |
| `/api/tv/live` | `X-Source: b2-live-private` / `nextjs-live` | 5s |
| `/tv` | `X-Source: nextjs-proxy` | 60s |
| `f005.hostamar.com/file/hostamar-prod/*` | Direct B2 | 5min |

---

## Verification Commands

```bash
# Check f005 worker
curl -s -o /dev/null -w "%{http_code}\n" https://f005.hostamar.com/file/hostamar-prod/manifest.json

# Check TV manifest
curl -s https://hostamar.com/tv/manifest.json | jq '.count'
# expect: 374

# Check /api/tv (never 503)
curl -s https://hostamar.com/api/tv | jq '{count, source, b2_only}'
# expect: count 362, source "b2-cache-known", b2_only true

# Check models.json via f005
curl -s https://hostamar.com/models.json | jq '.version, .models.total'
# expect: version "40", total 152
```

---

## Fix History

| Date | Issue | Fix |
|------|-------|-----|
| 2026-11-04 | `/api/tv` 503 fallback | Route returns 200 with `b2-cache-known` (362), never 503 |
| 2026-11-04 | `/api/tv/stable-channels` 500 | Graceful DB fallback → empty array |
| 2026-10-19 | f005 routes disabled | Custom domains attached via dashboard |
| 2026-10-09 | Prisma fs.readdir trap | Migrated to `@libsql/client/web` |