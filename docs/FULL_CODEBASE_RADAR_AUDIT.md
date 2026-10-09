# Full codebase investigation + monitoring radar audit

Date: 2026-10-10 (WSL box). Method: live probes against https://hostamar.com, the
running box (podman/systemd/nvidia), the repo trees, and a persistent
`wrangler tail` on the deployed Worker. Nothing below is inferred from a file
existing - each line was produced by a command in this session.

## 1. Codebase inventory (real counts, this checkout)

| area | count |
|---|---|
| `app/**/*.ts,tsx` | 667 |
| `app/api/**/route.ts` | 384 |
| `components/**` | 107 |
| `lib/**/*.ts` | 188 |
| prisma models | 91 |
| `ops/` | 33 files |
| `video-pipeline/` | 17 files, `video-api/` 8, `infra/` 8, `grafana/` 5, `model-server/` 4, `litserve_gateway/` 3, `medusa-bridge-worker/` 3, `logging/` 3, workers/cloudflare-worker/ai-gateway-worker/ 2 each |
| npm scripts | 20 |

Route surface is far larger than the "55+ routes" in the old notes (384
`route.ts`). That does not change the monitored contract: the radar probes the
13 *customer-visible* routes plus the 6 data endpoints AppSumo/uptime care about,
and the tail ledger covers every Worker invocation including the unlisted ones.

`deductCredits` is called from **15 files** - billing blast radius if that helper
regresses:

    app/api/auth/signup/route.ts            app/api/chat/route.ts
    app/api/chat/vercel/route.ts            app/api/credits/deduct/route.ts
    app/api/dashboard/videos/create/route.ts app/api/generate/route.ts
    app/api/services/activate/route.ts      app/api/tools/run/route.ts
    app/api/v1/chat/completions/route.ts    app/api/v1/embeddings/route.ts
    app/api/v1/responses/route.ts           app/api/video/generate/route.ts
    lib/ai-stream.ts  lib/credit-grant.ts   lib/credits.ts  lib/mcp/registry.ts

`node scripts/test-billing.mjs` stays the gate for that column (14/14 in the last
verified run).

## 2. Live evidence - every monitored point, one pass (radar.sh, FAIL=0)

    2026-10-10 OK   L1 routes      | 13/13 x200                       (cache-busted)
    2026-10-10 OK   L1 og:tags     | 6 pages carry og:image
    2026-10-10 OK   L1 og:image    | 200 image/png 52438 B
    2026-10-10 OK   L2 health      | status=healthy db=connected
    2026-10-10 OK   L2 models      | 176 rows        free-models | 48 rows
    2026-10-10 WARN L2 good-models | no-redis: UPSTASH_REDIS_* unset on the Worker -> no-op
    2026-10-10 OK   L2 pins        | 6/6          decision audit GET = 401
    2026-10-10 OK   L3 receipts    | jsonl=134 turso=134 MATCH
    2026-10-10 OK   L4 containers  | 6 up   provisioner-native active (container Exited = deliberate)
    2026-10-10 OK   L4 disk/gpu    | 58% used    3776/8151 MiB (46%)
    2026-10-10 OK   L4 uptime-kuma | localhost:3004 -> 302
    2026-10-10 OK   L5 ssh         | ssh.socket active, listening 2222
    2026-10-10 OK   L5 systemd     | 0 failed (system + user)
    2026-10-10 OK   L5 gate        | SELFTEST_PASS
    2026-10-10 SKIP L5 waf appsumo | no token with Firewall:Edit (10000) - dashboard only
    2026-10-10 OK   L6 pricing     | 3 plans in JSON-LD (990 / 1900 / 2900)
    2026-10-10 OK   L6 seo         | Product on / , FAQPage on /faq , sitemap 200
    2026-10-10 OK   L7 tail        | 124 events ok=124 exceededCpu=0 max_cpu=729ms mean_cpu=121ms cold>400ms=4 (3%)

## 3. What now watches every break point

