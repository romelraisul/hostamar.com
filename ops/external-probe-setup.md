# External uptime probe — setup (IMPLEMENTED, two layers)

## Why this exists (the honest limit)

`ops/monitoring/radar.sh` runs **on this box**. If the box is off, the tunnel is down, or WSL
did not come back after a Windows restart, the radar is off with it — it cannot report its own
outage. Every green radar run is therefore evidence about *this* box only.

`https://hostamar.com/api/health` is the endpoint, and it carries three signals:

    {"status":"healthy",
     "database":{"connected":true,"customers":5},
     "pc":{"alive":true,"via":"turso:FleetReport.runAt","lastSeen":"...","ageSeconds":9,
           "maxAgeSeconds":1200,"rows":100}}

- `"healthy"` + `"connected":true` — the Worker and the database
- `pc.alive` — **the box**. Without it this route stays green while the home box is dead: the
  Worker and Turso are both off-box, so `/api/health` alone cannot see a crashed PC. `pc.alive`
  is the box's own heartbeat (fleet/loop.mjs → `FleetReport` rows in Turso, measured cadence
  ~5 min: 01:20:05 → 01:25:04 → 01:30:06 → 01:35:07 → 01:40:05), true when the newest row is
  younger than `HOSTAMAR_PC_MAX_AGE_S` (default 1200 s).

An earlier draft of this file told probes to look for the keyword `ok`, which the body never
contains (a permanently-red probe) — assert on `healthy`, `connected`, and `pc.alive`.

## Layer 1 (PRIMARY) — Cloudflare Worker cron `hostamar-probe`

    https://hostamar-probe.romelraisul.workers.dev          # state + last check
    https://hostamar-probe.romelraisul.workers.dev/?check=1 # probe now, never alerts

Source `workers/probe/` (index.js + wrangler.toml), deployed 2026-10-10, cron `*/5 * * * *`.
Deploy: `npx wrangler deploy -c workers/probe/wrangler.toml` from `~/hostamar.com`.
Test the alert path: same command with `--var FORCE_DOWN:1`, wait one tick, then redeploy
without the flag to get the recovery message.

Why a Worker cron and not only GitHub Actions: **this repo's `schedule` events are not being
delivered.** Measured 2026-10-10: `tv-fallback.yml` (`*/15`) last ran on cron 2h20m earlier,
`model-heal.yml` 13 days earlier, and `external-probe.yml` had **zero** scheduled runs in 104
minutes while `workflow_dispatch` started instantly and every workflow reported state `active`.
GitHub's cron is documented as best-effort, but hours of drift makes it useless as a "the box
died while you were asleep" alarm. Cloudflare's cron fires on time — measured on this worker:
**18 checks in 90 minutes, every 5 minutes to the second.**

### Two box signals, because the two failure speeds differ

| signal | what it does | how fast |
|---|---|---|
| tunnel probe | fetches `decisions.hostamar.com/health` (box-only, through the tunnel) | 502/530/timeout within **one** tick; alerts after **two** consecutive failures so a CF edge hiccup doesn't page anyone |
| heartbeat age | reads `pc.alive` from `/api/health` | slower (~15-20 min) but still fires when the tunnel answers and the box's internals are wedged |

Verdicts: `UP`, `UP:edge_challenged` (public URL bot-challenged, workers.dev fallback answered),
`UP:tunnel_blip` (one failed tunnel probe, not believed yet), `DEGRADED:tunnel_down`,
`DEGRADED:pc_off`, `DOWN:*`. Alerts go to **Slack + Telegram** and fire on transition (plus a
30-minute reminder while still bad), so a flapping service does not spam the channel.

### Measured evidence (all of it from the live worker)

| when (UTC) | what | result |
|---|---|---|
| 02:46 | first deploy, cron registered | 18 checks by 04:20, 5-min spacing, no missed ticks |
| **02:51 host crash → 03:13 reboot** | the box actually died (Windows event 41/6008, see `docs/WSL_COLD_BOOT_VERIFIED.md`) | `DEGRADED:pc_off` alert at 03:10:32, recovery at 03:15:31 |
| 04:00 | `--var FORCE_DOWN:1` | `DOWN:forced_test` alert delivered |
| 04:20 | flag removed | recovery alert: `lastAlerted = "slack=200 telegram=200"` |
| 04:25 | steady state | `UP`, `tunnel={'code':200}`, `pc.ageSeconds` ~110 |

Note the 02:51 crash: the first version had only the heartbeat signal and took **19 minutes** to
notice. That is what the tunnel probe was added for.

Blind spot, stated on purpose: this runs inside the same Cloudflare account as the site, so a
Cloudflare-wide outage silences it. Layer 2 covers that case when its cron runs; for a true
third-party view use a dedicated monitor (below).

## Layer 2 (SECONDARY) — GitHub Actions `.github/workflows/external-probe.yml`

Same verdict logic on a GitHub-hosted runner, every 10 min *if* the cron fires (it did not in
104 minutes of measurement — see above). Still useful: `workflow_dispatch` works instantly, it
is the only check whose failure emails you, and it is outside Cloudflare entirely.

    gh workflow run external-probe.yml -R romelraisul/hostamar.com --ref main
    gh workflow run external-probe.yml -R romelraisul/hostamar.com --ref main -f test_alert=true

