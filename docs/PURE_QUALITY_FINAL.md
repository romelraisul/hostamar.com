# Pure Quality TV Pipeline (1080p, No Edit, No TTS, No Watermark)

## Goal
Serve **1080p+ original Bangla Creative-Commons videos as-is** for 6 products
(Video, Hosting, Chat, Browser, IDE, Gaming). No edge-tts robotic voice, no
yellow `drawtext` hook, no `HOSTAMAR.COM/TV` burn, no 720p re-encode.

## Safety guarantees (never break the live channel)
- `playlist.host.txt` is **never** emptied (`echo "" >` is forbidden).
- `publish_pure_final.py` restores the backup playlist and aborts if 0 pure
  files exist, so HLS stays 200.
- `quality_gate_final.py` rejects anything `<1920x1080` or `<4Mbps` and exits
  non-zero if nothing remains, triggering the publish restore path.
- Backup lives in `/tmp/tv_backup_*/` (timestamped) and the path is saved to
  `/tmp/tv_backup_path.txt`.

## Components
| File | Role |
|------|------|
| `scripts/tv/pureHunter_final.py` | yt-dlp search (Bangla queries) → keep only CC + ≥1080p + Bangla title → download. Falls back to lossless copy of existing viral files if YouTube yields 0. Guarantees ≥1 file. |
| `scripts/tv/quality_gate_final.py` | ffprobe every `*_pure.mp4`; reject `<1920x1080` or `<4Mbps`. |
| `scripts/tv/publish_pure_final.py` | Safe swap: write new playlist (absolute paths, max 20), restart tv-ffmpeg, verify HLS 200 else restore backup. |
| `~/.config/systemd/user/tv-pure.{service,timer}` | Runs hunter→gate→publish every 2h. |
| `~/.config/systemd/user/tv-ffmpeg.service` | Now `-crf 18 -preset slow -profile:v high -level 4.2` (was 2500k cap). No burned text. |
| `components/home/TvHero.tsx` | Shows 🔵 "Pure 1080p • No Edit" badge when on-air file is under `videos/pure/`. |
| `lib/tv/nowPlaying.ts` + `app/api/tv/now-playing/route.ts` | Expose `isPure` flag (url contains `/videos/pure/`). |

## Reality check (2026-08-23)
- YouTube CC Bangla 1080p tutorials: **effectively 0** found by the hunter.
- Existing library: 720p dubbed (old engine) → all rejected by the gate.
- **Net: no 1080p+ pure source exists yet.** Pipeline is built + automated +
  safety-verified (gate→publish→restore kept HLS 200 during testing). TV is
  currently live on the backed-up 720p playlist.

## How to get real Pure 1080p (you provide the source)
1. Record/obtain 1080p+ original Bangla videos (OBS, own voice) per product.
2. Drop them as `docker/tv-station/videos/pure/{name}_pure.mp4` (must be
   ≥1920x1080, ≥4Mbps, H.264/AAC mp4).
3. Run: `python3 scripts/tv/quality_gate_final.py && python3 scripts/tv/publish_pure_final.py`
   — or wait for the 2h `tv-pure.timer`, which does it automatically.
4. TV flips to pure within ~10s; hero shows the 🔵 badge; IPTV
   (`/api/tv/iptv.m3u`) already points at the same HLS.

## IPTV
`https://hostamar.com/api/tv/iptv.m3u` → `#EXTM3U` with both H.264
(`tv.hostamar.com/hls/tv/index.m3u8`) and VP9 (`vp9.hostamar.com/master.m3u8`)
variants. CORS `*`.

## Verify
```
curl -I https://tv.hostamar.com/hls/tv/index.m3u8   # -> 200
curl -s https://hostamar.com/api/tv/status           # isLive:true
curl -s https://hostamar.com/api/tv/iptv.m3u | head  # #EXTM3U
ffprobe docker/tv-station/videos/pure/*_pure.mp4     # width>=1920 height>=1080
```
