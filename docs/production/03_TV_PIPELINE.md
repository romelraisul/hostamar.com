# Hostamar.com — TV Pipeline

**Last verified:** 2026-11-04 13:25 Asia/Dhaka

## Overview

374 videos served from private B2 bucket via Cloudflare Worker `hostamar-f005-cdn` with runtime-signed URLs. Player auto-loops with error retry.

## Pipeline Flow

```
1. BUILD TIME
   .next/standalone/public/tv/manifest.json (374 video filenames)
         │
         ▼ node scripts/generate-tv-playlist.mjs
   lib/tv-playlist.ts → exports TV_PLAYLIST_KEYS: string[] (374 keys)
         │
         ▼
   OpenNext build embeds keys in worker.js

2. REQUEST TIME (/api/tv/playlist?format=json)
   app/api/tv/playlist/route.ts (force-dynamic)
         │
         ▼ Reads TV_PLAYLIST_KEYS, builds worker URLs
   Returns: { videos: [{ id, title, url: "https://hostamar.com/tv/<key>.mp4", ... }] }
   Headers: Cache-Control: public, max-age=60, X-Source: b2-live-private-signed

3. VIDEO PLAYBACK (/tv/<key>.mp4)
   f005 worker handleTVVideoRequest()
         │
         ▼ Extracts key from path, builds B2 key: "public/tv/<key>.mp4"
         ▼ S3Client + getSignedUrl(expiresIn: 3600)
         ▼ Fetches signed URL, streams response with:
            - Access-Control-Allow-Origin: *
            - Content-Type: video/mp4
            - Cache-Control: public, max-age=60
            - X-Source: b2-live (or nextjs-fallback)
         ▼ Caches in Cloudflare Cache API (3600s)

4. PLAYER (app/tv/page.tsx)
   - Fetches playlist on mount
   - <video muted autoPlay playsInline controls preload="metadata" crossOrigin="anonymous">
   - onEnded → next index (modulo 374)
   - onError → retry ONCE with fresh signed URL from /api/tv/playlist, then advance after 2s
   - Playlist drawer: 374 clickable items, prev/next buttons
```

## Key Files

| File | Purpose |
|------|---------|
| `scripts/generate-tv-playlist.mjs` | Build-time: reads manifest.json → emits `TV_PLAYLIST_KEYS` |
| `lib/tv-playlist.ts` | Generated: `export const TV_PLAYLIST_KEYS: string[] = [...]` |
| `app/api/tv/playlist/route.ts` | Runtime: returns worker URLs `/tv/<key>.mp4` |
| `workers/f005-cdn/src/index.ts` | `handleTVVideoRequest()` — signs & streams |
| `app/tv/page.tsx` | Player with retry logic, drawer, auto-loop |

## The 403 Rapid-Loop Bug (Fixed 2026-11-04)

**Root cause:** `lib/tv-playlist.ts` contained build-time **unsigned** `f005.hostamar.com/file/hostamar-prod/xxx.mp4` URLs. Bucket is private → 403 → `video.onerror` → immediate `next()` → infinite rapid loop (no playback >500ms).

**Fix applied:**
1. `generate-tv-playlist.mjs` now emits **keys only** (no URLs)
2. `app/api/tv/playlist/route.ts` builds worker route URLs: `https://hostamar.com/tv/<key>.mp4`
3. `f005 worker` signs at request time via `getSignedUrl` (3600s expiry)
4. Player `onError`: fetches fresh playlist (new signed URL), retries once, then advances

## Verification

```bash
# Playlist returns 374 signed worker URLs
curl -s https://hostamar.com/api/tv/playlist?format=json | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f\"count={d.get('count')} source={d.get('source')}\")
print(d['videos'][0]['url'])
"

# First video URL should be: https://hostamar.com/tv/hydrogen-economy-narrated.mp4
# NOT: https://f005.hostamar.com/file/hostamar-prod/...

# Signed URL returns 200 video/mp4
curl -I "https://hostamar.com/tv/hydrogen-economy-narrated.mp4" 2>&1 | grep -E "HTTP|content-type|cf-cache"
# Expected: HTTP/2 200, content-type: video/mp4, cf-cache-status: HIT

# Player loads (check HTML for video element)
curl -s https://hostamar.com/tv | grep -c "video.*autoPlay"
```

## Manifest Sources

| Source | Endpoint | Count | Notes |
|--------|----------|-------|-------|
| Next.js build output | `/tv/manifest.json` | 374 | `.next/standalone/public/tv/manifest.json` |
| f005 worker proxy | `/tv/manifest.json` | 374 | Proxies Next.js origin |
| B2 direct (private) | `tv/manifest.json` in bucket | 374 | Signed fetch by worker |
| Playlist API | `/api/tv/playlist?format=json` | 374 | Runtime-signed worker URLs |

## Regenerate Playlist Keys

```bash
cd /home/romel/hostamar.com
node scripts/generate-tv-playlist.mjs
# Output: [generate-tv-playlist] Generated /home/romel/hostamar.com/lib/tv-playlist.ts with 374 keys
```

## Player Error Handling (Code Reference)

```typescript
// app/tv/page.tsx — handleError
const handleError = useCallback(async (e) => {
  const videoEl = e.currentTarget
  console.error('[TV] Video error:', videoEl.error?.code, 'at index', currentIndex)
  
  if (errorCountRef.current < 1) {  // max 1 retry
    errorCountRef.current++
    // Fetch fresh signed URL for same video
    const res = await fetch('/api/tv/playlist?format=json&limit=374', { cache: 'no-store' })
    const data = await res.json()
    if (data.videos?.[currentIndex]) {
      videoEl.src = data.videos[currentIndex].url
      videoEl.load()
      await videoEl.play()
      return
    }
  }
  
  // Max retries → advance
  errorCountRef.current = 0
  setCurrentIndex((prev) => (prev + 1) % videos.length)
}, [currentIndex, videos.length])
```

## Metrics (Live)

- **Videos:** 374
- **Total size:** ~2.5GB (B2 `hostamar-prod`)
- **Avg bitrate:** ~2-5 Mbps
- **Signed URL expiry:** 3600s
- **Playlist cache:** 60s
- **Video cache:** 3600s (Cloudflare Cache API)
- **Auto-loop:** Modulo 374 on `ended`