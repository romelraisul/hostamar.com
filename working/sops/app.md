# app SOP

_Generated from docker-compose.vps.yml — do not edit by hand._

**Image:** hostamar-app:latest
**Ports:** 3000:3000
**Restart:** unless-stopped
**Required env:** DATABASE_URL, REDIS_URL, NEXTAUTH_URL, NEXTAUTH_SECRET

## Symptoms
- Healthcheck fails: `no healthcheck defined`
- Container not running: `docker ps --filter name=hostamar-app` shows no entry or unhealthy
- Logs pattern: `docker logs hostamar-app --tail 50 2>&1 | grep -iE "error|fail|exception|unhealthy"`

## Diagnosis
```bash
docker ps --filter name=hostamar-app
docker logs hostamar-app --tail 50 2>&1
```
- App liveness: `curl -fsS http://localhost:3000/api/health`



## Auto-fix (Tier1)
```bash
docker compose -f docker-compose.vps.yml restart app
```



## Escalation
If the auto-fix fails 3x within 10 minutes, Tier1 emits `support.escalate.tier2` →
Tier2 triage agent reviews this SOP + last 50 logs and proposes a fix (human approval
required if destructive or confidence < 0.7).
