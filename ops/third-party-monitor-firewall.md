# Third-party monitor (UptimeRobot) — WAF allow steps for the dashboard

Date: 2026-10-11. Zone: hostamar.com (`2aef176c6f2000da2af593f4890ec298`).

## Status of the two probes

| Probe | Role | State |
|---|---|---|
| `workers/probe` (hostamar-probe.romelraisul.workers.dev) | PRIMARY — Cloudflare Worker cron `*/5`, off-box, KV state, Slack+Telegram alerts | RUNNING — 320+ checks, `lastAlerted: slack=200 telegram=200` |
| UptimeRobot (external, secondary view) | SECONDARY — third-party vantage point, public status page | NOT SET UP — needs dashboard firewall exception |

Why keep UptimeRobot even though the Worker probe works: the Worker runs in
the same Cloudflare account as the site (stated blind spot in
`workers/probe/index.js`). An external monitor is the only view that survives
a whole-account or whole-Cloudflare problem.

## What is blocked today — measured

- Plain GET `/api/health` from WSL: **200**
- GET with `UptimeRobot/2.0` UA from WSL: **200** (UA itself is not blocked)
- Cloudflare WAF/Bot-Fight-Mode on datacenter IPs is the risk, not the UA:
  UptimeRobot checks originate from datacenter ranges (AWS/Hetzner/DigitalOcean
  per the IP list) and can be challenged by managed rules. The exception below
  removes that risk permanently.

## IPs to allow

UptimeRobot publishes an official list; the snapshot in this repo is
`ops/uptimerobot-ips.txt` (205 entries: 103 IPv4 /32s + 103 IPv6 /128s,
fetched 2026-10-11 from UptimeRobot's list via cloud-ip-ranges.com).
Refresh source: the IP API on UptimeRobot's dashboard (My Settings → IP
Addresses / their Jan 2026 blog announcement).

Note: these are individual /32s, not aggregateable ranges. Cloudflare free
plan allows 1000 firewall rules — 205 IP rules is affordable but clunky; the
custom-rule path (below) is cheaper.

## Dashboard steps (manual, ~2 min, needs a token with Firewall:Edit)

The current ops token gets `error 10000` on firewall writes — permission
missing. A dashboard session (or a token with **Zone → Firewall Services →
Edit**) is required.

### Option A — one custom firewall rule (recommended, 1 rule)

Cloudflare dash → hostamar.com → **Security → WAF → Custom rules** →
**Create rule**:

- Name: `allow-uptimerobot`
- Field: `IP Source Address` — but 205 separate IPs can't go in one rule.
  So instead use **ASN**: UptimeRobot does NOT publish an ASN, so use the
  expression editor with an `in` list built from `ops/uptimerobot-ips.txt`
  (cap: expressions allow up to ~65k chars — 205 IPs fits comfortably).
- Action: **Skip** (Skip remaining rules) — skips WAF/bot evaluation for
  those IPs. Do NOT use "Allow" — Allow bypasses ALL security including
  rate limiting; Skip is the safe minimal exception.
- Click **Deploy**.

Expression generator (paste-ready):

```
(ip.src in {3.12.251.153 3.20.63.178 3.77.67.4 ...})  <- full list from ops/uptimerobot-ips.txt, space-separated
```

Build it with: `grep -v ':' ops/uptimerobot-ips.txt | paste -sd' '`

### Option B — IP Access Rules (simple, 205 clicks — only if Option A's editor fights you)

Cloudflare dash → **Security → WAF → Tools → IP Access Rules** → for each IPv4
in `ops/uptimerobot-ips.txt`: enter IP, choose `Allow`, zone `hostamar.com`,
note `uptimerobot`. (IPv6 /128s same way.)

### Option C — WAF exception on the health check only (narrowest)

If the whole-zone exception feels too broad, scope it to the one endpoint the
monitor hits: custom rule `(http.host eq "hostamar.com" and http.request.uri.path eq "/api/health" and ip.src in {...})`
→ Skip. UptimeRobot only needs `/api/health` (returns `{"status":"ok"}`).

## After the exception

1. Create the monitor at uptimerobot.com (free: 50 monitors / 5-min interval):
   - Type: HTTP(s), URL: `https://hostamar.com/api/health`
   - Interval: 5 min
   - Keyword monitoring optional: alert if `status` missing.
2. Verify first check goes green (Dashboard → monitor → logs show 200).
3. Screenshot the green monitor + the firewall rule for the ops journal.

## Verification command (WSL, after adding)

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://hostamar.com/api/health   # expect 200
```

The real confirmation is UptimeRobot's own check log showing 200 from their
engines (datacenter IPs are the ones that get challenged; our WSL vantage
already returns 200 and proves nothing about the WAF).
