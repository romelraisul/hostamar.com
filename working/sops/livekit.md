# livekit SOP

_Generated from docker-compose.vps.yml — do not edit by hand._

**Image:** livekit/livekit-server:v1.8.4
**Ports:** 7880:7880, 7881:7881, 7882-7887:7882-7887/udp, 7882-7887:7882-7887/tcp, 50000-50200:50000-50200/udp
**Restart:** unless-stopped
**Required env:** LIVEKIT_KEYS, LIVEKIT_NODE_IP, LIVEKIT_RTC_USE_EXTERNAL_IP, LIVEKIT_INTERNAL_URL

## Symptoms
- Healthcheck fails: `CMD wget -qO- http://localhost:7880/`
- Container not running: `docker ps --filter name=hostamar-livekit` shows no entry or unhealthy
- Logs pattern: `docker logs hostamar-livekit --tail 50 2>&1 | grep -iE "error|fail|exception|unhealthy"`

## Diagnosis
```bash
docker ps --filter name=hostamar-livekit
docker logs hostamar-livekit --tail 50 2>&1
```




## Auto-fix (Tier1)
```bash
docker compose -f docker-compose.vps.yml restart livekit
```



## Escalation
If the auto-fix fails 3x within 10 minutes, Tier1 emits `support.escalate.tier2` →
Tier2 triage agent reviews this SOP + last 50 logs and proposes a fix (human approval
required if destructive or confidence < 0.7).

> Voice stack runs in `docker-compose.prod.yml` on the self-hosted VPS.
> Tier1 auto-fix restarts `coturn livekit` via that compose file.
