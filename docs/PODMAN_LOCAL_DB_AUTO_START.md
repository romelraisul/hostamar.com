# Local DB + Auto-Start (2026-08-22) — TV survives Windows reboot

## Architecture (free-tier safe)
- Vercel (free): frontend + tiny JSON APIs only — no video ever passes through
- Neon (free): main app tables (User/Order) + small TV metadata for the site API
  (serverless cannot reach a home DB, so Neon stays for site metadata — it is KBs, not GBs)
- LOCAL PC (this WSL): TV engine — RTMP/HLS, ffmpeg, Bangla dub, agent, tunnel,
  and a LOCAL Postgres with all TV tables (source of truth for engine state + backup)

## Local DB
- Container: hostamar-tv-db (podman, postgres:15-alpine), 127.0.0.1:5433
- LOCAL_DATABASE_URL=postgresql://tv:tv_password_local_only_123@127.0.0.1:5433/hostamar_tv
- 8 TV tables created from the same ensure-schema SQL used on Neon
- lib/prisma-local.ts: same PrismaClient with datasource override (local scripts only)
- Backup: podman exec hostamar-tv-db pg_dump -U tv hostamar_tv > backups/tv-local-$(date +%F).sql

## Auto-start chain (reboot => TV back in ~60s)
1. Windows logon -> HKCU Run key "HostamarTV-AutoStart" runs C:\hostamar\start-tv-autostart.ps1
2. That wakes WSL Ubuntu: systemctl --user start tv-db tv-rtmp tv-ffmpeg tv-agent tv-tunnel tv-bangla
3. WSL systemd (enabled in /etc/wsl.conf [boot] systemd=true, linger ON for romel)
   restarts every service automatically (Restart=always absorbs boot races)

Services: tv-db, tv-rtmp (podman start), tv-ffmpeg (loop, writes /tmp/ffmpeg.pid),
tv-agent (EnvironmentFile=.tv-agent-secret.local), tv-tunnel (cloudflared tv.hostamar.com),
tv-bangla (6h auto-content scheduler)

## Manual ops
    systemctl --user status tv-*                  # health
    systemctl --user restart tv-ffmpeg            # reload playlist (auto.py does this too)
    journalctl --user -u tv-agent -f              # agent logs
    podman ps                                     # containers

## Reboot test performed 2026-08-22
wsl --shutdown -> autostart ps1 -> agent started at +47s, all 6 services active,
http://127.0.0.1:8080/hls/tv/index.m3u8 200, https://tv.hostamar.com 200,
hostamar.com/api/tv/status isLive:true.

NOTE: old tmux sessions (tv-agent, bangla-sched) are RETIRED — systemd owns everything now.
