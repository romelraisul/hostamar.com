# CC0 Slow-Internet TV Pipeline (480p @800k + Still Ads)

Final evolution of the pure pipeline. User's FINAL policy:
**CC0/Public-Domain sources only, slow-BD-internet profile, still text ads
burned per Hostamar product.**

## Why
- 4K @19.5Mbps was unwatchable on BD connections → live stream measured at
  ~917kbps after this change.
- Big Buck Bunny / NASA films had zero product relevance → every file now
  maps to one of the 6 products.

## Sources (all safe to stream worldwide)
| Source | License | Used for |
|---|---|---|
| images.nasa.gov (API) | Public Domain | Hosting, Browser |
| Prelinger / archive.org | Public Domain | Gaming, Chat |
| Blender films | CC-BY (credited) | Video (fallback) |
| Pexels / Pixabay / Coverr | CC0-like | best-effort top-up |

Plus `videos/free/*_original.mp4` — the pre-dub Creative-Commons tutorial
downloads already mapped to products in Postgres (`FreeVideoSource.product`)
— transcoded to the same slow profile (`slow_*` files).

## Pipeline (runs every 6h via tv-pure.timer)
1. `pureHunter_cc0_slow.py` — hunts NASA/Prelinger/Blender/stock, transcodes
   everything to **854×480 @ ~800k H.264/AAC, ≤150s, <50MB**
   (`cc0_{Product}_{source}_{n}_pure.mp4`).
2. `burn_still_ads.py` — burns STILL white ad text (bottom-center, black box,
   DejaVuSans 22px) per product; writes `attribution.json`
   (`cc0_..._ad.mp4`).
3. `quality_gate_cc0_slow.py` — accepts only 640–1280 wide, 360–720 high,
   400k–2000k, 20–200s, <60MB; archives heavy legacy files to
   `pure/archive_heavy/`; exits 1 if <6 survive.
4. `publish_cc0_slow_final.py` — safe swap with PRODUCT COVERAGE round-robin
   (≥1 per product), restart tv-ffmpeg, verify HLS 200 else restore backup.

## Live state (2026-08-24)
- Playlist: 12 entries — 6 cc0 ad-burned (NASA/Prelinger) + 6 slow tutorials,
  covering all 6 products.
- Measured segment bitrate: ~917 kbps total.
- Disk: pure/ = 267MB (heavy 4K era archived in pure/archive_heavy/).

## Ads (still, not moving)
```
Video   -> Hostamar Video - AI Video Generator - hostamar.com/video
Hosting -> Hostamar Hosting - BDIX 5GB FREE 20ms - hostamar.com/hosting
Chat    -> Hostamar Chat - AI Chat Bangla Voice - hostamar.com/chat
Browser -> Hostamar Browser - Automation Browser - browser.hostamar.com
IDE     -> Hostamar IDE - Replit Alternative FREE - hostamar.com/ide
Gaming  -> Hostamar Gaming - Tournament Hosting - hostamar.com/gaming
```

## Credits API
`GET /api/tv/credits` → attribution.json contents (source/license/ad per file).

## Verify
```
curl -I https://tv.hostamar.com/hls/tv/index.m3u8     # 200
curl -s https://tv.hostamar.com/hls/tv/index.m3u8 | grep EXTINF | head -1
curl -s https://hostamar.com/api/tv/credits | head    # after Vercel deploy
ls -lh docker/tv-station/videos/pure/*_ad.mp4         # all <50MB, 854x480
cat docker/tv-station/videos/pure/attribution.json
```

## Notes
- ABR multi-rendition master playlist is NOT implemented: nginx-rtmp chain is
  single-variant by design and rebuilding it risks HLS uptime. The slow goal is
  achieved at the source level (~800k inputs, crf-tuned encoder). Revisit only
  if viewers need adaptive switching.
- Hero badge (needs Vercel deploy of main): 🔵 CC0 Public Domain • 480p Slow Net • {Product}
