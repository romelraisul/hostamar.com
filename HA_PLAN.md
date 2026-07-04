# Hostamar HA Architecture — Run from WSL, Failover to Cloud

## Goal
- **Computer up**: Local traffic can use `local.hostamar.com` via Cloudflare Tunnel
- **Computer down / network lost**: `hostamar.com` stays live on zero-cost cloud
- **CDN**: Cloudflare + Vercel static caching for assets

---

## Permanent Architecture (Jul 2026)

### Public endpoints
- `hostamar.com` → Vercel (`hostamar-slim.vercel.app`) **permanent**
- Railway backend → `web-production-1234d.up.railway.app` **independent**
- Vercel backend/API routes → active and healthy
- Neon / cloud Postgres → connected from cloud deployments

### Local-only endpoint
- `local.hostamar.com` → Cloudflare Tunnel when local is healthy
- `local.hostamar.com` → Vercel fallback when local is down

### Important rule
- `hostamar.com` is permanent in Cloudflare and must not depend on one local machine.
- The failover script manages only `local.hostamar.com`.

---

## Architecture: Two-Part Design

```
Internet
    │
    ▼
Cloudflare (DNS + Proxy + WAF)
    │
    ├─► hostamar.com ──► Vercel / Neon / Railway  [permanent public endpoint]
    │
    └─► local.hostamar.com ──► Cloudflare Tunnel ──► WSL/nginx:3000 ──► hostamar-app
                               │
                               ├─ nginx caching / routing
                               └─ Docker services: app, model, redis, postgres, cloudflared
```

### Layer 1 — Public production (zero-cost, machine-independent)
- `hostamar.com` permanently points to Vercel/Railway/Neon.
- No local-machine dependency for public availability.
- This is the stable target for all customer-facing links and integrations.

### Layer 2 — Local development (optional convenience)
- `local.hostamar.com` points to Cloudflare Tunnel when local is healthy.
- When local is down/unreachable, `local.hostamar.com` fails over to Vercel.
- The failover script manages only `local.hostamar.com`.

---

## Failover behavior

### What happens when computer goes down
- `hostamar.com` remains live on Vercel/Railway/Neon automatically.
- `local.hostamar.com` is not required for public availability.
- No manual intervention is required.

### What happens when local goes offline
- The failover cron detects local nginx/tunnel health loss.
- It updates `local.hostamar.com` to Vercel fallback.
- Public `hostamar.com` is unchanged.

### Recovery
- When local stack is healthy again, the failover cron switches `local.hostamar.com` back to tunnel.
- Public `hostamar.com` remains unchanged throughout recovery.

---

## Configuration targets

### Cloudflare DNS
- `hostamar.com` → permanent Vercel CNAME/target
- `local.hostamar.com` → managed by failover script

### Vercel
- Canonical failover target for both public and local-only flows
- Free tier sufficient for failover volume

### Railway
- Independent backend/API endpoint
- Uses Railway Postgres public proxy for database connectivity
- No dependency on local machine

### Neon
- Cloud Postgres failover for Vercel and Railway
- Free tier sufficient for failover volume

---

## Future development rules (do not break)
1. Do not route public production traffic through tunnel DNS.
2. Do not change `hostamar.com` DNS from scripts running on one local machine.
3. Keep failover logic local-only: `local.hostamar.com` only.
4. Keep cloud endpoints independent and on free tiers.
5. Document domain changes here before executing them.
