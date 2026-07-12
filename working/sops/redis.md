# redis SOP

_Generated from docker-compose.vps.yml — do not edit by hand._

**Image:** redis:7-alpine
**Ports:** n/a
**Restart:** unless-stopped
**Required env:** n/a

## Symptoms
- Healthcheck fails: `CMD redis-cli ping`
- Container not running: `docker ps --filter name=hostamar-redis` shows no entry or unhealthy
- Logs pattern: `docker logs hostamar-redis --tail 50 2>&1 | grep -iE "error|fail|exception|unhealthy"`

## Diagnosis
```bash
docker ps --filter name=hostamar-redis
docker logs hostamar-redis --tail 50 2>&1
```


- Redis ping: `docker exec ${logName} redis-cli ping`

## Auto-fix (Tier1)
```bash
docker compose -f docker-compose.vps.yml restart redis
```
- If rate-limit store saturated: `docker exec ${logName} redis-cli FLUSHDB` (only if safe)


## Escalation
If the auto-fix fails 3x within 10 minutes, Tier1 emits `support.escalate.tier2` →
Tier2 triage agent reviews this SOP + last 50 logs and proposes a fix (human approval
required if destructive or confidence < 0.7).
