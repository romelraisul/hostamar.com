# Canary Rollout Plan

## Overview
- **Duration:** ~3 hours
- **Traffic split:** 5% → 25% → 100%
- **Rollback:** Immediate at any step
- **Owner:** SRE lead, On-call engineer, Product owner

---

## Pre-Canary Checklist (T-24h)
- [ ] All CI jobs green: `.\scripts\run-ci-locally.ps1`
- [ ] `post-deploy-verify` passed on staging
- [ ] DB snapshot taken: `pg_dump -Fc hostamar > backup/hostamar-$(date +%F).dump`
- [ ] Secrets rotated in 1Password + CI (NEXTAUTH_SECRET, JWT_SECRET, ADMIN_PASSWORD)
- [ ] Grafana alerting + PagerDuty verified in staging
- [ ] On-call engineer + SRE notified and available
- [ ] Status page draft ready at `public/status.html`
- [ ] Slack channel `#hostamar-alerts` monitored

---

## Step 0: Deploy Canary Build (0-10 min)

```bash
# 1. Tag and push canary build
git tag canary-$(git rev-parse --short HEAD)
git push origin canary-$(git rev-parse --short HEAD)

# 2. Build fresh image
docker build -t hostamar:canary .

# 3. Start canary container alongside production
docker compose -f docker-compose.yml up -d hostamar-canary

# 4. Verify
curl -sI http://localhost:3001/health   # Canary on port 3001
curl -sI http://localhost:3000/health   # Production on port 3000
```

### Verification
```bash
.\scripts\post-deploy-verify.ps1 -BaseUrl http://localhost:3001 -AdminPassword $ADMIN_PASSWORD
```

---

## Step 1: 5% Traffic (10-30 min)

**Action:** Route 5% to canary via reverse proxy.

### nginx (recommended)
```nginx
upstream hostamar {
    server localhost:3000 weight=95;   # production
    server localhost:3001 weight=5;    # canary
}
```

### Caddy
```caddyfile
@canary {
    header_random 0.05
}
reverse_proxy @canary localhost:3001
reverse_proxy localhost:3000
```

### Envoy
```yaml
clusters:
- name: hostamar
  endpoints:
  - lb_endpoints:
    - endpoint: { address: { socket_address: { address: localhost, port_value: 3000 } } }
      load_balancing_weight: 95
    - endpoint: { address: { socket_address: { address: localhost, port_value: 3001 } } }
      load_balancing_weight: 5
```

### Verification (20-30 min)
```bash
# Watch Grafana dashboard — no P1 alerts
# Run critical Postman subset:
newman run tests/admin-test-plan.postman_collection.json \
  --env-var "baseUrl=http://localhost" \
  --env-var "adminPassword=$ADMIN_PASSWORD" \
  --folder "Access Control" --folder "Model API" \
  --timeout-request 30000

# Confirm audit logs:
psql -d hostamar -c "SELECT action, created_at FROM admin_audit_logs WHERE created_at > NOW() - INTERVAL '30 minutes';"
```

### Rollback Criteria
- [ ] Any P1 alert (VRAM >85%, DMR down)
- [ ] Error rate > 2%
- [ ] Latency P95 > 5s
- [ ] Postman critical tests fail

### Rollback
```bash
# Revert nginx config, reload
cp nginx/prod.conf nginx/active.conf
nginx -s reload

# Remove canary
docker compose stop hostamar-canary
docker compose rm -f hostamar-canary
```

---

## Step 2: 25% Traffic (30-90 min)

**Action:** Increase canary weight to 25%.

### nginx
```nginx
upstream hostamar {
    server localhost:3000 weight=75;
    server localhost:3001 weight=25;
}
nginx -s reload
```

### Verification (30-60 min)
```bash
# Full verification
.\scripts\post-deploy-verify.ps1 -BaseUrl http://localhost:3001

# Check model health
curl -s http://localhost:12434/engines/v1/models | jq '.data[] | {id: .id, status: .status}'

# Check async queue
curl -s http://localhost:3000/api/health | jq '.queues'

# Grafana checks:
# - VRAM < 70%
# - No circuit breaker open
# - OOM rate = 0
```

### Rollback Criteria
Same as Step 1 +:
- [ ] Async queue depth > 50
- [ ] Circuit breaker opens

---

## Step 3: 100% Traffic (90-120 min)

**Action:** Promote canary to full production.

```bash
# 1. Promote canary to primary
docker compose stop hostamar          # stop old production
docker compose up -d hostamar-canary  # ensure canary running on :3000
# Or swap ports:
docker compose stop hostamar-canary
docker compose up -d hostamar         # new production (built from canary tag)

# 2. Remove canary proxy config
# Revert nginx to single upstream

# 3. Clean up old containers/images
docker system prune -f --filter "until=24h"
```

### Verification (30-60 min)
```bash
# Full Postman suite
newman run tests/admin-test-plan.postman_collection.json \
  --env-var "baseUrl=http://localhost" \
  --env-var "adminPassword=$ADMIN_PASSWORD" \
  --timeout-request 30000

# Check all endpoints
curl -sI http://localhost:3000/login       # 200
curl -sI http://localhost:3000/admin/chat   # 200 (with session)
curl -s http://localhost:12434/engines/v1/models  # connected

# Verify audit logging
psql -d hostamar -c "SELECT count(*) FROM admin_audit_logs WHERE created_at > NOW() - INTERVAL '1 hour';"

# Verify status page
curl -s http://localhost:3000/status | grep "Operational"
```

---

## Post-Rollout (T+24h)
- [ ] SRE monitors Grafana for first 4 hours
- [ ] Run full Postman suite against production
- [ ] Verify all Grafana alerts green
- [ ] Run incident drill (OOM) against production stack
- [ ] Update status page: "Rollout complete — all systems operational"
- [ ] Publish post-rollout summary to `#hostamar-alerts`
- [ ] Schedule postmortem if any issues occurred

---

## Communication Template

### Slack — Start of Canary
```
🚀 Canary rollout starting for hostamar.com
SHA: {sha}
Steps: 5% → 25% → 100% (~3h)
On-call: @name
Monitoring: #hostamar-alerts
Rollout plan: docs/runbooks/canary-rollout.md
```

### Slack — Step Promotion
```
✅ Step {N} complete — advancing to {N+1}
Duration: {time}
Checks: all passed
Grafana: link
```

### Slack — Rollback
```
🔴 Rollback triggered — Step {N}
Reason: {trigger}
Action: traffic reverted to stable
Postmortem: opening
```

---

## Infrastructure-Specific Commands

### Docker Compose (current setup)
```yaml
# docker-compose.yml — add canary service
services:
  hostamar:
    image: hostamar:latest
    ports: ["3000:3000"]

  hostamar-canary:
    image: hostamar:canary
    ports: ["3001:3000"]
    environment:
      - CANARY=true
```

### Port swapping for final promotion
```bash
# Swap canary → production
docker compose stop hostamar
docker compose up -d hostamar-canary --no-deps -p 3000:3000

# Or rebuild production with canary image
docker tag hostamar:canary hostamar:latest
docker compose up -d hostamar
```

### Health check endpoint
```typescript
// app/api/health/route.ts — add canary header
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev',
    canary: !!process.env.CANARY,
    timestamp: new Date().toISOString(),
  })
}
```
