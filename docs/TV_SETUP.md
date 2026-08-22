# Hostamar TV — 24/7 AI TV Station

Live streaming system: website player at `/tv`, admin console at `/admin/tv`, local ffmpeg station on the Windows PC (RTX 5060), HLS exposed to the internet via Cloudflare Tunnel.

## Architecture

```
Windows PC (RTX 5060)                      Vercel (hostamar.com)
┌────────────────────────────┐            ┌──────────────────────────┐
│ docker/tv-station          │            │ /tv            hls.js    │
│   nginx-rtmp :1935 → :8080 │◄── RTMP ───│ /admin/tv      control   │
│   ffmpeg → rtmp://local... │            │ /api/tv/*      public    │
│ scripts/tv-agent/agent.js  │◄── poll ───│ /api/admin/tv/* admin    │
│   (polls commands, spawns  │── ack ────►│ Neon DB (7 Tv* tables)   │
│    ffmpeg per command)     │            │ Cloudflare Tunnel → HLS  │
└────────────────────────────┘            └──────────────────────────┘
```

- **nginx-rtmp** receives the RTMP stream and serves HLS on `http://localhost:8080/hls/tv.m3u8`.
- **tv-agent** polls `GET /api/tv/agent/commands?secret=TV_AGENT_SECRET` every 10s, runs ffmpeg accordingly, ACKs via `/api/tv/agent/ack`.
- **Cloudflare Tunnel** exposes port 8080 so viewers get HLS over HTTPS; auto URL detection in `lib/tunnel/cloudflare.ts`.

## DB tables (Neon)

`TvChannel`, `TvPlaylistItem`, `TvStreamDestination`, `TvSchedule`, `TvSettings`, `TvCommand`, `TvLog` — created at runtime by `lib/ensure-schema.ts` (also applied manually with `npx tsx scripts/tv-db-migrate.mts`).

## Setup — Windows PC

1. Docker Desktop running:
   ```
   cd docker/tv-station && docker compose up -d
   ```
2. Put mp4 files in `docker/tv-station/videos/` and list them in `videos/playlist.txt` (`file '/videos/name.mp4'` per line).
3. Agent (set `TV_AGENT_SECRET` to match Vercel env):
   ```
   cd scripts/tv-agent
   npm install
   set TV_AGENT_SECRET=xxx && node agent.js
   ```

## Setup — Vercel env

| Var | Purpose |
|---|---|
| `TV_AGENT_SECRET` | shared secret for agent poll/ack |
| `CLOUDFLARE_TUNNEL_TOKEN` | tunnel run token (optional, enables auto-expose) |
| `CLOUDFLARE_API_TOKEN` + zone | alternative API-based tunnel URL discovery |

## Admin console `/admin/tv`

Five tabs: **Live Control** (preview + start/stop/reload/generate/test), **Playlist** (add/remove videos, RSS auto-generate toggle), **Destinations** (YouTube/Facebook/Twitch RTMP fan-out keys), **Settings + Tunnel** (channel name, HLS/RTMP URLs, tunnel status), **Logs & Agent** (last logs + agent run instructions).

Commands flow: admin button → `POST /api/admin/tv/command` → `TvCommand(PENDING)` row → agent polls & executes → ack updates status → visible in Logs tab.

## Public endpoints

- `GET /api/tv/status` — isLive, hlsUrl, reachability, agent last-seen
- `GET /api/tv/playlist` — current playlist items
- `POST /api/tv/generate` — trigger AI video generation into playlist

## Local verification

```
npx tsx scripts/tv-db-migrate.mts   # apply ensure-schema DDL to .env.local DB
node scripts/tv-db-check.mjs        # count tables/rows
npm run build                       # must pass clean
TV_AGENT_SECRET=dev-secret npm run dev -- --port 3210
bash scripts/tv-smoke.sh            # end-to-end: queue → poll → ack → consume
```

Verified 2026-08-22: tsc clean, production build OK (129 routes incl. /admin/tv), ensureSchema applied (7/7 Tv* tables in Neon), /api/tv/status + playlist live against Neon (12 items), auth guards return 401 without secret/cookie, full command loop queue→poll→ack→consume passed. UI visual check still requires a running browser (camofox) — not yet done.
