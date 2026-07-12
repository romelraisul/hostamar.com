# postgres SOP

_Generated from docker-compose.vps.yml — do not edit by hand._

**Image:** postgres:16-alpine
**Ports:** n/a
**Restart:** unless-stopped
**Required env:** POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD

## Symptoms
- Healthcheck fails: `CMD-SHELL pg_isready -U hostamar -d hostamar`
- Container not running: `docker ps --filter name=hostamar-postgres` shows no entry or unhealthy
- Logs pattern: `docker logs hostamar-postgres --tail 50 2>&1 | grep -iE "error|fail|exception|unhealthy"`

## Diagnosis
```bash
docker ps --filter name=hostamar-postgres
docker logs hostamar-postgres --tail 50 2>&1
```

- DB ping: `docker exec ${logName} pg_isready -U hostamar -d hostamar`


## Auto-fix (Tier1)
```bash
docker compose -f docker-compose.vps.yml restart postgres
```

- If connection pool exhausted: `docker compose -f docker-compose.vps.yml restart postgres` then check `prisma.$executeRaw` reconnect

## Escalation
If the auto-fix fails 3x within 10 minutes, Tier1 emits `support.escalate.tier2` →
Tier2 triage agent reviews this SOP + last 50 logs and proposes a fix (human approval
required if destructive or confidence < 0.7).
