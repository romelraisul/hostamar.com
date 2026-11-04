# Slack Notifications — Hostamar.com

## Overview
Real-time alerting for Hostamar.com infrastructure via Slack webhook to `#hostamar-alerts`.

## Configuration
- **Webhook URL**: Stored in Infisical as `SLACK_WEBHOOK_URL` (add via Infisical UI: https://api.slack.com/messaging/webhooks → create webhook for `#hostamar-alerts`)
- **Local mirror**: `/home/romel/automation/infisical.env` (chmod 600)
- **Scripts**:
  - `/home/romel/hostamar.com/scripts/notify-slack.mjs` — send arbitrary message
  - `/home/romel/hostamar.com/scripts/probe-and-notify.mjs` — health probe + auto-notify on fail

## Endpoints Probed (17)
```
https://hostamar.com/
https://hostamar.com/login
https://hostamar.com/pricing
https://hostamar.com/api/v1/models
https://hostamar.com/api/store/products
https://hostamar.com/tv
https://hostamar.com/tv/manifest.json
https://hostamar.com/api/tv
https://hostamar.com/api/tv/playlist
https://hostamar.com/api/tv/stable-channels
https://hostamar.com/api/tv/status
https://hostamar.com/api/tv/heartbeat
https://hostamar.com/admin
https://hostamar.com/api/admin/stats
https://hostamar.com/models.json
https://api.hostamar.com/v1/models
https://api-primary.hostamar.com/v1/models
```

## Cron Jobs
| Schedule | Command | Purpose |
|---|---|---|
| `*/30 * * * *` | `probe-and-notify.mjs` | Health probe every 30 min, alert on any 5xx/FAIL |
| `0 * * * *` | `docker ps` + notify | Fleet hourly check, alert on any non-Up container |

## Usage
```bash
# Manual test
node scripts/notify-slack.mjs "Custom message"

# Probe manually
node scripts/probe-and-notify.mjs
```

## Logs
- Probe log: `/home/romel/.hermes/logs/probe.log`
- Cron output captured to same file

## Acceptance (2026-11-05)
- ✅ All 17 endpoints return 200/401 (admin auth expected)
- ✅ Probe cron installed
- ✅ Fleet cron installed
- ✅ Scripts executable and tested
