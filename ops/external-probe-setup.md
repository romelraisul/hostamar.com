# External uptime probe — setup

## Why this exists (the honest limit)

`ops/monitoring/radar.sh` runs **on this box**. If the box is off, the tunnel is down, or WSL
did not come back after a Windows restart, the radar is off with it — it cannot report its own
outage. Every green radar run is therefore evidence about *this* box only.

The fix is a probe that lives somewhere else and watches one endpoint:

    https://hostamar.com/api/health

The endpoint is dynamic (the landing page is edge-cached and keeps serving 200 from cache while
the origin behind it is dead) and reports both the app and the DB:

    {"status":"healthy", ..., "database":{"connected":true,"customers":5}, ...}

Assert on `"healthy"` **and on `"connected":true`** — an earlier draft of this file told probes to
look for the keyword `ok`, which the body never contains (that would have been a permanently-red
probe).

## Option D — GitHub Actions probe (IMPLEMENTED 2026-10-10, verified live)

`.github/workflows/external-probe.yml` — GitHub-hosted runner, every 10 min, off-box, no account
to create and no email to confirm. This is the probe that is actually running; it closes item 2
of the backlog without a manual signup.

What it does: probes the public URL, and on failure alerts **Slack** (`SLACK_WEBHOOK_URL` secret)
and **fails the run** (GitHub then mails whoever last modified the workflow file on scheduled
failures — issues are disabled in this repo, so there is no issue path).

Verified beats (all three runs are in the Actions tab):

| run | verdict | conclusion |
|---|---|---|
| diagnostics matrix (dispatch `debug_paths`) | — host/path matrix printed | success |
| normal dispatch | `UP:edge_challenged` | success |
| dispatch `test_alert=true` | `DOWN:forced_test`, `slack_http=200` | failure (red by design) |

### Measured gotcha: the public hostname challenges datacenter IPs

From a GitHub runner **every path on `hostamar.com` answers 403 with Cloudflare's managed
challenge** ("Just a moment...") — measured matrix, 2026-10-10:

    https://hostamar.com/                          403 challenge=yes
    https://hostamar.com/api/health                403 challenge=yes
    https://hostamar.com/api/tv/heartbeat          403 challenge=yes
    https://hostamar.com/api/v1/models             403 challenge=yes
    https://hostamar-pages.romelraisul.workers.dev/ (same 4 paths)  200 challenge=no

So it is not path-specific and not a real outage: the zone's bot protection rejects cloud-provider
IPs before the request ever reaches the Worker. Consequences worth knowing:

- A **naive probe reports a false DOWN** (the first version of this workflow did exactly that).
  The shipped probe detects the challenge marker and falls back to the Worker's own hostname
  `hostamar-pages.romelraisul.workers.dev`, which is not behind the zone's bot rules:
  `UP:edge_challenged` = "site is up, our probe IP is being challenged". A real outage (fallback
  dead too) still reports DOWN.
- **Option A/B below will hit the same challenge** when their probe IPs are datacenter ranges, so
  they cannot be relied on against the public URL until the zone gets an exception for
  `/api/health`. Free-plan Bot Fight Mode cannot be skipped with a WAF skip rule; that needs a
  dashboard change (or Super Bot Fight Mode) from the account owner.
- Same class of bug in `tv-fallback.yml`: its heartbeat check (`/api/tv/heartbeat`) is challenged
  too, so `pcAlive` is always false there and the off-box TV fallback never sees a live PC. It
  currently exits green only because `YT_RTMP_URL`/`FB_RTMP_URL` are unset. If those secrets are
  ever set, the fallback would stream a loop over the live stream while the box is actually fine.

## Option A — UptimeRobot (free tier: 50 monitors, 5-min checks)

1. Sign up: https://uptimerobot.com  (free, no card)
2. **Add New Monitor**
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `hostamar.com`
   - URL: `https://hostamar.com/api/health`
   - Monitoring Interval: **5 minutes** (the free tier's floor)
   - Alert Contacts: your email (add Telegram under *My Settings → Add Alert Contact* if wanted)
3. Save. Optional, catches a *wrong-content* outage the status code alone misses:
   **Alert when keyword does not exist** → keyword `healthy`.

Free-tier floor is 5 min, not 1 — a 1-minute check is a paid feature. 5 min is enough to tell
you the site died while you were asleep. Expect the challenge gotcha above until the zone has an
exception for this path.

## Option B — BetterStack (free tier: 10 monitors, 30-second checks)

1. Sign up: https://betterstack.com/uptime
2. **Create monitor** → HTTP, URL `https://hostamar.com/api/health`, check every **30 seconds**
3. Alert: email, or a webhook to the Telegram bot for a push notification.

Better free cadence than UptimeRobot. Use this one if you want the tighter interval. Same
challenge caveat as Option A.

## Option C — Cloudflare Health Checks

Requires a paid Cloudflare plan (the zone here is on free) — **not usable**. Listed so nobody
re-researches it.

## What NOT to do

- Do not add a Cloudflare Worker as the probe: a Worker inside the same zone fails together with
  the zone (and with `hostamar-pages`) — it proves nothing about an account-level outage.
- Do not point the probe at `/` : the landing page is cached by the edge and will keep serving 200
  from cache while the origin behind it is dead. `/api/health` is dynamic; that is the point.
- Do not treat a 403 with a "Just a moment..." body as DOWN from a cloud runner: that is the
  challenge, not an outage.

## How to verify a probe works

Option D is already verified (table above). To re-verify at any time:

    gh workflow run external-probe.yml -R romelraisul/hostamar.com --ref main
    gh workflow run external-probe.yml -R romelraisul/hostamar.com --ref main -f test_alert=true

The second command must post a `[TEST]` Slack alert and fail the run. For a monitor (Option A/B),
power the box off for one check interval (or stop the tunnel:
`systemctl --user stop cloudflared.service`) and expect exactly one **DOWN** alert, then a
recovery alert.

## Status

- [x] Off-box probe live and verified (Option D, GitHub Actions, every 10 min)
- [x] Alert path verified end-to-end (`slack_http=200`, red run)
- [ ] Optional: dedicated status-page monitor (Option A/B) — blocked on the zone challenge
      exception, and on a human email confirmation for the signup
