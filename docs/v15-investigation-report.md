# V15 Investigation Report — Autonomous TV Channel: Where To Start — LIVE GROUNDED

Audit date: 2026-09-15, ~20:15 +06. Every claim below measured live from this PC, live endpoints, D1, git, and Vercel. Where the V15 prompt's assumptions were stale, the correction is stated explicitly.

## 1. LIVE Status (measured, not assumed)

| Component | Status | Evidence |
|---|---|---|
| hostamar.com/api/orchestrator/status | LIVE | `pcOnline:true`, `lastReport.time:1789481457064` (20:10 +06), `pending:1` (zombie job, see §3) |
| hostamar.com/api/social/publish | LIVE | `{"ok":true,...}` GET; POST guarded by `x-social-secret` |
| Worker hostamar-orchestrator.romelraisul.workers.dev | LIVE | `/api/status` mirrors D1 events; `/api/queue/pull` returns jobs |
| Keepalive | RUNNING (via cron) | `*/5 * * * * local-runner/keepalive.sh` in crontab; log `/tmp/hostamar-keepalive.log` shows 5-min ticks. **PID 483993 is dead** — the `while true; sleep 300` loop from the old design is gone; cron is the only driver now (this is correct) |
| WSL persistence | OK | `systemd=true` in `/etc/wsl.conf`, cron active, `@reboot` entries present. `wsl-keepalive.service` inactive — not needed, keepalive is cron-driven |
| Task Scheduler tasks | MISSING | `schtasks /query` finds no `WSL-All-Guard` / `Hostamar Heavy Lifter KeepAlive` tasks. WSL currently survives without them; add only if WSL gets shut down again (YAGNI today) |
| Browser verify | WEAK SIGNAL | Every tick reports `{"Google":false,"Facebook":false,"X":false,"YouTube":false,"Edge":true}` — the script sniffs **window titles**; Edge tabs aren't titled "google/facebook" so it reads false even when logged in. Noise, not signal (see §6) |
| ffmpeg 8.0.1 | INSTALLED | `/usr/bin/ffmpeg` — TV render capable |
| node v22.22.3, piper TTS | INSTALLED | render + voice capable on this PC |
| wrangler | TOKEN BLOCKED | env `CLOUDFLARE_API_TOKEN` is DNS-only; D1/KV/Queue queries need OAuth (`wrangler login`) or a Workers-scoped token. Worker itself is healthy (live endpoints prove it) |

## 2. Corrections to the V15 prompt (stale claims vs. reality)

| Prompt claimed | Reality (verified) |
|---|---|
| Vercel tokens missing: FACEBOOK_PAGE_ACCESS_TOKEN, FB_PAGE_ID, GOOGLE_SERVICE_ACCOUNT_JSON — "must add" | Those 3 are indeed absent, but **X (4 OAuth vars), YouTube (CLIENT_ID/SECRET/REFRESH_TOKEN/DEV_KEY/RTMP_URL), Reddit (4), GOOGLE_API_KEY/CLIENT_ID/SECRET, FACEBOOK_RTMP_URL, TV_* (6), CRON_SECRET, FLEET_REPORT_SECRET** are all set (97 env vars). X + YouTube + Reddit publishing is NOT blocked |
| "0 jobs executed ever" (ab928e6) | Was true. **Root-caused and fixed today** (§3). |
| Need D1 `tv_schedule` table, `tv_script` table, TV render pipeline, TV dashboard | **Already exists, different shape**: 13 `Tv*` tables in Postgres (TvChannel, TvSchedule, TvPlaylistItem, TvVideoSeo, TvStreamDestination, ...), `lib/tv/generator.ts` (RSS→prompt→BullMQ render), `app/api/tv/*` (23 routes incl. generate-loop, channels, epg.xml, iptv.m3u, restream, viral), `app/dashboard/tv/`, `scripts/tv/` (40+ scripts), systemd units running. Building D1 tv_schedule would be a duplicate |
| "TV assets gap: power grid ready, brain missing" | Inverted: the **brain exists and is running** — restream.py + tv-hls2-server.py + tv-agent.service + tv-tunnel.service (tv.hostamar.com) are live systemd units right now. The **queue** was the dead part, and that's fixed |
| Facebook Graph API adapter (lib/facebook/facebook-poster-adapter.mjs) | Does not exist. Facebook path = FACEBOOK_RTMP_URL live-stream. Graph Page posting needs FB_PAGE_ACCESS_TOKEN + FB_PAGE_ID (dashboard-only add) |
| marketing-proofs/, seo-reports/ | Do not exist in repo (correctly excluded by .vercelignore design) |

