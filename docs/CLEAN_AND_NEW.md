# Clean & New — 2026-08-24

## What was archived (NOT deleted — recoverable)
| Location | Contents | Size |
|---|---|---|
| `videos/viral_archive/` | 55 old dubbed 720p files (TTS + yellow hook era) | 219MB |
| `videos/pure/archive_heavy/` | 4K/1080p multi-lang era + 240p Wikimedia thumbs | ~2.7GB |
| `/tmp/tv_clean_backup_2026-08-24_0201/` | playlist + full viral folder pre-clean | — |

Also removed: dead `_tmp_*` download stubs, stray `en_/id_/mul_WM_` files that a
concurrent tv-pure.service run had re-downloaded.

## What is now playing
**Line 1 (live): `cc0_Video_nasa_1_ad.mp4`** — fresh NASA Public-Domain clip
(15MB, 854×480@800k) hunted this session, still ad burned:
"Hostamar Video - AI Video Generator - hostamar.com/video".

Verified via `/proc/<ffmpeg pid>/fd` → the concat loop has exactly this file open.

## Playlist after clean
12 entries, all 854×480 @400–900k, <60MB each:
- 7 cc0 ad-burned: Browser(NASA), Chat×2(Prelinger), Gaming×2(Prelinger),
  Hosting(NASA), Video(NASA, NEW)
- 5 slow product tutorials filling remaining slots

## Proof
- HLS: https://tv.hostamar.com/hls/tv/index.m3u8 → **200**
- ffmpeg cmd: no drawtext at runtime (ads pre-burned)
- Units: tv-ffmpeg active; tv-viral/tv-bangla/tv-ever-fresh/
  tv-no-repeat-watcher all inactive+disabled
- Disk after clean: pure/ 3.0GB total (2.7GB of it is archive_heavy,
  can be deleted anytime to reclaim space)

## Tool added
`scripts/tv/publish_new_first.py` — same safe swap as
publish_cc0_slow_final.py but puts the newest `*_ad.mp4` first. Use after
dropping any new file into `videos/pure/`.

## To feature your own video next time
Drop `myvideo.mp4` into `videos/pure/`, then:
```
python3 scripts/tv/burn_still_ads.py   # if you name it cc0_<Product>_..._pure.mp4
python3 scripts/tv/publish_new_first.py
```
It goes live as line 1 within ~10 seconds.
