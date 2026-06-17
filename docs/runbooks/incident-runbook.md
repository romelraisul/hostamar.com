# Incident Runbook: Model OOM & Billing Failures

## 1. Model OOM (Out of Memory)

### Detection
- **Grafana alert**: VRAM > 80% or `model_oom_errors_total` spikes
- **User symptom**: Chat returns "Model timed out — switched to small model"
- **Logs**: `nvidia-smi` shows GPU OOM, DMR API returns 500

### Triage (0-2 min)
```bash
# Check GPU state
nvidia-smi

# Check DMR model status
docker model status

# Check recent errors
docker logs --tail 50 <dmr-container>
```

### Immediate Mitigation
```bash
# 1. Unload large models consuming VRAM
docker model rm qwen3.6:27B
docker model rm seed-oss:36B-UD-IQ1_M

# 2. Restart DMR to free GPU memory
docker model stop
docker model start

# 3. Verify only light models loaded
docker model ls
# Expected: smollm3:F16 (loaded), stable-diffusion:latest (idle)
```

### Root Cause Resolution
- **If VRAM leaked**: Restart Ollama too: `docker restart ollama`
- **If large model loaded sync**: Verify `asyncOnly=true` in `/admin/models`
- **If circuit breaker tripped**: Reset from admin UI or:
  ```bash
  curl -X POST http://localhost:3000/api/admin/models/reset \
    -H "Content-Type: application/json" \
    -d '{"model": "qwen3.6:27B"}'
  ```

### Post-Incident
- Reduce `asyncOnly=false` models count
- Add VRAM headroom alert at 70% (not 80%)
- Update `MODEL_COMPATIBILITY.md` if new model added

---

## 2. Failed Billing Operation (Refund/Cancel)

### Detection
- **Grafana alert**: `admin_actions_total{action="subscription_cancel", success="false"}`
- **User report**: "My card was charged but subscription didn't update"
- **Logs**: `admin_audit_logs` with `success=false` for billing action

### Triage (0-3 min)
```bash
# 1. Check audit log
psql -d hostamar -c "
  SELECT * FROM admin_audit_logs 
  WHERE action LIKE '%subscription%' OR action LIKE '%refund%'
  AND created_at > NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC LIMIT 5;
"

# 2. Check payment webhook status
curl -s http://localhost:3000/api/health | jq .services
```

### Immediate Mitigation
```bash
# 1. Verify transaction in payment processor dashboard
# 2. If payment succeeded but DB not updated:
psql -d hostamar -c "
  UPDATE subscriptions SET status = 'active' 
  WHERE customer_id = '<customer-id>' AND status = 'pending';
"
# 3. Notify customer of resolution
```

### Billing Re-Auth Enforcement
- Require re-authentication for any cancellation:
  ```javascript
  // In /admin/subscriptions page
  const reAuth = await fetch('/api/auth/session', { 
    headers: { 'x-auth-age': 'true' }
  })
  if (reAuth.status === 401) {
    // Show password prompt modal
  }
  ```

### Post-Incident
- Verify webhook secret rotation
- Check Stripe/processor webhook delivery logs
- Add alert on `admin_audit_logs` billing failures

---

## 3. Login Brute Force

### Detection
- **Grafana alert**: `admin_login_failures_total` rate > 5/min
- **Middleware**: IP blocked for 15 min after 5 failed attempts
- **Logs**: `admin_audit_logs` with `action='login_failed'`

### Immediate Mitigation
```bash
# Check blocked IPs
# (Middleware stores in memory — reset on restart)
# For persistent block, add to nginx:
echo "deny <offending-ip>;" >> /etc/nginx/conf.d/blocked.conf
nginx -s reload
```

### Recovery
- Blocked IPs auto-unblock after 15 min
- Monitor for repeat offenders — add to permanent blocklist

---

## 4. Docker Model Runner Down

### Detection
- **Chat fails**: "DMR API error" across all models
- **Fallback**: Ollama (hermes3) still works
- **Alert**: `dmr_health_status == 0`

### Immediate Mitigation
```bash
# Check DMR
docker model status
docker model logs --tail 20

# Restart if needed
docker model stop
docker model start

# Verify recovery
curl http://localhost:12434/engines/v1/models
```

### If DMR stays down
- API falls back to Ollama automatically
- Users see degraded but functional service (hermes3 only)

---

## Runbook Quick Reference Card

```
┌──────────────────────────────────────────────────────────────┐
│                    INCIDENT QUICK REFERENCE                  │
├──────────────────────────────────────────────────────────────┤
│ OOM: nvidia-smi → docker model rm <model> → docker model     │
│      stop/start                                              │
│ BILLING: Check audit_log → Verify payment processor → Update │
│          DB if needed → Notify customer                      │
│ BRUTE FORCE: Check blocked IPs → Add to nginx deny → Alert  │
│ DMR DOWN: docker model status/logs → restart → verify        │
│ ALL FALLBACK: Verify Ollama at localhost:11434/api/tags      │
└──────────────────────────────────────────────────────────────┘
```
