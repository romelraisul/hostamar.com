# EVER-FRESH NO-REPEAT + 100+ LIVE

TV is now an ever-fresh channel: each video plays **once**, then archived.
New videos fill the gap continuously with Bangla dub + SEO.

## No-repeat

**Problem:** `ffmpeg -re -stream_loop -1 -f concat playlist.host.txt` loops the
same 18 files (9 min) 160×/day. `TvVideoStats.playWeight 3` previously triplicated
each viral line — now fixed to `1`.

**Fix:**
- Schema: `TvPlaylistItem.played Boolean @default(false), playedAt DateTime?`
  (migrated via `ensure-schema` DDL; existing 18 reset to `false`).
- `create_from_free.ts` regenerates `playlist.host.txt` from `played=false`
  only, each URL once (no weight loop). `enable_no_repeat.py --confirm`
  dedupes and verifies `sort | uniq -d == 0`.
- `no_repeat_watcher.py` (systemd `tv-no-repeat-watcher.service`) watches
  `/proc/<ffmpeg>/fd`, waits the file's duration, marks that
  `TvPlaylistItem.played=true`, regenerates the playlist without played items,
  renumbers, and `force_restart.py` to the next head. When <5 items remain it
  kicks `full_workflow --product Video --one` to refill.
- `playlist.host.txt` is ever-fresh: hunters publish to position 1, watcher
  consumes from head. No video ever repeats.

**Verify:**
```
python3 scripts/tv/enable_no_repeat.py --confirm
cat docker/tv-station/videos/playlist.host.txt | sort | uniq -d  # 0
bash scripts/tv/force_restart_tv.sh
ls -l /proc/$(pgrep -f rtmp)/fd | grep videos  # new head
```

## 24h coverage

18 videos × 30 s = 9 min. Real 24 h no-repeat needs 2880 videos.

Current hunter rhythm: `tv-viral.service` (`start-viral.sh`) loops every 30 min,
round-robin 6 products via `full_workflow --one` → ~12/hr → ~288/day.
That grows coverage ~10× over the old 9 min in one day, but not yet 24 h
worth. The huge-volume path "every 5 min ×2 per product = 144/hr = 3456/day"
is documented as **experimental** — each video costs ~2 min of download+tts+ffmpeg
and 8 GB VRAM won't fit HunyuanVideo fp8, so 5-min parallelism would starve the
box. Keep 30 min as default; set `HIGH_VOLUME=1` in `start-viral.sh` to try 5 min
when you have headroom.

Every new video is still fast in-house: Piper `bn_BD-google-medium` 0.58 s
offline (speaker 0 male 130 Hz / 12 female 258 Hz), music synth 0.12 mix,
ffmpeg enhance fallback when `comfy.hostamar.com` is 502 (no NVIDIA driver),
all with audience gate `willPayScore≥7 willLeave false`.

SEO scales with volume: `seo_generate.py --missing` + sitemap `revalidate 3600`
picks up every new `TvVideoSeo` row within an hour.

## 100+ restream

`TvStreamDestination` (already in schema) holds YouTube/FB/custom RTMP:

```
platform: YOUTUBE | FACEBOOK | TWITCH | CUSTOM
rtmpUrl:  rtmp://a.rtmp.youtube.com/live2/
streamKey: (encrypted at rest — store via API)
isActive: true
```

- API: `GET /api/tv/restream` list, `POST /api/tv/restream {platform,rtmpUrl,streamKey,label}` add
  (admin page stub: POST via curl or future `/admin/tv/restream` UI).
- Service: `restream.service` → `scripts/tv/restream.py` polls active
  destinations every 60 s, builds `ffmpeg -re -i rtmp://127.0.0.1:1935/live/tv
  -c copy -f tee "[f=flv]rtmp://yt/...|[f=flv]rtmps://fb/..."`.

Add keys:

```
curl -X POST https://hostamar.com/api/tv/restream \
  -H Content-Type:application/json \
  -d '{"platform":"YOUTUBE","rtmpUrl":"rtmp://a.rtmp.youtube.com/live2/","streamKey":"xxxx-xxxx","label":"YouTube main"}'
```

Without keys the service logs `active destinations: 0` and sleeps — HLS/IPTV
still work. With keys, YouTube Studio / Facebook Live show Hostamar TV live.

## Automation (solo founder)

12 units now (add `tv-no-repeat-watcher` + `restream`):

```
tv-db, tv-rtmp, tv-ffmpeg, tv-ffmpeg-vp9, tv-hls2, tv-tunnel,
camofox, camofox-tunnel, tv-viral, tv-agent, tv-bangla,
tv-no-repeat-watcher, restream, tts (Piper model on disk)
```

All `systemctl --user enable`'d; `C:\hostamar\start-tv-podman.ps1` starts
podman containers on Windows boot. Logs: `/tmp/tv-watcher.log`,
`/tmp/tv-restream.log`, `/tmp/tv-workflow.log`.

## Re-enabling high volume later

1. Edit `start-viral.sh`: set `SLEEP=300` and hunter `--max-per-product 2`
   when `HIGH_VOLUME=1`, otherwise `1800`.
2. `systemctl --user daemon-reload; systemctl --user restart tv-viral`
