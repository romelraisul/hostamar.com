# TUNNEL — Cloudflare Tunnel Config, hostamar-primary, TV Agent

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** LIVE — Tunnel 2d67d851 running, TV agent active

---

## hostamar-primary Tunnel (2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f)

### Config File: `/home/romel/.cloudflared/hostamar-primary-config.yml`

```yaml
tunnel: 2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f
credentials-file: /home/romel/.cloudflared/2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f.json
origincert: /home/romel/.cloudflared/cert.pem

ingress:
  - hostname: hostamar.com
    service: http://localhost:3000
  - hostname: www.hostamar.com
    service: http://localhost:3000
  - service: http_status:404
```

### Startup Commands

```bash
# Kill existing
pkill -f "cloudflared tunnel run"

# Start with correct config
cloudflared tunnel --config /home/romel/.cloudflared/hostamar-primary-config.yml run &

# Verify connections (expect 4 QUIC connections)
# Log shows: Registered tunnel connection connIndex=0..3 event=0 ip=198.41.x.x location=osl01/arn06/arn08/arn09 protocol=quic
```

### Tunnel Info (Live)

```bash
cloudflared tunnel info 2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f
# NAME:     hostamar-primary
# ID:       2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f
# CONNECTOR: 4 active (QUIC, osl01, arn06, arn08, arn09)
```

---

## All Active Tunnels

| Tunnel ID | Name | Purpose | Connections |
|-----------|------|---------|-------------|
| 2d67d851... | hostamar-primary | api.hostamar.com → localhost:3000 | 4 QUIC |
| 5affa5bd... | hostamar-local | git/ai/comfy/browser/hostamar.com | 5 QUIC |
| 394c7d28... | hostamar-camofox | camofox.hostamar.com | 2 QUIC |
| c3b55a05... | hostamar-tv | tv.hostamar.com | 3 QUIC |
| 4b3e302c... | hostamar-sites | sites | 2 QUIC |
| 8c8933a4... | medusa-ingress | medusa | 3 QUIC |

---

## Windows netsh Portproxy (4 Rules)

```powershell
# Run as Administrator
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$(wsl hostname -I)
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=$(wsl hostname -I)
netsh interface portproxy add v4tov4 listenport=3002 listenaddress=0.0.0.0 connectport=3002 connectaddress=$(wsl hostname -I)
netsh interface portproxy add v4tov4 listenport=3003 listenaddress=0.0.0.0 connectport=3003 connectaddress=$(wsl hostname -I)

# Verify
netsh interface portproxy show all
```

---

## WSL Relay Wedge Fix

```bash
# If WSL networking wedged:
wsl --shutdown
# Then restart tunnel
```

---

## TV Agent (scripts/tv-agent/agent.js)

### systemd Service: `/home/romel/.config/systemd/user/tv-agent.service`

```ini
[Unit]
Description=Hostamar TV Agent (polls hostamar.com commands)
After=network-online.target

[Service]
Type=simple
Restart=always
RestartSec=10
WorkingDirectory=/home/romel/hostamar.com/scripts/tv-agent
EnvironmentFile=/home/romel/hostamar.com/.tv-agent-secret.local
Environment=HOSTAMAR_API=https://hostamar.com
ExecStart=/home/romel/.local/bin/node agent.js

[Install]
WantedBy=default.target
```

### Secret File: `/home/romel/hostamar.com/.tv-agent-secret.local`

```
TV_AGENT_SECRET=686dc8917e2d30103bc67b1c931adedd239e5a69a6274d9b
```

### Agent Polling Logic

```javascript
// Polls every 10s: GET /api/tv/agent/commands?secret=TV_AGENT_SECRET
// Headers: x-agent-secret: TV_AGENT_SECRET
// Actions: START_WEBSITE, START_ALL, STOP, RELOAD_PLAYLIST, GENERATE_VIDEO
// ACK: POST /api/tv/agent/ack { commandId, status, log, secret }
```

### Commands

```bash
# Start/Restart
systemctl --user daemon-reload
systemctl --user restart tv-agent.service

# Status
systemctl --user status tv-agent.service
# expect: Active: active (running)

# Logs
journalctl --user -u tv-agent.service -f
# expect: [tv-agent 2026-11-03T21:57:43.173Z] Hostamar TV Agent starting
#         [tv-agent 2026-11-03T21:57:44.285Z] poll → 200 {ok: true, commands: []}
```

---

## Verification

```bash
# Tunnel health
curl -s -o /dev/null -w "%{http_code}\n" https://api-primary.hostamar.com/health -m 10
# expect: 200 (or 404 if no /health endpoint, but tunnel connected)

# Fallback
curl -s -o /dev/null -w "%{http_code}\n" https://hostamar.alwaysdata.net/api/health -m 10
# expect: 200

# TV agent endpoint
curl -s "https://hostamar.com/api/tv/agent/commands?secret=686dc8917e2d30103bc67b1c931adedd239e5a69a6274d9b"
# expect: {ok: true, commands: []}
```

---

## Fix History

| Date | Issue | Fix |
|------|-------|-----|
| 2026-11-04 | Tunnel down (wrong config.yml) | Restarted with hostamar-primary config.yml (ingress hostamar.com→localhost:3000) |
| 2026-11-04 | TV agent 401 | TV_AGENT_SECRET added to wrangler-pages.toml + .tv-agent-secret.local, systemd restart |
| 2026-10-18 | Tunnel created | cloudflared tunnel create hostamar-primary |