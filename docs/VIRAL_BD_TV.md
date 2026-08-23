# Viral BD TV Engine — browser.hostamar.com → AI → TV

Solo-founder automation: every hour find BD viral trends, AI creates Bangla marketing video, publishes immediately, viral hits replay 3x.

## Architecture
```
[Sources: YT BD trending, ProthomAlo RSS, Daraz best-sellers, Google Trends BD fallback]
        ↓ fetch + SME scoring (>=7: fashion/ecommerce/beauty/food keep, politics skip)
     ViralTrend (Prisma, Neon via ensureSchema, free tier)
        ↓ POST /api/tv/viral/create picks highest viralScore unused
     Hook + Bangla script (template: "এই ঈদে সবাই তাকিয়ে থাকবে 😍" + category script)
     → gender by category (fashion/beauty→female Nabanita else male Pradeep)
     → edge-tts python → wav
     → Pexels video (if PEXELS_API_KEY) else normalized demo → ffmpeg:
        scale 1280x720 + HOSTAMAR.COM/TV watermark (NotoSansBengali) + yellow hook burned
     → /docker/tv-station/videos/viral/{id}_viral_bn.mp4 (20s)
        ↓ publish
     ViralVideo row + TvPlaylistItem (pos max+1, source=viral, title "… 🔥")
     + TvVideoStats (views 0, playWeight 1)
     → trim playlist 50 (non-viral oldest first) → regenerate playlist.host.txt
        with weight expansion: viral items appear 3× lines when boosted
     → TvCommand RELOAD_PLAYLIST + systemctl --user restart tv-ffmpeg
        ↓ view heartbeat
     TvHero POST /api/tv/view every 30s while LIVE (watchSec 30, 85%)
     → isViral when views>100 or (views>=10 && avg>80%) → playWeight 3
        → playlist.host.txt rewritten with 3× entries, ffmpeg reloaded
        → hero shows 🔥 Viral score

Hero: /api/tv/now-playing now includes isViral + viralScore from TvVideoStats;
TvHero renders "• 🔥 Viral 9.2 •" when flagged.

Automation: tv-viral.service (systemd --user) loops: POST research → POST create → sleep 3600
Logs: /tmp/tv-viral.log + TvLog
Self-healing: researcher try/catch per source, fallback curated trend, no crash on browser failure
(brower.hostamar.com is 502 — direct HTTP used; Camofox http://127.0.0.1:9377 tried first if present)

## API
- POST /api/tv/viral/research → { inserted, trends[10], sources }
- POST /api/tv/viral/create { viralTrendId? } → { viralVideoId, playlistItemId, videoUrl, hook, gender, voiceUsed }
- GET  /api/tv/viral/top → { trends[20], videos[20], stats[20] }
- POST /api/tv/view { playlistItemId?, watchSec, watchPercent } → { views, isViral, playWeight, becameViral }
All public via middleware (/api/tv/viral/, /api/tv/view).

## DB (Prisma + ensureSchema, no migrate needed on Vercel)
ViralTrend, ViralVideo, TvVideoStats

## Ops
- Manual research: curl -X POST https://hostamar.com/api/tv/viral/research
- Manual create: curl -X POST https://hostamar.com/api/tv/viral/create -H "Content-Type: application/json" -d '{}'
- Check top: curl https://hostamar.com/api/tv/viral/top
- Playlist: cat docker/tv-station/videos/playlist.host.txt | wc -l ; grep -c viral
- Enable: systemctl --user enable --now tv-viral ; systemctl --user status tv-viral
- Logs: journalctl --user -u tv-viral -n 50 ; cat /tmp/tv-viral.log

## Pitfalls
- Bangla hook text: DejaVuSans lacks Bengali → must use NotoSansBengali-Regular.ttf for hook (fixed tofu)
- edge-tts is python CLI, not npm package `edge-tts`
- Prisma relation needs opposite field (ViralTrend.videos)
- Vercel middleware: new API paths need adding to publicApiPaths

## Costs: free tier only. Pexels optional, no browser SaaS required.
