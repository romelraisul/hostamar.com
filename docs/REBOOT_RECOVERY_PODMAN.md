# Hostamar TV — Reboot Recovery (Podman + systemd) — verified 2026-08-23

Power-cut recovery runbook. This exact procedure was executed live after the
2026-08-23 power cut: full stack self-recovered via systemd user units,
homepage TV hero shipped same session.

## Architecture (current)

TV stack = **8 systemd USER units** inside WSL2 (`systemctl --user`), NOT tmux.
tmux sessions from earlier docs are obsolete.

| Unit | What it runs |
|---|---|
| tv-db.service | oneshot `podman compose -f docker/tv-station/podman-compose.yml up -d` (hostamar-tv-db postgres :5433) |
| tv-rtmp.service | same compose (hostamar-tv-rtmp nginx-rtmp :1935/:8080) |
| tv-ffmpeg.service | ffmpeg concat playlist → `rtmp://127.0.0.1:1935/live/tv` (**127.0.0.1, never localhost**) |
| tv-ffmpeg-vp9.service | VP9/Opus fMP4 HLS variant → docker/tv-station/hls2/ |
| tv-hls2.service | python3 scripts/tv-hls2-server.py (:8090, CORS static server for hls2) |
| tv-agent.service | node scripts/tv-agent/agent.js (polls hostamar.com commands; secret from EnvironmentFile .tv-agent-secret.local) |
| tv-tunnel.service | cloudflared tunnel --config /home/romel/tv-tunnel.yml run (tv.hostamar.com → :8080, vp9.hostamar.com → :8090) |
| tv-bangla.service | bash start-bangla-scheduler.sh (auto.py every 6h, edge-tts bn-BD) |

All units: `enabled`, `Restart=always`, `WantedBy=default.target`.

## Boot chain after power cut

1. Windows login → Startup folder `Hostamar.bat`
   - starts Desktop/auto_start.ps1 (ComfyUI/Qwen, Windows side)
   - `start /min wsl.exe --exec /bin/true` ← guarantees WSL distro boots
     (added 2026-08-23; previously WSL only started if Docker Desktop launched)
2. WSL boot → /etc/wsl.conf `[boot] systemd=true` → user systemd
3. User systemd → all tv-* units start automatically (~60s to fully live)
4. Podman containers have restart policy; if "boot ID differs" error appears:
   `rm -rf /tmp/storage-run-1000/containers /tmp/storage-run-1000/libpod`

## Post-reboot verification checklist

```bash
podman ps                                   # hostamar-tv-db + hostamar-tv-rtmp Up
systemctl --user list-units 'tv-*'          # all active/exited(oneshot ok)
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/hls/tv/index.m3u8   # 200
curl -sI https://tv.hostamar.com/hls/tv/index.m3u8 | head -1                     # HTTP/2 200
curl -sI https://vp9.hostamar.com/master.m3u8 | head -1                          # HTTP/2 200
curl -s https://hostamar.com/api/tv/status                                       # isLive:true
```

Full diagnostic template: `/tmp/reboot_check.txt` (2026-08-23 run).

## Gotchas learned this run

- **VP9 public URL is `/master.m3u8`, NOT `/hls/tv/index.m3u8`.** Old specs
  saying vp9.hostamar.com/hls/tv/... are stale. Player code uses /master.m3u8.
- **Local TV DB (5433) tables are intentionally near-empty.** Prod playlist
  lives in Vercel/Neon via /api/tv/*. Don't "fix" the empty local tables.
- **Agent secret file format:** `.tv-agent-secret.local` is an
  EnvironmentFile: `TV_AGENT_SECRET=<value>\n`. Never paste the whole line as
  the secret value.
- Local `next start` status shows isLive:false because local env lacks
  TV_HLS_URL (it's a Vercel env var). Not a fault.
- Prod deploys track **main** of romelraisul/hostamar.com.git → Vercel project
  **hostamar-build** (deployment alias ...git-main...). The sso-providers
  branch is NOT what's live despite older skill notes.

## Homepage TV hero (shipped 2026-08-23, commit e0083f1)

- components/home/TvHero.tsx — 70% HERO cell player, same fallback chain as
  /tv (hls.js first → error+watchdog → VP9 remount key=variant)
- app/api/tv/now-playing — public title+status (whitelisted in middleware)
- HeroVideoGenerator.tsx renders TvHero by default ('latest' tab); template
  buttons still switch to showcase videos
