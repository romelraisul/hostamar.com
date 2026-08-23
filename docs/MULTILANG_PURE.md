# Multi-Language Multi-Place Pure TV Pipeline

Extends `docs/PURE_QUALITY_FINAL.md`: Bangla-only CC 1080p yielded 0 files,
so the hunter now searches multiple languages and places plus Wikimedia
Commons (CC-BY-SA/PD). Still NO edit, NO TTS, NO watermark burn.

## Hunt matrix (scripts/tv/pureHunter_multilang.py)

| Lang | Places | Queries |
|------|--------|---------|
| en   | US, IN, UK | hosting/AI/VS Code/browser/Blender/NASA/linux CC 1080p |
| hi   | IN     | hosting + editing CC Hindi |
| es   | ES     | hosting + editing CC Spanish |
| ar   | AE     | hosting Arabic CC |
| id   | ID     | hosting + editing CC Indonesian |
| bn   | BD     | বাংলা hosting CC (kept trying, non-blocking) |

Plus Wikimedia Commons categories (`Videos_of_computers`,
`Videos_of_technology`) — CC-BY-SA / Public Domain.

## Quality gate

`quality_gate_final.py`: reject `<1920x1080`, or bitrate `<3Mbps`.
Language is NEVER a rejection reason — filename `{lang}_{place}_...` only
feeds the hero badge.

## Publish

`publish_pure_final.py`: same safe swap as before — never empty playlist,
restore backup if 0 files, verify HLS 200 after restart else restore.

## Hero badge

`TvHero.tsx` shows: 🔵 **Pure 1080p • 🌍 {LANG} • 📍 {PLACE} • No Edit**
when the on-air file lives under `videos/pure/`. Data flows from
`lib/tv/nowPlaying.ts` (`language`/`place` parsed from the filename) through
`/api/tv/now-playing`.

## First run results (2026-08-24)

- Round 1: 11 candidates → gate kept **1** genuine file:
  `en_IN_J5xllB1mWZU_pure.mp4` (1920x1080 @ 3213kbps) → published, HLS 200.
- Rejected: low-bitrate 1080p streams (250k–1.6M), 240p Wikimedia thumbnails.
- Hunter hardened after round 1: format selector now prefers
  `vbr>=3000` mp4, and a pre-filter skips videos whose only 1080p variant
  would fail the gate (saves bandwidth, avoids gate churn).
- `tv-pure.timer` runs the multilang hunt every 2h; each round the pure
  library grows until the MAX_TOTAL=24 cap.

## Verify

```
curl -I https://tv.hostamar.com/hls/tv/index.m3u8    # 200
curl -s https://hostamar.com/api/tv/now-playing      # isPure, language, place
ls -lh docker/tv-station/videos/pure/
cat /tmp/pure_hunt_multilang.log                     # per-query decisions
cat /tmp/pure_gate.log                               # pass/reject reasons
```

## IPTV

Unchanged: `https://hostamar.com/api/tv/iptv.m3u` (#EXTM3U, CORS *).
