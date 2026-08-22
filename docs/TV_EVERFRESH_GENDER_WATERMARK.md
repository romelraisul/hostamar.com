# Hostamar TV — Ever-Fresh Bangla Business Channel

Watermark + gender-aware voice + ever-fresh business content + dynamic hero.
Shipped 2026-08-23. Podman only, free tier, no money spent.

## What changed

### Phase 1 — Watermark `HOSTAMAR.COM/TV` (top-right)
- **Burned into video**: `scripts/bangla-dub/normalize.py` draws the watermark
  (drawtext, white on black@0.45, `x=w-tw-20:y=20`) into EVERY normalized video
  before it enters the playlist. Verified visually on real output frames.
  - Gotcha: ffmpeg filtergraph options are separated by `:` (not `,`). The
    font path needs `-` escaped (`DejaVuSans\-Bold.ttf`).
- **Frontend overlay**: `components/home/TvHero.tsx` + `app/tv/page.tsx`
  render an absolutely-positioned badge top-right (z-10, pointer-events-none).
  So watermark shows even on videos made before the burn-in existed.

### Phase 3 — Gender-aware Bangla voice
- **`scripts/bangla-dub/gender_detect.py`** — numpy-only autocorrelation pitch
  detector (no librosa; Python 3.14 has no wheels). Median F0 > 165 Hz =>
  female. Fallbacks: optional ONNX visual classifier (`ONNX_GENDER_MODEL`
  env), title hints ("woman/female/মহিলা..."), default male.
- **Validated on real edge-tts voices**: Nabanita 238.8 Hz → female,
  Pradeep 132.2 Hz → male. Real dubs logged:
  - Destination Earth → female/225.4 Hz → bn-BD-NabanitaNeural
  - RFD Greenwich Village → male/137.9 Hz → bn-BD-PradeepNeural
- Wired into `dub.py`; gender+voice stored in `OpenSourceVideo.gender/voiceUsed`.

### Phase 2 — Ever-fresh content (not loop)
- **`ingest.py` rewritten**: business/marketing/retail/fashion queries only
  (Hostamar = AI video maker for BD SMEs — Daraz/Aarong/Sailor sellers).
  Sources: Prelinger PD films + IA CC educational + Pexels/Pixabay
  (activate by setting `PEXELS_API_KEY` / `PIXABAY_API_KEY`, skipped without keys).
- **`auto.py`**: appends new dub → trims playlist to max 50 (`TV_MAX_PLAYLIST`,
  normalized brand demos protected) → deletes evicted files → restarts
  tv-ffmpeg (seamless, stream stays up).
- **Scheduler**: `tv-bangla.service` now cycles every **2 h** (was 6 h) via
  `/home/romel/start-bangla-scheduler.sh`.
- Old NASA items age out of the 50-slot rotation as new business dubs land.

### Phase 4 — Dynamic hero
- `/api/tv/now-playing` now returns `{title, titleBn, gender, voiceUsed, credit}`
  computed from the REAL loop position: systemd monotonic uptime of
  tv-ffmpeg % total playlist duration (durations via ffprobe when local).
- `TvHero.tsx`: `[TV] {title} • credit {credit} • 70% HERO ▶`, gender+voice
  badge bottom-right, watermark top-right. Polls every 30 s.
- Prod DB seeded with the 16-item playlist + OpenSourceVideo metadata so Vercel
  (which cannot ffprobe local files) still serves correct titles/genders.

## Ops

| thing | value |
|---|---|
| Playlist file | `docker/tv-station/videos/playlist.host.txt` (host paths) |
| Reload | `systemctl --user restart tv-ffmpeg` (auto.py does it) |
| Manual ingest | `python3 scripts/bangla-dub/auto.py 2 --sources PRELINGER,IA-EDU` |
| Logs | `/tmp/bangla-auto.log`, journalctl --user -u tv-bangla |
| State | `scripts/bangla-dub/state.json` (done/failed map; delete entry to retry) |
| Lock | `/tmp/bangla-auto.lock` |

## Pitfalls learned
1. **theora (.ogv) inputs**: `-c:v copy` produces EMPTY mp4 (0 bytes). dub.py
   now probes codec and re-encodes non-h264 with libx264.
2. Prisma `$queryRawUnsafe` on Postgres wants `$1,$2…` placeholders, NOT `?`.
3. Vercel serverless can't run ffprobe/systemctl — rotation math falls back to
   180 s/item estimate there; exact positioning works only for self-host API.

## Auto-start (Phase 5, verified enabled)
All 8 tv-* units `enabled` + `active`; `/etc/wsl.conf` has `systemd=true`;
Windows Startup `Hostamar.bat` runs `wsl.exe --exec /bin/true` so WSL boots
even without Docker Desktop.
