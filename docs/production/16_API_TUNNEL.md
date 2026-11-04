# Hostamar.com — API Tunnel (api.hostamar.com)

**Last verified:** 2026-11-04 Asia/Dhaka  
**Status:** Tunnel active, worker deployed, /v1/models blocked by Bot Fight Mode

## Architecture

```
api.hostamar.com (Cloudflare Worker: api-router)
    │
    ├── PRIMARY → api-primary.hostamar.com (Cloudflare Tunnel → nvidia-guard:12436)
    │
    └── FALLBACK → hostamar.alwaysdata.net (AlwaysData free tier)
```

## Tunnel Configuration

### hostamar-api-primary Tunnel
- **Tunnel ID:** `b9839ba7-bdab-4591-8eeb-d8de95a9ee80`
- **Name:** `hostamar-api-primary`
- **Target:** `http://localhost:12436` (nvidia-guard service)
- **DNS:** `api-primary.hostamar.com` → CNAME to tunnel

### Config: `/home/romel/.cloudflared/hostamar-api-primary-config.yml`
```yaml
tunnel: b9839ba7-bdab-4591-8eeb-d8de95a9ee80
credentials-file: /home/romel/.cloudflared/b9839ba7-bdab-4591-8eeb-d8de95a9ee80.json
origincert: /home/romel/.cloudflared/cert.pem

ingress:
  - hostname: api-primary.hostamar.com
    service: http://localhost:12436
  - service: http_status:404
```

### Systemd Service
```bash
# Start
systemctl --user start cloudflared-hostamar-api-primary
systemctl --user enable cloudflared-hostamar-api-primary

# Check status
systemctl --user status cloudflared-hostamar-api-primary

# Logs
journalctl --user -u cloudflared-hostamar-api-primary -f
```

## API Router Worker

**Worker Name:** `api-router`  
**Route:** `api.hostamar.com/*` (configured in Cloudflare Dashboard)  
**Secrets:** `PRIMARY_URL`, `FALLBACK_URL`

### Behavior
- Proxies requests to `PRIMARY_URL` (default: `https://api-primary.hostamar.com`)
- 2-second timeout, circuit breaker after 2 failures (60s fallback)
- Fallback: `https://hostamar.alwaysdata.net` (lite API)

### Secrets Management
```bash
# Set PRIMARY_URL (auto-updated when tunnel hostname changes)
npx wrangler secret put PRIMARY_URL --name api-router
# Value: https://api-primary.hostamar.com

# Set FALLBACK_URL
npx wrangler secret put FALLBACK_URL --name api-router
# Value: https://hostamar.alwaysdata.net
```

## Verification

```bash
# Tunnel health (direct)
curl -s https://api-primary.hostamar.com/v1/models | jq '.data | length'
# Expected: 5 models

# Worker health (via api-router)
curl -s https://api.hostamar.com/health | jq '.status'
# Expected: "ok"

# Models via worker (blocked by Bot Fight Mode)
curl -s https://api.hostamar.com/v1/models
# Returns Cloudflare challenge page - needs WAF rule
```

## Bot Fight Mode Issue

**Problem:** `/v1/models` endpoint returns Cloudflare "Attention Required" challenge page.

**Cause:** Cloudflare Bot Fight Mode (free tier) challenges requests to `/v1/models` path before worker runs. The `/health` endpoint works because it's not targeted.

**Solution:** Create WAF Custom Rule in Cloudflare Dashboard:
- **Rule Name:** "Skip Bot Management for API"
- **Expression:** `http.host eq "api.hostamar.com"`
- **Action:** Skip → Bot Management
- **Requires:** Zone:WAF:Edit permission (not in current API token)

**Workaround:** Use `api-primary.hostamar.com` directly for API calls.

## Related Services

| Service | Port | Tunnel | Status |
|---------|------|--------|--------|
| nvidia-guard | 12436 | hostamar-api-primary | ✅ Active |
| api-router worker | - | Dashboard route | ✅ Deployed |
| AlwaysData fallback | - | - | ✅ Configured |

## Commands

```bash
# Start tunnel
cloudflared tunnel --config /home/romel/.cloudflared/hostamar-api-primary-config.yml run

# Deploy worker
cd /home/romel/hostamar.com && npx wrangler deploy workers/api-router.js --name api-router

# Check tunnel connections
cloudflared tunnel info hostamar-api-primary

# View worker logs
npx wrangler tail api-router --format=json
```