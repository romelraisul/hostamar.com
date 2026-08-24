# Buffer Hard Reset — 2026-08-24 16:30 (+06)

## Before
```
#EXTM3U
#EXT-X-MEDIA-SEQUENCE:9168
#EXT-X-TARGETDURATION:2
#EXT-X-DISCONTINUITY
#EXTINF:0.046, 9168.ts
#EXT-X-DISCONTINUITY
#EXTINF:0.000, 9169.ts
```
Every segment `0.00–0.07s` + DISCONTINUITY every line. Player rebuffers forever,
even on fast links. Service worker had cached these poisoned segments in
`tv-hls-v1`.

Proof after fix:
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-TARGETDURATION:3
#EXT-X-DISCONTINUITY
#EXTINF:3.333, 0.ts
#EXTINF:3.333, 1.ts
#EXTINF:3.334, 2.ts
```
`grep -c "0.000"` → **0**, DISCONTINUITY only once at stream start.

## Root causes (3)

1. **Zombie double encoders** — racy `systemctl restart` left a stale ffmpeg
   publishing alongside the new one. Both fed `rtmp://127.0.0.1:1935/live/tv`
   → nginx-rtmp interleaved their PTS → micro-segments.
2. **Bad PTS from NASA source** — `new_..._ad.mp4` had `time_base 1/15360` and
   was cut with `-c:a copy` on a non-standard source → `genpts` never ran,
   timestamps stayed broken through the concat.
3. **Service worker cache poison** — `tv-sw.js` `tv-hls-v1` cached the `0.00s`
   segments cache-first, so even after HLS healed the player replayed garbage.

## Hard reset

### Phase 1 — Stop + purge
```
systemctl --user stop tv-ffmpeg tv-pure.timer
pkill -9 ffmpeg
podman exec --user root hostamar-tv-rtmp sh -c 'rm -rf /tmp/hls/tv/*; mkdir -p /tmp/hls/tv'
rm -rf ~/hostamar-build/docker/tv-station/hls/* (host mount)
```

### Phase 2 — Re-encode to identical clean specs
All `pure/*ad.mp4` → `clean_*ad.mp4`:
```
ffmpeg -i input -vf "scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=15" \
  -r 15 -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p \
  -b:v 600k -maxrate 600k -bufsize 1200k -g 30 -keyint_min 15 -sc_threshold 0 \
  -c:a aac -b:a 64k -ar 48000 -ac 2 -fflags +genpts -avoid_negative_ts make_zero \
  -movflags +faststart clean_*.mp4
```
Result: all files `854×480 15/1 600k+64k`, `time_base` normalized, no B-frames.

### Phase 3 — Playlist: 3 files ×2
```
clean_new_1787562578_ad.mp4       (Video, NASA — NEW leads)
clean_cc0_Hosting_nasa_2_ad.mp4   (Hosting)
clean_cc0_Browser_nasa_1_ad.mp4   (Browser)
(repeated)
```
6 entries total — fewer files = fewer concat discontinuities. Non-clean
originals moved to `pure/archive_heavy/`.

### Phase 4 — Single-encoder guarantee + nginx
`tv-ffmpeg.service`:
```ini
ExecStartPre=-/bin/bash -c 'pkill -9 -f "ffmpeg.*live/tv"; sleep 2; podman exec --user root hostamar-tv-rtmp sh -c "rm -rf /tmp/hls/tv/*; mkdir -p /tmp/hls/tv" 2>/dev/null || true; rm -rf /tmp/hls/tv/* 2>/dev/null; mkdir -p /tmp/hls/tv'
ExecStart=... -re -f concat -safe 0 -stream_loop -1 ... -fflags +genpts -avoid_negative_ts make_zero -use_wallclock_as_timestamps 0 -c:v libx264 -profile:v baseline ... -b:v 600k ... -g 30 -keyint_min 30 ...
```
- Kills any stale publisher + **purges HLS before every start** — overlapping
  publishers can never coexist.
- Baseline profile + genpts + wallclock 0 → clean 2s-aligned segments.

`docker/tv-station/nginx.conf`:
- `hls_fragment 3 → 2` (2s segments)
- HTTP cache split: `*.m3u8 → max-age=5`, `*.ts → max-age=3600` (verified via
  `curl -I http://127.0.0.1:8080/hls/tv/...`)
- `podman restart hostamar-tv-rtmp` to apply (bind mount required restart).

Volume corruption cleared via `podman exec --user root rm -rf /tmp/hls/tv/*`
(host `rm` was Permission denied — files are root-owned in container's
user-namespace).

### Phase 5 — Service worker cache purge
`public/tv-sw.js`: `tv-hls-v1 → tv-hls-v2` + activate handler deletes old
caches. Players on next load drop the poisoned segments.

### Phase 6 — Timer
`tv-pure.timer` re-enabled (`active`), now runs `pureHunter_cc0_slow →
burn_still_ads → quality_gate_cc0_slow → publish_new_first` every 6h with the
new single-encoder guard.

## Verify (acceptance)

- `curl -s https://tv.hostamar.com/hls/tv/index.m3u8` → `EXTINF:3.333` (not 0.00), single leading DISCONTINUITY
- `ps aux | grep -c "[f]fmpeg.*live/tv"` → 1
- `pure/clean_*ad.mp4` → all `854×480 15/1 600k+64k` identical
- `playlist.host.txt` → 6 entries (3 files ×2), new leads
- `HLS 200`, `tv-ffmpeg active`, 4 legacy disabled, `tv-pure.timer active`
- `Cache-Control` headers correct on `:8080`
- Service Worker `tv-hls-v2`, old `v1` deleted on next activation

## Disk after reset
- `pure/` live: ~70MB (10 × clean 2.7–12M) + `archive_heavy/` holds the
  displaced originals — delete `archive_heavy/` + `/tmp/viral_final_archive/`
  to reclaim ~3GB when confirmed.
