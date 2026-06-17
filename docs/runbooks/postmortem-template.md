# Incident Postmortem

**Date:** YYYY-MM-DD  
**Incident ID:** INC-###  
**Severity:** CRITICAL / WARNING / INFO  
**Duration:** HH:MM (detection → resolution)  
**Report Author:** @name  
**Review Date:** YYYY-MM-DD

---

## Summary

One-paragraph description of what happened and impact.

> Example: At 14:30 UTC on June 17, a synchronous request to qwen3.6:27B triggered GPU OOM on the RTX 5060 (8GB VRAM). The circuit breaker opened, and traffic fell back to smollm3:F16 within 30s. No data loss. 12 users experienced 3-5s latency spike.

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| 14:30:00 | User request hits `/api/admin/chat` with model `qwen3.6:27B` |
| 14:30:02 | GPU OOM — `nvidia-smi` shows VRAM at 100% |
| 14:30:03 | Circuit breaker opens for qwen3.6:27B |
| 14:30:04 | Fallback to smollm3:F16 succeeds |
| 14:30:05 | Grafana alert `VRAMCriticallyHigh` fires |
| 14:30:15 | On-call acknowledged |
| 14:31:00 | Large models unloaded via runbook |
| 14:31:30 | VRAM back to 45% |
| 14:32:00 | All traffic normal |

---

## Root Cause

**Primary:** qwen3.6:27B received a synchronous request despite `asyncOnly=true`. The flag was set but middleware did not enforce it for admin chat API.

**Contributing:** VRAM headroom alert was at 85% threshold; actual OOM occurred at 92%.

---

## Impact

| Metric | Value |
|--------|-------|
| Users affected | 12 |
| Error rate (5min window) | 8.3% |
| Latency P95 (5min window) | 5.2s (normal: 1.8s) |
| Downtime | 30s (partial — fallback activated) |
| Data loss | None |

---

## Detection

- **Triggered by:** Grafana alert `VRAMCriticallyHigh`
- **Time to detection:** 5s (threshold + evaluation window)
- **Time to acknowledgment:** 10s
- **Time to resolution:** 60s

---

## Response

**What went well:**
- Circuit breaker tripped instantly, preventing cascading failures
- Fallback to smollm3:F16 worked without manual intervention
- Grafana alert fired within evaluation window
- Runbook steps were clear and executable

**What went wrong:**
- `asyncOnly` flag not enforced at middleware level
- VRAM threshold (85%) too high — OOM occurs before alert actionable
- No automated unload on circuit breaker open

---

## Action Items

| # | Action | Owner | Due | Status |
|---|--------|-------|-----|--------|
| 1 | Enforce `asyncOnly` in middleware — reject sync requests to large models | @infra | T+2d | ☐ |
| 2 | Lower VRAM alert threshold from 85% to 70% | @infra | T+1d | ☐ |
| 3 | Add auto-unload trigger when circuit breaker opens for OOM | @infra | T+5d | ☐ |
| 4 | Document large model sync rejection in runbook | @ops | T+3d | ☐ |
| 5 | Test OOM drill monthly (add to on-call schedule) | @ops | T+7d | ☐ |

---

## Lessons Learned

- Circuit breakers are effective but need auto-remediation
- Alert thresholds should leave headroom for mitigation time
- Model safety flags must be enforced at middleware, not just UI

---

## Supporting Data

### Grafana Panel at Time of Incident
- VRAM Usage: [screenshot or link]
- Model Latency: [screenshot or link]
- Circuit Breaker State: [screenshot or link]

### Logs
```
[14:30:02] ERROR: GPU out of memory (VRAM 8188/8192 MB)
[14:30:02] WARN: Circuit breaker open for qwen3.6:27B
[14:30:03] INFO: Fallback to smollm3:F16
```

### Commands Run
```bash
# During incident
docker model rm qwen3.6:27B
docker model rm seed-oss:36B-UD-IQ1_M
docker model stop && docker model start
```

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Incident Commander | | | |
| Engineering Lead | | | |
| Ops Lead | | | |

---

*This postmortem follows the [Hostamar Incident Management Policy](docs/runbooks/incident-management.md).*
