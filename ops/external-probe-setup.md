# External uptime probe — setup (manual, ~3 minutes)

## Why this exists (the honest limit)

`ops/monitoring/radar.sh` runs **on this box**. If the box is off, the tunnel is down, or WSL
did not come back after a Windows restart, the radar is off with it — it cannot report its own
outage. Every green radar run is therefore evidence about *this* box only.

The fix is a probe that lives somewhere else and watches one endpoint:

    https://hostamar.com/api/health

The endpoint is already there and already 200s. Nothing to build — pick one free provider below
and point it at that URL.

## Option A — UptimeRobot (free tier: 50 monitors, 5-min checks)

1. Sign up: https://uptimerobot.com  (free, no card)
2. **Add New Monitor**
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `hostamar.com`
   - URL: `https://hostamar.com/api/health`
   - Monitoring Interval: **5 minutes** (the free tier's floor)
   - Alert Contacts: your email (add Telegram under *My Settings → Add Alert Contact* if wanted)
3. Save. Optional, catches a *wrong-content* outage the status code alone misses:
   **Alert when keyword does not exist** → keyword `ok`.

Free-tier floor is 5 min, not 1 — a 1-minute check is a paid feature. 5 min is enough to tell
you the site died while you were asleep, which is the whole point.

## Option B — BetterStack (free tier: 10 monitors, 30-second checks)

1. Sign up: https://betterstack.com/uptime
2. **Create monitor** → HTTP, URL `https://hostamar.com/api/health`, check every **30 seconds**
3. Alert: email, or a webhook to the Telegram bot for a push notification.

Better free cadence than UptimeRobot. Use this one if you want the tighter interval.

## Option C — Cloudflare Health Checks

Requires a paid Cloudflare plan (the zone here is on free) — **not usable**. Listed so nobody
re-researches it.

## What NOT to do

- Do not add a Cloudflare Worker as the probe: a Worker inside the same zone fails together with
  the zone (and with `hostamar-pages`) — it proves nothing about an account-level outage.
- Do not point the probe at `/` : the landing page is cached by the edge and will keep serving 200
  from cache while the origin behind it is dead. `/api/health` is dynamic; that is the point.

## Verification that it works

After saving the monitor, power the box off for one check interval (or stop the tunnel:
`systemctl --user stop cloudflared.service`). You should get exactly one **DOWN** alert, then a
recovery alert when it is back. If no alert arrives, no probe exists — check the alert contact.

## Status

- [ ] Signup done, monitor live, alert contact confirmed (manual, not automatable — free-tier
      account creation needs a human email confirmation)
