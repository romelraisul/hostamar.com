# Canary Quick Checklist — On-Call Reference

## Pre-Canary (T-24h)
- [ ] CI: `.\scripts\run-ci-locally.ps1` — all green
- [ ] Verify: `.\scripts\post-deploy-verify.ps1` — all pass on staging
- [ ] DB backup: `pg_dump -Fc hostamar > backup/hostamar-$(date +%F).dump`
- [ ] Secrets in 1Password: NEXTAUTH_SECRET, JWT_SECRET, ADMIN_PASSWORD
- [ ] Grafana alerts verified in staging
- [ ] On-call + SRE confirmed available
- [ ] Slack `#hostamar-alerts` monitored

---

## Step 0: Deploy Canary (0-10 min)
- [ ] `git tag canary-$(git rev-parse --short HEAD) && git push origin canary-*`
- [ ] `docker build -t hostamar:canary .`
- [ ] `docker compose -f docker-compose.yml up -d hostamar-canary`
- [ ] Verify: `curl -sI http://localhost:3001/health` → 200

---

## Step 1: 5% Traffic (10-30 min)
- [ ] Update nginx/Envoy weights (95/5)
- [ ] Verify: `newman run ... --folder "Access Control" --folder "Model API"`
- [ ] Verify: `psql -d hostamar -c "SELECT count(*) FROM admin_audit_logs WHERE created_at > NOW() - INTERVAL '30 min';"`
- [ ] Grafana: no P1 alerts, VRAM < 70%, error rate < 1%

### Rollback if
- [ ] VRAM >85% sustained | DMR down | Error rate >2% | Latency P95 >5s
- [ ] **Action:** revert proxy config → `docker compose stop hostamar-canary`

---

## Step 2: 25% Traffic (30-90 min)
- [ ] Update weights (75/25)
- [ ] Verify: `.\scripts\post-deploy-verify.ps1 -BaseUrl http://localhost:3001`
- [ ] Verify: `curl -s http://localhost:12434/engines/v1/models | jq '.data[].status'`
- [ ] Grafana: async queue < 50, circuit breakers closed

### Rollback if
- [ ] Same as Step 1 + circuit breaker opens + queue depth > 50

---

## Step 3: 100% Traffic (90-120 min)
- [ ] `docker compose stop hostamar` (old)
- [ ] `docker compose up -d hostamar` (canary → production)
- [ ] Remove canary containers: `docker compose rm -f hostamar-canary`
- [ ] Verify: `newman run tests/admin-test-plan.postman_collection.json ...`
- [ ] Verify: `curl -s http://localhost:3000/api/health`
- [ ] Verify: `curl -s http://localhost:3000/status | grep "Operational"`
- [ ] Slack: `#hostamar-alerts` — "Rollout complete"

---

## Post-Rollout (T+24h)
- [ ] SRE monitors Grafana — first 4h continuous, then periodic
- [ ] Full Postman suite against production
- [ ] All Grafana alerts green
- [ ] Run OOM incident drill
- [ ] Publish status page update
- [ ] Schedule postmortem if any issues

---

## Quick Rollback
```bash
# nginx
cp nginx/stable.conf /etc/nginx/nginx.conf && nginx -s reload

# Docker
docker compose stop hostamar-canary && docker compose rm -f hostamar-canary

# K8s (if using Istio)
kubectl patch vs hostamar -n prod --type=json -p='[{"op":"replace","path":"/spec/http/0/route","value":[{"destination":{"host":"hostamar-stable","port":{"number":3000}},"weight":100}]}]'
```