## 3. Root cause fixed today — the dead job queue

**Bug (since inception, found by commit ab928e6, root-caused now):** in `local-runner/keepalive.sh` the job loop was

```bash
echo $JOBS | jq -c '.[]' | while read job; do
```

`$JOBS`/`$job` unquoted + job payload containing **spaces in the Bengali message text** → shell splits the JSON → jq dies with `Invalid numeric literal` (exactly the error spamming `/tmp/hostamar-cron.log` every 5 min) → `set -e` kills the script **before any job executes**. Result: one x-post job pending for 11+ hours, zero "executing" lines ever logged.

**Fixes applied (this commit):**
1. `local-runner/keepalive.sh` — quoted `$JOBS`/`$job` everywhere; executor's own status report (done/failed) is now authoritative; keepalive only reports `failed` if the executor crashed before reporting. Removed the `while true; sleep 300` in-script loop — crontab already fires every 5 min; the loop would have piled up immortal processes once the jq bug was fixed (a second bug hiding behind the first).
2. `local-runner/execute-job.js` — all 7 job types were **fake-success placeholders** (`report('done', {ok:true})` without doing anything). Now every unimplemented type reports honest `failed` with the pointer to the real path (`POST /api/social/direct` from Vercel, where X/YT/Reddit creds live).

**Verification (live, two cron ticks):**
- Tick 1 (20:45): pull → execute → honest `failed` reported → D1 `reported_at` set. Caught a second real bug: cron PATH lacks `~/.local/bin` so `node` was "command not found" — fixed with absolute `/home/romel/.local/bin/node`. Also caught the patch write stripping keepalive.sh's exec bit (Permission denied at 20:35) — restored with `chmod +x`. Both were caught BECAUSE the loop now reports real failures instead of silently dying.
- Tick 2 (20:55): full round-trip green — push `ping-flow-test` (`{"queued":true}`) → cron pull → node executor runs → reports `failed: unknown type` (correct: synthetic type, not registered) → D1 row updated, `pending:0`. Push→pull→execute→report path proven end-to-end.
- Queue empty of real work; zombie x-post job is now honestly `cancelled`/`failed`, no longer fake-pending.

## 3b. Root cause #2 — Vercel deploys broken 19:16→21:0x (found + fixed during audit)

While verifying this audit's push, deploys were found failing since 19:16 with `exceeded_serverless_functions_per_deployment` (Hobby 12-function cap) — build compiles fine, fails at deploy phase, known Vercel enforcement regression (community-confirmed: even 11 counted functions rejected). Six consecutive production deploys ERRORED; site kept serving from last-good (19:14).

**Culprit window:** 00885ba (READY 19:14) → 68b68fb (ERROR 19:16): two commits flipped `/api/mcp/catalog` + `/api/ai-services/catalog` from `force-dynamic` → `revalidate=3600` (ISR). ISR conversion adds counted function bundles (`.rsc.func` etc.) and tipped the cap.

**Fix (6a5f9c0):** restored the two routes' `force-dynamic` + CDN cache via response headers (`s-maxage`, proven 373832d pattern) — edge cache behavior kept, function count back under cap. Deploy went **● Ready** immediately. Lesson: on this Hobby project, avoid `export const revalidate` on API routes; use `force-dynamic` + Cache-Control headers for edge caching.

## 4. What the TV pipeline actually is (already built)

```
Content:  RSS (Prothom Alo/BBC/TechCrunch) → lib/tv/generator.ts → BullMQ render queue
Stream:   systemd: restream.service (100+ destinations) + tv-hls2.service + tv-tunnel.service (tv.hostamar.com) + tv-agent.service
Schedule: TvSchedule / TvPlaylistItem / TvChannel tables in Postgres; vercel.json cron /api/tv/generate-loop daily 03:00 (TV_AUTO_GENERATE_ENABLED set)
Publish:  /api/social/direct (X OAuth1, YouTube, Reddit — creds in Vercel) — synchronous, real result or real error
Fallback: GitHub Actions heavy-lifter-cloud-backup.yml + tv-fallback.yml when PC off
```

No Vercel CPU for heavy work: render/stream = this PC (systemd), queue = Cloudflare Worker free, publish = Vercel synchronous (light API calls only).

## 5. Actual gaps (the short honest list)

