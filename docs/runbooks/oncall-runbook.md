# On-Call Runbook: Model OOM & DMR Outages

## Quick Reference

```
CRITICAL:  < 5 min response  |  Pages: Slack + PagerDuty
WARNING:   < 15 min response |  Pages: Slack only
```

## Alert: VRAM > 85% (CRITICAL)

### Symptoms
- Grafana panel "VRAM Usage" shows red
- Users see "Model timed out" in chat
- Alert: `VRAMCriticallyHigh`

### Triage
```bash
# 1. Check GPU
nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv

# 2. Check loaded models
docker model ls

# 3. Check Ollama (if running)
docker exec ollama nvidia-smi 2>/dev/null || echo "Ollama not using GPU"
```

### Mitigation
```bash
# Unload non-essential models
docker model rm qwen3.6:27B 2>/dev/null
docker model rm seed-oss:36B-UD-IQ1_M 2>/dev/null

# Restart DMR to free memory
docker model stop && sleep 2 && docker model start

# Verify recovery
curl -s http://localhost:12434/engines/v1/models | jq '.data | length'

# Test chat
curl -s -X POST http://localhost:3000/api/admin/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"ping","model":"smollm3:F16"}' | jq .success
```

### Escalation
- If VRAM stays > 85% after unload → escalate to infra team
- If Ollama GPU failing → `docker restart ollama`
- If both fail → switch to cloud fallback (gpt-4o-mini)

---

## Alert: Docker Model Runner Down (CRITICAL)

### Symptoms
- Grafana panel "Docker Model Runner" shows 0
- All model requests return 500
- Alert: `DockerModelRunnerDown`

### Triage
```bash
# Check DMR service
docker model status

# Check Docker Desktop
docker info 2>&1 | grep -i "model runner"

# Check process
Get-Process -Name "com.docker.model" -ErrorAction SilentlyContinue
```

### Mitigation
```bash
# 1. Restart DMR
docker model stop
docker model start
sleep 5

# 2. Verify
curl -s http://localhost:12434/engines/v1/models

# 3. If still down — restart Docker Desktop
# Windows: Restart-Service docker
```

### Fallback Mode
While DMR is down:
- Chat API auto-fallsback to Ollama (hermes3)
- Users see degraded but functional service
- Large model queries return "Unavailable — please try later"

### Escalation
- DMR down > 5 min → page infra lead
- DMR down > 15 min → switch all traffic to cloud models
- Docker Desktop crash → check Windows Event Viewer: `Get-WinEvent -LogName Application | Where-Object { $_.Message -like "*docker*" }`

---

## Alert: High Failure Rate (WARNING)

### Symptoms
- Grafana shows failure rate spike
- Users report intermittent errors
- Alert: `ModelOOMRateHigh` or `AdminActionFailureSpike`

### Triage
```bash
# Check audit log for recent failures
psql -d hostamar -c "
  SELECT action, error_msg, created_at 
  FROM admin_audit_logs 
  WHERE success = false 
  AND created_at > NOW() - INTERVAL '15 minutes'
  ORDER BY created_at DESC;
"

# Check model errors
curl -s http://localhost:12434/engines/v1/models | jq '.data[] | select(.status != "ready")'
```

### Mitigation
- If OOMs → follow VRAM mitigation above
- If auth failures → check for brute force (multiple IPs)
- If API errors → restart DMR or check connectivity

---

## Alert: Circuit Breaker Open (WARNING)

### Symptoms
- Models showing "blocked" in admin UI
- Alert: `CircuitBreakerOpen`

### Triage
```bash
# Check which breakers are open
curl -s http://localhost:12434/engines/v1/models | jq '.data[] | {id: .id, status: .status}'
```

### Mitigation
```bash
# Reset from admin UI or:
# (Requires admin session token)
curl -s -X POST http://localhost:3000/api/admin/models/reset \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen3.6:27B"}'
```

---

## Escalation Matrix

| Severity | Response Time | Notify | Method |
|----------|--------------|--------|--------|
| CRITICAL (VRAM > 85%, DMR down) | < 5 min | On-call + Infra Lead | PagerDuty + Slack |
| WARNING (Breaker open, latency > 60s) | < 15 min | On-call | Slack |
| INFO (Queue depth > 50) | < 1 hour | Team | Slack digest |

## Post-Incident Checklist
- [ ] Document timeline in `docs/runbooks/incident-YYYY-MM-DD.md`
- [ ] Update runbook with new findings
- [ ] Adjust alert thresholds if needed
- [ ] Check if follow-up code change required
- [ ] Close incident in PagerDuty
