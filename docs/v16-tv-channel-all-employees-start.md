# V16 — Autonomous TV Channel RUN — Hermes Main, AutoClaw Secondary — LIVE GROUNDED

Date: 2026-09-15 23:0x +06. Every claim measured live.

## 1. Roles — Hermes main, AutoClaw secondary (confirmed)

- **Hermes = main IDE**: gateway live (`hermes_cli gateway run`, PID 329220), 49-employee registry (`~/.hermes/employees/fleet.json`), all WSL cron employees execute via Hermes-managed node.
- **AutoClaw = secondary designer ONLY**: heartbeat stays DISABLED (gateway log `[heartbeat] disabled`, config `every: '0s'`) — no double-run. Its Sep 14–15 delivery (api/storage repair, lead-capture fix, ops center, 2 pitches, bespoke redesign `a829b84`) is documented in `C:\Users\User\.openclaw-autoclaw\workspace\delivery\`.

## 2. Employee fleet — the workers that actually run (Ponytail: real workers over prompt theater)

fleet.json is a 49-entry agent registry; nothing in the runtime reads per-agent `status` fields. The employees that EXECUTE are:

| Employee | Runtime | V16 change | Verified |
|---|---|---|---|
| monitor (every 5 min) | WSL cron | Now probes TV: tv.hostamar.com, /api/tv/status, /api/orchestrator/status + the 3 prod endpoints | 6/6 ✅ live run |
| ceo (every 6 h) | WSL cron | TV channel = flagship product + GOAL PANEL contract (paying x/10, MRR BDT, blocker) | syntax OK |
| cto (every 2 h) | WSL cron | TV infra in service list (tunnel, hls2, vp9 encoder, rtmp, restream) + HLS probe | syntax OK |
| marketing (every 4 h) | WSL cron | Weekly TV content-plan task (7 segments, Bangla+English hooks) | syntax OK |
| content-pipeline (12 h) | WSL cron | Topics marked TV-segment-ready (script→voice→render) | syntax OK |
| seo (daily) | WSL cron | unchanged (GSC→blog routine already live) | cron fixed |
| keepalive (every 5 min) | WSL cron → Worker queue | executor from 11abd4f + honest per-type behavior | round-trip green 20:55 |

All 7 crontab lines were dead (`/usr/bin/node: not found`, 579 consecutive failures) — fixed to `/home/romel/.local/bin/node` earlier today; every tick now runs.

Queue executor (`local-runner/execute-job.js`): `vercel-guard-cleanup` → `gh workflow run vercel-guard.yml` (creds live on GitHub runner, zero local secrets) — **verified live: Actions run in_progress after one dispatch**. TV generation deliberately NOT a PC queue job (see §3).

## 3. TV channel — what was actually broken and is now FIXED (root causes, live)

The TV "brain" (13 Tv* tables, generator, 23 /api/tv/* routes, 3700-item playlist) was never the problem. The broadcast chain was dead since the 16:31 WSL restart, and two URL/DB bugs predate it:

1. **Pruned podman containers** — `hostamar-tv-db` and `hostamar-tv-rtmp` no longer existed; units only do `podman start` (no create path). Recreated `hostamar-tv-rtmp` from the compose spec: `alfg/nginx-rtmp`, host nginx.conf mounted AS the template (image envsubts its own template → ro-mount of nginx.conf broke it), `--entrypoint nginx -g "daemon off;"` (image default daemonizes → PID1 exit), only port 1935 (container 8080 collides with the local LLM gateway), archive on host bind-mount (`docker/tv-station/hls-archive/`).
2. **`tv-ffmpeg-vp9` (the browser-playable encoder) dead since Sep 9** — `Requires=tv-rtmp.service` cascade-failed it. Dependency removed (it writes `hls2/` directly, no rtmp involvement) and restarted: ACTIVE, fresh fmp4 segments, `master.m3u8` served.
3. **The "HLS 404" plague root cause** — URL contract mismatch: `TV_HLS_URL` + `health_check_auto_heal.sh` + status API all pointed at `/hls/tv/index.m3u8`; the vp9 encoder (since Sep 9 config) writes `master.m3u8`. Auto-heal "healed" a URL that never existed for days. Fixed: health-check + Vercel `TV_HLS_URL` → `https://tv.hostamar.com/master.m3u8` (player already loads master.m3u8).
4. **`restream.py` read `DATABASE_URL` from `.env.local` — which held an empty override** → `destinations:[]` forever, regardless of DB rows. Fixed: real Neon URL written into `.env.local` (gitignored).
5. **`tv-db` (local postgres podman) disabled** — Neon is the only DB this stack actually uses; the local one was pruned and nothing recreates it. One less red-herring failure.

`start_tv_stack.sh` now self-heals ALL of it on boot/logon/auto-heal: recreates the rtmp container if pruned, starts tv-ffmpeg-vp9 too.

## 4. TV channel state NOW (live probes)

- Encoders: `tv-ffmpeg` ACTIVE (playlist→RTMP ingest), `tv-ffmpeg-vp9` ACTIVE (browser HLS variant)
- Ingest: nginx-rtmp container Up, 1935 listening, segments landing (`hls-archive/tv/index.m3u8 + .ts`)
- Public: `https://tv.hostamar.com/master.m3u8` → **200** via tunnel; auto-heal reports "HLS 200 OK"
- restream: active, tee-ready to N destinations as soon as stream keys are added (`/admin/tv/restream` → TvStreamDestination rows; `FACEBOOK_RTMP_URL`/`YOUTUBE_RTMP_URL` in Vercel are EMPTY — only the user can supply stream keys)
- Generation: playlist 3700/3700 (full) → `/api/tv/generate-loop` correctly self-gates; its daily Vercel cron remains the generation trigger (prod Redis/BullMQ/Neon live there; PC has no Redis — a PC-side BullMQ producer was built, proven wrong, and deleted)
- `tv-pure` (quality-gate publish loop, 2h timer): left on timer; will retry against the now-correct URL — watch, don't churn

## 5. Skipped (Ponytail rung 1 — does this need to exist?)

- Rewriting 49 fleet.json prompts: registry is inert; runtime = the 7 workers above. Add per-agent TV goals if/when an agent framework actually consumes fleet.json.
- PC-side tv-script/tv-voice/tv-render queue jobs: generation stack lives on Vercel+prod-Redis; PC render loop = `comfyui-hunyuan-worker.mjs` (DB-queue based, running). Duplicate pipeline deleted.
- Re-enabling AutoClaw heartbeat: double-run risk; stays secondary until Hermes needs its designer skills.

## 6. What the user must supply (secrets only they hold)

- YouTube + Facebook **live stream keys** → add via `/admin/tv/restream` (or `vercel env add FACEBOOK_RTMP_URL/YOUTUBE_RTMP_URL`) → restream instantly tees the live channel to those platforms.
- Nothing else. TV is live now on tv.hostamar.com.

## 7. Verification checklist (all green)

- monitor 6/6 probes ✅ (incl. tv.hostamar.com + /api/tv/status)
- tv-ffmpeg + tv-ffmpeg-vp9 + hls2 + tunnel + restream + tv-agent + health-check.timer: ACTIVE
- https://tv.hostamar.com/master.m3u8 → 200
- /api/tv/status: playlistLength 3700, autoGenerateEnabled true, mode local_pc
- auto-heal log: HLS 200 OK (2 consecutive)
- Queue round-trip (11abd4f, 2 ticks) + guard workflow dispatch — both verified
- Deploys: 2× Ready after 6a5f9c0 cap fix