1. **Facebook Page posting** — only missing social path. Needs FB_PAGE_ACCESS_TOKEN + FB_PAGE_ID (dashboard add). OR keep using the RTMP live path already configured. Decide: Reels upload vs live-stream.
2. **Executor has no real PC-side jobs** — every type is an honest stub. Real work currently runs via systemd units + Vercel direct publisher, which means **the queue may not need tv-\* jobs at all** (YAGNI). Only add a `tv-render` job if a job actually needs this PC's ffmpeg and can't run as a systemd unit/cron.
3. **Browser verify is title-sniffing noise** — all-false every tick. Either pin the 4 logged-in tabs in Edge (titles then match) or drop the check from keepalive. Don't build a UIA URL-reader for this (stasis/commtype upgrade path exists if ever needed).
4. **D1 not queryable from WSL** (token perms) — needs one interactive `wrangler login` or a Workers-scoped API token to inspect/repair jobs table from here. Worker is healthy regardless.
5. **Task Scheduler guards absent** — WSL-All-Guard + Heavy Lifter tasks don't exist. WSL is alive without them; install only after the next Windows reboot proves it's needed.

## 6. Where To Start — Ponytail order

**Phase 0 — today (mostly done in this commit):**
- [x] Root-cause the dead queue (keepalive.sh quoting + loop) — DONE
- [x] Make executor honest (no fake ok:true) — DONE
- [x] Verify worker + proxy + social endpoints live — DONE
- [ ] Wait one cron tick → confirm zombie job reports failed, queue empty, `pcOnline:true`, no more jq errors in `/tmp/hostamar-cron.log`
- [ ] One `wrangler login` (OAuth, interactive) to restore D1 visibility from WSL

**Phase 1 — Facebook (the only real publish gap):**
- Add FB_PAGE_ACCESS_TOKEN + FB_PAGE_ID via `vercel env add` (dashboard/CLI, never in chat), OR confirm RTMP live path is "good enough" and skip Graph posting entirely. Ponytail: skip until a job actually needs Page posts.

**Phase 2 — exercise the queue with ONE real job (not tv-\*):**
- Push one genuinely PC-only job (e.g. nightly `vercel-guard-cleanup` → runs `node scripts/vercel-guard.mjs` locally, zero Vercel CPU) end-to-end: push → pull → execute → report. That proves the fixed loop on real work. Do not speculatively add tv-script/tv-voice/tv-render/tv-publish job types — the TV pipeline already generates/streams/publishes through its own proven path.

**Phase 3 — autonomous loop hardening (only after Phase 2 holds for a week):**
- Replace title-sniff browser verify with pinned-tab check or delete it.
- Task Scheduler guards only if a reboot kills WSL persistence.

## 7. Risks & Guards

- **Fake success is now impossible** on the queue path (executor reports real status).
- Never commit: `fleet.json` (lives `~/.hermes/employees/`, outside repo), `auth_state.json`, `~/.hermes/state.db`, `~/actions-runner/`, `/tmp/ECC/`, `/tmp/ponytail/`. Untracked `scripts/comfyui-hunyuan-worker.mjs.bak` left alone.
- `.vercelignore` covers mp4/wav/safetensors/logs (verified). vercel.json = 12 daily crons, none sub-daily. `maxDuration` set per-route (direct publisher 120s).
- `SOCIAL_PUBLISH_SECRET` falls back to `FLEET_REPORT_SECRET` — fail-closed on both social routes.
- PC-off: Worker holds jobs; GitHub Actions backup workflow exists; systemd units restart on WSL boot (`@reboot` + systemd=true).

## 8. ECC + Ponytail

- Ponytail plugin installed (`~/.hermes/plugins/ponytail/` full tree) and active this session (level: full). The audit itself ran on the ladder: reuse of the direct-publisher path over building new adapters, deletion of the sleep-loop, honest stubs over fake scaffolding.
- `~/.hermes/employees/fleet.json` = **49 employees** (not 68/69 — the ECC-68 count is not in this file; reconcile separately if the 68-agent target matters).
- Ladder applied to the TV roadmap: highest rung = "already in codebase" for almost every requested V15 build item.

## 9. Commands to run next

```bash
# confirm self-heal after next cron tick (wait ≤5 min)
tail -n 15 /tmp/hostamar-keepalive.log; tail -n 3 /tmp/hostamar-cron.log
curl -s https://hostamar.com/api/orchestrator/status | jq '{pcOnline, lastReport}'

# restore D1 visibility (interactive, once)
unset CLOUDFLARE_API_TOKEN; wrangler login
wrangler d1 execute hostamar-orchestrator-db --remote --command "SELECT status,COUNT(*) FROM jobs GROUP BY status"

# Facebook decision
vercel env add FB_PAGE_ID production        # only if Graph posting is wanted
vercel env add FACEBOOK_PAGE_ACCESS_TOKEN production
```