| # | break point | watcher | acts? |
|---|---|---|---|
| 1 | Worker 1102 / 503 / cold init | `tail-radar.service` -> `tail_radar.json`, parsed each radar pass | no (report only) |
| 2 | a customer route 4xx/5xx | radar L1, 13 routes, cache-busted | no |
| 3 | OG card regression (AppSumo/social) | radar L1 og:tags + og:image size/type | no |
| 4 | catalog shape (176/48), pins, audit auth | radar L2 | no |
| 5 | billing/permission drift | nightly `radar-deep` suites | no |
| 6 | DecisionReceipt dual-write drift | radar L3 `--mirror-check` | no |
| 7 | fleet container death | radar L4 + `--fix` (max 3/hour) | **yes, restart only** |
| 8 | disk / GPU exhaustion | radar L4 thresholds | no |
| 9 | systemd unit failure, ssh 2222 | radar L5 | no |
| 10 | decision-gate quality regression | radar L5 selftest | no |
| 11 | pricing / schema / sitemap regression | radar L6 | no |
| 12 | box offline entirely | **nothing yet** - needs an external probe (UptimeRobot free, points at /api/health) | n/a |

Units are symlinks from `~/.config/systemd/user/` to `ops/monitoring/` in this
repo, `Linger=yes`, so 15-min + nightly passes survive reboot.

## 4. Corrections to the old ground truth (measured, not guessed)

* `FAQPage` JSON-LD is on `/faq` + `/generate`, **not** on `/`. `Product` is on
  `/`. Live both. Old note "Product+FAQPage in layout.tsx + page.tsx" is stale.
* `/api/v1/free-models` -> `{timestamp, count, models}` (key `models`);
  `/api/v1/models` -> `{object, data, source, freeAdded, ...}` (key `data`).
* `/pricing` price markup is `৳` + an HTML comment, so `grep ৳990` never matches;
  the greppable truth is JSON-LD `"price":"990"`.
* `wrangler tail` needs `env -u CLOUDFLARE_API_TOKEN` (the env var shadows the
  OAuth login; that token is Zone:Read only) and emits pretty-printed multi-line
  JSON - stream-decode it.
* `/api/health/detailed` is **404 live and has no source file** in
  `/home/romel/hostamar-build` - it was a plan, never a route. `/api/health` is
  the live unauthenticated endpoint (200, `status: healthy`).
* `set -o pipefail` + `curl | grep -q` is a false-negative trap (grep exits first,
  curl dies SIGPIPE 141, pipeline "fails" on a match). Radar uses `set -u` only.

## 5. Deliberate non-actions (and why)

* **No new Worker routes** (`/api/health/detailed`, `/api/monitoring/radar`). A
  route inside hostamar-pages cannot see podman, systemd, ssh.socket, disk, GPU or
  the tail ledger - the layers that actually break - and shipping one costs a
  40 MB OpenNext deploy over a link that fails about half the time. The live
  `/api/health` already gives an external monitor its 200/`healthy`. If a
  machine-readable all-layer JSON is ever needed off-box, it should be produced
  by a tunnel to this radar, not by a Worker.
* **No in-app monitoring dashboard.** Same reason; `monitoring/radar/daily/YYYY-MM-DD.md`
  + `radar.log` are the record, and Uptime-Kuma (:3004, already running) is the UI.
* **No auto-restart beyond the 6 known containers.** Restarting the provisioner or
  systemd units blind can break the one-poller rule / PIN invariants.
* **WAF IP rules left to the dashboard** - proven impossible with either
  credential here (error 10000 on `firewall/access_rules`).

## 6. Untouched by design

SSO 19 secrets, model files / weights (no `st_probe.py` deletion path exercised),
`docs-content` 2.48 MB, `backups/stale-downloads` 7.4 GB, the provisioner
`Exited restart:no` one-poller, legal pages (`app/privacy|terms|refund|faq`),
existing SEO schema, `NEXTAUTH_URL`, the deployed Worker `hostamar-pages`, and the
"1 push = 1 deploy" Vercel rule (quota checked before this commit: 0/100).

## 7. Incident, disclosed

The first radar pass wrote its output into `logs/radar.log` +
`logs/radar/daily/2026-10-10.md` **including a full environment dump**: one radar
status message contained backticks around a command, which bash executed as a
substitution (`env`), and the output - with credentials - landed in those two
files. Both files were deleted immediately (they were created by that single run),
the backticks were removed, and a re-run wrote clean logs. No file that existed
before this session was affected, and nothing left the box. Lesson kept in
docs/MONITORING_RADAR.md: never put backticks inside a bash double-quoted status
string.
