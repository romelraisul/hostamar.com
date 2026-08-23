# IPTV Setup — Hostamar TV as real IPTV

Any Smart TV / VLC / TiviMate can watch Hostamar TV.

## URLs
- **Main IPTV playlist (add to TV/VLC)**: `https://hostamar.com/api/tv/iptv.m3u`
- **Alias**: `https://hostamar.com/api/iptv`
- **Direct HLS** (VLC → Open Network Stream): `https://tv.hostamar.com/hls/tv/index.m3u8`
- **VP9 fallback** (low bandwidth): `https://vp9.hostamar.com/master.m3u8`
- **EPG** (program guide XMLTV): `https://hostamar.com/api/tv/epg.xml`
- **Web player**: `https://hostamar.com/tv`

M3U content (CORS *):
```
#EXTM3U
#EXTINF:-1 tvg-id="hostamar.tv" tvg-name="Hostamar TV" ... ,Hostamar TV
https://tv.hostamar.com/hls/tv/index.m3u8
#EXTINF:-1 tvg-id="hostamar.tv.vp9" ...,Hostamar TV VP9
https://vp9.hostamar.com/master.m3u8
```

## Add to devices
- **VLC**: Media → Open Network Stream → paste `https://hostamar.com/api/tv/iptv.m3u` or direct HLS → Play
- **Samsung / LG TV**: Install **IPTV Smarters**, **OTT Navigator**, or **TiviMate** → Add Playlist → URL → `https://hostamar.com/api/tv/iptv.m3u` → EPG URL `https://hostamar.com/api/tv/epg.xml`
- **Kodi**: Add-ons → PVR IPTV Simple Client → M3U URL → `https://hostamar.com/api/tv/iptv.m3u`
- **TiviMate**: Settings → Playlists → Add playlist → Enter URL → `https://hostamar.com/api/tv/iptv.m3u`
- **TV Browser** (no app): open `https://hostamar.com/tv` directly on TV browser.

QR for phone → TV: encode `https://hostamar.com/api/tv/iptv.m3u` (any QR generator).

Tested: `ffprobe https://tv.hostamar.com/hls/tv/index.m3u8` → `hls` OK. `curl https://hostamar.com/api/tv/iptv.m3u` → `#EXTM3U` + CORS *.

## Start new video NOW (don't wait 1h)

Local (podman, recommended):
```bash
cd ~/hostamar-build
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"') npx tsx -e "import{createViralVideo}from('./lib/tv/viral/creator.ts'); const t=await (await import('./lib/prisma')).prisma.viralTrend.findFirst({where:{used:false},orderBy:{viralScore:'desc'}}); console.log(t); await createViralVideo(t.id)"
# or via API queue + local worker picks TvCommand VIRAL_CREATE:
curl -X POST https://hostamar.com/api/tv/viral/create-now -H "Content-Type: application/json" -d '{}'
# then run queued command locally (tv-viral service does this hourly; for NOW run manually)
```

Via Vercel API (queues):
- `POST https://hostamar.com/api/tv/viral/research` → inserts trends
- `POST https://hostamar.com/api/tv/viral/create-now` → queued `VIRAL_CREATE` TvCommand (Vercel can't ffmpeg); local `tv-viral` picks it next cycle or run manual above.

IPTV auto-updates: m3u points to HLS master `tv.hostamar.com/hls/tv/index.m3u8`, which always reflects current `playlist.host.txt` (22 entries, viral 3× weight). No m3u regeneration needed.

## Notes
- Podman only, 9 units active, isLive:true unaffected.
- Viral engine: tv-viral.service logs /tmp/tv-viral.log
