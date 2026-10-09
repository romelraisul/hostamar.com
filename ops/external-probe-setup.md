# External uptime probe — manual setup (NOT automatable from this box)

## Why this exists

`ops/monitoring/radar.sh` runs **on DESKTOP-9KA03CQ**. If that host is off (or WSL is not
running), radar cannot tell you that hostamar.com is down — the thing that would report it
is the thing that is off. So there is a blind spot that no amount of local checks closes:

    radar.sh can detect:  a service down while the host is up
    radar.sh cannot detect: the host itself being off

`sleep`-based local watchdogs do not help — an on-host watchdog dies with the host. The only
fix is a prober that lives *off* the box.

## What to probe (one monitor is enough)

    URL         https://hostamar.com/api/health
    expect      HTTP 200 and body containing "healthy"
    interval    5 min (free tier floor) — 1 min if the plan allows
    timeout     30 s
    keyword     healthy        <- keyword monitors catch a 200 that is actually an error page

Optionally a second monitor on `https://hostamar.com/store` (the public conversion page) and a
third on `https://hostamar.com/api/v1/models` (returns 4 model ids, 590 B — a good liveness signal).

Do **not** probe ports on this box (2222 ssh, 3004 kuma, 11445 litserve): they are not public,
and the Cloudflare tunnel is what makes them reachable.

## Free options

| service | free tier | notes |
|---|---|---|
| UptimeRobot | 50 monitors, 5-min interval | email/Slack/webhook alerts; keyword monitoring on free tier |
| BetterStack (Better Uptime) | 10 monitors, 3-min interval | nicer status pages, 3-min checks on free |
| Cloudflare Health Checks | **paid** (part of a paid plan) | only if a paid zone already exists — it does not here |

UptimeRobot is the default pick: 5-min checks, keyword match, and a public status page all fit
the free tier.

## Steps (about 2 minutes, browser, no automation possible — needs an account)

1. https://uptimerobot.com → Sign up (email only, no card).
2. Add New Monitor:
   - Monitor Type: **Keyword**
   - Friendly Name: `hostamar.com health`
   - URL: `https://hostamar.com/api/health`
   - Keyword Type: **exists**, Keyword: `healthy`
   - Monitoring Interval: 5 minutes
   - Alert Contacts: your email (add Slack/Telegram webhook later if wanted)
3. Save. It turns green on the first successful check.
4. Optional: My Settings → add a Telegram/Slack webhook so an outage pings where you already are.
5. Optional: public status page (Status Pages → create → add the monitor) and link it from
   the marketing site footer.

## If it never goes green

- Cloudflare Bot Fight Mode / WAF can 403 a datacentre prober. If that happens, add the
  prober's IP ranges to the same **IP Access Rule «Allow»** list as the AppSumo ranges
  (Cloudflare → hostamar.com → Security → WAF → Tools → IP Access Rules). Radar reports the
  AppSumo/WAF item as SKIP, never FAIL, so this does not affect local radar results.
- UptimeRobot shows the response body/headers for a failing check — read it before touching
  production.

## Status

**Manual backlog.** Not automated here: creating the account needs a human signup (email
verification, no API path without an account), and storing the API key is outside what this
box should hold. Recorded so the blind spot is explicit rather than assumed away — see
`docs/COMPUTER_RADAR_FINAL.md` § "What is NOT automated".
