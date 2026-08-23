# Hostamar TV — WSL Go-Live (2026-08-22)

## Correct environment
- Project root: /home/romel/hostamar-build (WSL Ubuntu). NOT C:\hostamar (does not exist).
- Docker is NOT installed. Use podman (rootless, inside Ubuntu; ports via pasta, IPv4 only).
- Always use 127.0.0.1, never localhost (Ubuntu resolves localhost to ::1 first; pasta has no IPv6).
- Windows cannot reach WSL :8080 reliably — run the Cloudflare tunnel INSIDE WSL.

## Live stack (current)
| Piece | How | Check |
|---|---|---|
| RTMP+HLS nginx | podman container hostamar-tv-rtmp (alfg/nginx-rtmp, custom nginx-tv.conf) | podman ps |
| ffmpeg loop | scripts/start-tv-live.sh (playlist: docker/tv-station/videos/playlist.host.txt — HOST paths; container playlist.txt uses /videos paths) | kill -0 $(cat /tmp/ffmpeg.pid) |
| tv-agent | tmux session tv-agent via /home/romel/start-agent.sh (plain nohup dies with WSL session) | tmux attach -t tv-agent or /tmp/agent.log |
| Cloudflare tunnel | named tunnel hostamar-tv (c3b55a05) -> tv.hostamar.com -> http://127.0.0.1:8080, config /home/romel/tv-tunnel.yml | curl -I https://tv.hostamar.com/hls/tv/index.m3u8 |

## HLS URL (IMPORTANT)
nginx uses hls_nested on, so the URL is /hls/tv/index.m3u8 — NOT /hls/live/tv/index.m3u8.

## Vercel
- Production project: hostamar-build (prj_WwYkMz8Kk75NN573skKxxWcuMVYi) — owns hostamar.com + www.
  (Project "hostamar.com" prj_SdLN5... is a side project, NOT production.)
- TV_HLS_URL=https://tv.hostamar.com/hls/tv/index.m3u8 and TV_AGENT_SECRET set on hostamar-build, all targets.

## Restart after reboot (in WSL)
    podman start hostamar-tv-rtmp
    bash ~/hostamar-build/scripts/start-tv-live.sh
    tmux new-session -d -s tv-agent "bash /home/romel/start-agent.sh 2>&1 | tee /tmp/agent.log"
    nohup cloudflared tunnel --config /home/romel/tv-tunnel.yml run > /tmp/tv-tunnel.log 2>&1 &

## Troubleshooting
- HLS 404 locally: ffmpeg dead — check /tmp/ffmpeg.log (playlist path errors = container paths used on host).
- Agent dies silently: launched without tmux — use the tmux command above.
- Tunnel 404/530: check /tmp/tv-tunnel.log; tv.hostamar.com must CNAME to c3b55a05-...cfargotunnel.com (proxied).
- isLive false: check https://hostamar.com/api/tv/hls-url shows reachable:true (Vercel probes the public URL).
