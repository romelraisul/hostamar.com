# nginx SOP

_Generated from docker-compose.vps.yml — do not edit by hand._

**Image:** nginx:alpine
**Ports:** 80:80, 443:443
**Restart:** unless-stopped
**Required env:** n/a

## Symptoms
- Healthcheck fails: `no healthcheck defined`
- Container not running: `docker ps --filter name=hostamar-nginx` shows no entry or unhealthy
- Logs pattern: `docker logs hostamar-nginx --tail 50 2>&1 | grep -iE "error|fail|exception|unhealthy"`

## Diagnosis
```bash
docker ps --filter name=hostamar-nginx
docker logs hostamar-nginx --tail 50 2>&1
```




## Auto-fix (Tier1)
```bash
docker compose -f docker-compose.vps.yml restart nginx
```



## Escalation
If the auto-fix fails 3x within 10 minutes, Tier1 emits `support.escalate.tier2` →
Tier2 triage agent reviews this SOP + last 50 logs and proposes a fix (human approval
required if destructive or confidence < 0.7).