Issues are disabled in this repo, so there is no issue-creating step; alerts are the red run
(owner email) plus Slack.

### Measured gotcha A: the public hostname challenges datacenter IPs

From a GitHub runner **every path on `hostamar.com` answers 403 with Cloudflare's managed
challenge** ("Just a moment...") — measured matrix, 2026-10-10:

    https://hostamar.com/                          403 challenge=yes
    https://hostamar.com/api/health                403 challenge=yes
    https://hostamar.com/api/tv/heartbeat          403 challenge=yes
    https://hostamar.com/api/v1/models             403 challenge=yes
    https://hostamar-pages.romelraisul.workers.dev/ (same 4 paths)  200 challenge=no

So it is not path-specific and not a real outage: the zone's bot protection rejects cloud-provider
IPs before the request reaches the Worker. A naive probe reports a false DOWN (the first version
did). Both layers detect the challenge and fall back to the Worker's hostname.
**A Worker cron is not challenged** (measured: `edge=direct`, 200) — that is why Layer 1's tunnel
probe works.

- **Option A/B below will hit the same challenge** on the public URL. `radar.sh`'s L5 check is
  explicit that this cannot be fixed from here: the tokens on this box are `Zone:Read` + worker
  OAuth and **neither has `Firewall:Edit`** (error 10000), so any exception has to be added in the
  dashboard (Security → WAF → Tools → IP Access Rules — same reason the AppSumo ranges are a SKIP
  there).
- Same class of bug in `tv-fallback.yml`: its heartbeat check (`/api/tv/heartbeat`) is challenged
  too, so `pcAlive` is always false there and the off-box TV fallback never sees a live PC. It
  currently exits green only because `YT_RTMP_URL`/`FB_RTMP_URL` are unset. If those secrets are
  ever set, the fallback would stream a loop over the live stream while the box is actually fine.

### Measured gotcha B: the Worker's own fetch is challenged when the caller was

Pointing `pc` at a tunnel fetch from the Worker was tried first and abandoned: same-zone
subrequests inherit the caller's challenge verdict, so for a challenged caller the Worker's own
fetch came back 403 and the probe false-alarmed. Reading the heartbeat from Turso cannot be
challenged — hence the DB-based `pc.alive`.

## Option A — UptimeRobot (free tier: 50 monitors, 5-min checks)

1. Sign up: https://uptimerobot.com  (free, no card)
2. **Add New Monitor** → HTTP(s), Friendly Name `hostamar.com`,
   URL `https://hostamar.com/api/health`, Interval **5 minutes**, alert contact = your email
   (Telegram can be added: *My Settings → Add Alert Contact*).
3. Optional keyword check → `healthy`. Note a keyword check cannot see `pc.alive`, so Option A
   can only watch the Worker/DB, never the box.

Free tier's floor is 5 min, not 1. Expect gotcha A until the zone has an exception.

## Option B — BetterStack (free tier: 10 monitors, 30-second checks)

1. Sign up: https://betterstack.com/uptime
2. **Create monitor** → HTTP, `https://hostamar.com/api/health`, every **30 seconds**
3. Alert: email, or a webhook to the Telegram bot for a push notification.

Same challenge caveat as Option A.

## Option C — Cloudflare Health Checks

Requires a paid Cloudflare plan (this zone is on free) — **not usable**. Listed so nobody
re-researches it. (Layer 1 is a Worker cron, not a Health Check: free, and it works.)

## What NOT to do

- Do not rely on GitHub `schedule` alone on this repo — measured not to fire for hours.
- Do not point a probe at `/`: the landing page is cached by the edge and keeps serving 200 from
  cache while the origin behind it is dead. `/api/health` is dynamic; that is the point.
- Do not treat a 403 with a "Just a moment..." body from a cloud runner as DOWN: that is the
  challenge, not an outage.
- Do not try to fix the challenge with the credentials on this box — they cannot edit firewall
  rules (measured: `Firewall:Edit` missing); it needs the dashboard.

## How to verify a probe works

    curl -s https://hostamar-probe.romelraisul.workers.dev/?check=1   # verdict right now
    curl -s https://hostamar-probe.romelraisul.workers.dev/           # when it last ran + last alert result

Layer 1 was verified by the real host crash at 02:51 (alert 03:10, recovery 03:15) and by the
forced cycle at 04:00/04:20 (`slack=200 telegram=200`). For a monitor (Option A/B), power the box
off for one check interval — expect exactly one DOWN alert and one recovery alert.

## Status

- [x] Layer 1 live and verified: Cloudflare Worker cron every 5 min, fires on time, alerts Slack
      + Telegram, caught a real host crash and its recovery
- [x] Layer 2 present (GitHub Actions) with both channels verified when dispatched; its repo-wide
      `schedule` trigger is measured-broken and documented as secondary
- [ ] Optional: dedicated status-page monitor (Option A/B) — blocked on a zone firewall exception
      (needs `Firewall:Edit` in the dashboard) and on a human email confirmation for the signup
