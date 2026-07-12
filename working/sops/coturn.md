# coturn SOP

_Generated from docker-compose.vps.yml — do not edit by hand._

**Image:** coturn/coturn:4.6.2
**Ports:** n/a
**Restart:** unless-stopped
**Required env:** TURN_STATIC_AUTH_SECRET, PUBLIC_IP, TURN_DOMAIN

## Symptoms
- Healthcheck fails: `CMD-SHELL turnutils_uclient -p 3478 -W ${TURN_STATIC_AUTH_SECRET} -u healthcheck -v 127.0.0.1 2>&1 | grep -q 'success' || exit 1`
- Container not running: `docker ps --filter name=hostamar-coturn` shows no entry or unhealthy
- Logs pattern: `docker logs hostamar-coturn --tail 50 2>&1 | grep -iE "error|fail|exception|unhealthy"`

## Diagnosis
```bash
docker ps --filter name=hostamar-coturn
docker logs hostamar-coturn --tail 50 2>&1
```




## Auto-fix (Tier1)
```bash
docker compose -f docker-compose.vps.yml restart coturn
```



## Escalation
If the auto-fix fails 3x within 10 minutes, Tier1 emits `support.escalate.tier2` →
Tier2 triage agent reviews this SOP + last 50 logs and proposes a fix (human approval
required if destructive or confidence < 0.7).

> Voice stack runs in `docker-compose.prod.yml` on the self-hosted VPS.
> Tier1 auto-fix restarts `coturn livekit` via that compose file.
