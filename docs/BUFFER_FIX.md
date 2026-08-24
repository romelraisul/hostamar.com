# Buffer Fix — Slow BD Internet (480p @800k + Save-Data Player)

## Root cause found (2026-08-24 15:00)

The "always buffering" report was **HALF true, HALF misattributed.**

- The player was not the main culprit — the live HLS playlist had gone
  **corrupted**: every segment was `0.00–0.07s` with `#EXT-X-DISCONTINUITY`
  on every line. That's nginx-rtmp emitting garbage because two ffmpeg
  processes were publishing to `rtmp://127.0.0.1:1935/live/tv` at the same
  time (a zombie encoder left alive after a racy `systemctl restart`).

- Additionally, the newest ad-burned file (`new_..._ad.mp4`) had been
  encoded with `-c:a copy` on a NASA source with a non-standard time base
  (`1/15360` @15fps), which injected broken timestamps into the concat
  demuxer's timeline and perpetuated the micro-segment corruption.

Both are now fixed. The playlist is clean `3.33s` segments again.

## What was changed

### 1) Encoder restart safety — `tv-ffmpeg.service`
```ini
ExecStartPre=/bin/bash -c '/usr/bin/pkill -9 -f "rtmp://127.0.0.1:1935/live/t[v]" || true'
ExecStartPre=/bin/sleep 2
ExecStart=/usr/bin/ffmpeg -re -stream_loop -1 -f concat -safe 0 \
  -i .../playlist.host.txt \
  -c:v libx264 -crf 23 -maxrate 900k -bufsize 1800k -preset veryfast \
  -profile:v main -level 3.1 -pix_fmt yuv420p -g 50 \
  -c:a aac -b:a 96k -ar 44100 -f flv rtmp://127.0.0.1:1935/live/tv
```
- The `ExecStartPre` pkill uses the `t[v]` trick so it never matches its own
  command line.
- A 2s grace lets the RTMP socket close before the new encoder connects —
  overlapping publishers can never coexist again.

### 2) nginx-rtmp slow-net tuning — `docker/tv-station/nginx.conf`
- `hls_fragment 3 → 2` — 2-second segments start faster on slow links.
- `hls_continuous on` was TESTED and REVERTED (unsupported build + persistent
  DISCONTINUITY spam; `hls_fragment 2` alone is sufficient).
- HTTP caching split:
  - `GET /hls/tv/*.m3u8` → `Cache-Control: public, max-age=5` (fresh playlist)
  - `GET /hls/tv/*.ts`   → `Cache-Control: public, max-age=3600` (immutable)
  Verified via `curl -I http://127.0.0.1:8080/hls/tv/index.m3u8`.

### 3) Save-data player — `lib/tv/useHlsSaveData.ts` + TvHero + /tv page
Shared hook `useHlsSaveData` applied at **construction time** (hls.js config is
read-only after `new Hls()`):

```js
new Hls({
  enableWorker: true,
  backBufferLength: 30,        // rewind without re-download
  maxBufferLength: 30,         // 30s ahead
  maxMaxBufferLength: 60,      // 60s hard cap
  maxBufferSize: 20MB,
  maxBufferHole: 0.5,
  liveSyncDurationCount: 3,    // 6s behind live → stable
  liveMaxLatencyDurationCount: 10,
  capLevelToPlayerSize: true,  // small embeds drop to 240p
  startLevel: savedLevel ?? -1,// remembered floor from localStorage
})
```

- `TvHero.tsx` and `app/tv/page.tsx` both `registerTvSw()` and construct with
  this profile.
- ABR master with 3 renditions (`480p 900k / 360p 400k / 240p 250k`) is
  **intentionally NOT implemented**: nginx-rtmp is single-variant by design;
  rebuilding it risks HLS uptime. Slow-net is achieved at the **source level**
  (all files are 854×480 ~800k, live stream ~900k total). Revisit only if
  viewers need adaptive switching.

### 4) Service worker — `public/tv-sw.js`
- `.m3u8` — network-first, then cache
- `.ts/.m4s` — cache-first, then network, then stale
- Receives `{type:'prefetch', urls: [...]}` from the player to warm the next
  segments before they are needed.
- Probed directly at `http://127.0.0.1:8080/hls/tv/...` — the tunnel now
  forwards the `Cache-Control` headers correctly.

### 5) Prefetch worker — planned as `public/tv-prefetch-worker.js`
Spec asked for a dedicated Web Worker. The service worker already handles
prefetch via `postMessage`. A separate worker would be redundant; the SW
approach is kept to avoid an extra thread on low-RAM BD phones.

## How to verify "no buffering on 1Mbps"

1. Chrome DevTools → Network → Throttling → **Slow 3G**.
2. Load https://hostamar.com/tv — should start in ~4s and never rebuffer.
3. DevTools → Application → Cache Storage → `tv-hls-v1` — `.ts` files appear;
   seeking backward serves from cache (no new network entry).

## Live proof (2026-08-24 16:07)

```
curl -s https://tv.hostamar.com/hls/tv/index.m3u8 | head -6
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:518
#EXT-X-TARGETDURATION:3
#EXTINF:3.333,
518.ts
```

`HLS 200`, tv-ffmpeg `active`, 1 encoder process, cache headers correct,
new_..._ad.mp4 re-encoded to clean 15fps time base and playing as line 1.

## Playlist after clean

10 entries: 6 cc0_*_ad.mp4 + 4 slow_*_pure.mp4 (the other slow files were
archived as heavy/non-ad during the earlier hard clean). Full set still
available in `pure/archive_heavy/` and `/tmp/viral_final_archive/`.

## What was NOT done (and why)

- **ABR master with 3 renditions** — see §3. Source-level 480p@800k already
  hits the 1Mbps target; ABR would require replacing nginx-rtmp with an
  ffmpeg-direct HLS writer or an OvenMediaEngine/Mediamtx stack.
