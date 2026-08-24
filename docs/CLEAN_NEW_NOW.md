# Hard Clean + New Video First — 2026-08-24 15:09 (+06)

## Cleaned
| Item | Where now |
|---|---|
| 55 old dubbed viral files | `/tmp/viral_final_archive/` (out of repo) |
| `videos/viral/` folder | emptied, recreated empty |
| 21 non-ad files (unburned cc0/slow sources) | `pure/archive_heavy/` |
| dead `_tmp_*` stubs | deleted |

`pure/` now contains **only ad-burned slow files**: 9 × cc0_*_ad.mp4
(854×480 @800k, 3.6–17MB) + the new one below = 10.

## NEW video playing FIRST
`new_1787562578_ad.mp4` — fresh NASA CC0 clip (IDE product), hunted this
session, still ad burned:
**"NEW - Hostamar IDE Replit Alt FREE - hostamar.com"**
(15MB, 854×480, ~700kbps)

Verified: playlist line 1 AND ffmpeg's open fd = this file.
attribution.json updated (10 entries).

## Playlist order (10 entries)
1. new_1787562578_ad.mp4 ← LIVE NOW
2-10. cc0 ads: Hosting×2, Browser×2, Video×1, Gaming×2, Chat×2

## Proof
- HLS https://tv.hostamar.com/hls/tv/index.m3u8 → **200** after swap
- tv-ffmpeg active; all 4 legacy engines inactive+disabled
- Disk: pure/ 3.1GB total — of which archive_heavy/ ≈2.9GB is recoverable;
  live library is only ~150MB

## Backups
- `/tmp/clean_final_2026-08-24_1507/` (playlist + full pure/ snapshot)
- `/tmp/viral_final_archive/` (55 dubbed mp4s)

## Note on the timer
tv-pure.timer ends with publish_new_first.py → newest always leads. Its hunter
will keep adding NASA/Prelinger clips each cycle (it re-downloads unburned
*_pure.mp4 sources); the gate+publish only ever puts *_ad.mp4 in the playlist,
so burned-only rule holds.
