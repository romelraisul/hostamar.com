# Hostamar TV — Full Auto System (2026-08-22)

## Architecture
```
[Sources: NASA / Prelinger / Blender]          (legal: public domain / CC-BY)
        |  admin search (Vercel API, serverless)
        v
/admin/tv -> Open Source tab -> "Queue Bangla Dub"
        |  creates OpenSourceVideo row (QUEUED) + TvCommand OPENSOURCE_PIPELINE
        v
WSL tv-agent (tmux) polls /api/tv/agent/commands
        |  spawns process_one.py
        v
PC pipeline: download -> faster-whisper EN -> Google translate bn
        -> edge-tts bn-BD-PradeepNeural (intro: greeting + title + license)
        -> normalize 720p/25fps/AAC-stereo -> append playlist.host.txt
        -> reload ffmpeg loop (RTMP 127.0.0.1:1935) -> nginx HLS :8080
        -> cloudflared named tunnel -> https://tv.hostamar.com
        -> report status -> OpenSourceVideo + TvPlaylistItem (auto ON_TV)
        |
        +-- bangla-sched tmux: auto.py 2 videos every 6h (same pipeline)
```

## Pieces
- DB: OpenSourceVideo table (ensureSchema auto-creates; model in schema.prisma)
- APIs: /api/admin/tv/opensource (GET search|list, POST queue), /api/tv/agent/opensource-report (secret), /api/cron/tv-ingest (CRON_SECRET)
- Agent actions: OPENSOURCE_PIPELINE (single item), AUTO_INGEST (n items via auto.py)
- Admin: /admin/tv tab "Open Source + Bangla" — search, queue, live status, Auto-Fetch
- Player: hls.js first (Chromium canPlayType false-positive fix), CSP allows tv.hostamar.com

## Reboot (WSL)
    podman start hostamar-tv-rtmp
    bash ~/hostamar-build/scripts/start-tv-live.sh          # ffmpeg loop + agent deps
    tmux new-session -d -s tv-agent "bash /home/romel/start-agent.sh 2>&1 | tee /tmp/agent.log"
    tmux new-session -d -s bangla-sched "bash /home/romel/start-bangla-scheduler.sh"
    nohup cloudflared tunnel --config /home/romel/tv-tunnel.yml run > /tmp/tv-tunnel.log 2>&1 &

## Gotchas learned (do not regress)
- 127.0.0.1 only in WSL (localhost -> ::1, pasta IPv4-only)
- HLS path /hls/tv/index.m3u8 (hls_nested on), NOT /hls/live/tv/
- All playlist videos MUST be uniform: 1280x720 25fps h264 + AAC stereo 44.1k (normalize.py)
- Agent must run in tmux (plain nohup node dies with WSL session)
- Vercel prod project = "hostamar-build" (prj_WwYkMz...), NOT project "hostamar.com"
