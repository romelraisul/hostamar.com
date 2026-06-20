# Hostamar Production Runbook

**Repo:** `github.com/romelraisul/hostamar.com`  
**App:** `http://localhost:3000`  
**Workers:** BullMQ on Redis, CPU video generator in `hostamar-gpu-worker`  
**Supervisor:** systemd timer every 2 min (`hostamar-healthcheck`)  
**Retention:** 7 days, daily cleanup at 03:30  

---

## Quick health check

```bash
# App
curl -s http://localhost:3000/api/health | jq .
docker ps --filter name=hostamar-app --format "table {{.Names}}\t{{.Status}}"

# Worker
docker ps --filter name=gpu-worker --format "table {{.Names}}\t{{.Status}}"
docker logs --tail 5 hostamar-gpu-worker

# Supervisor
systemctl status hostamar-healthcheck.timer
journalctl -u hostamar-healthcheck.service -n 10 --no-pager

# DB
docker exec hostamar-postgres psql -U hostamar -d hostamar \
  -c "SELECT status, count(*) FROM \"Video\" GROUP BY status;"

# Disk
docker exec hostamar-app sh -c 'du -sh /app/videos'
df -h /
```

---

## Common operations

### Restart app
```bash
docker restart hostamar-app
# Wait 10s, verify:
curl -s http://localhost:3000/api/health
```

### Restart worker
```bash
docker restart hostamar-gpu-worker
# Verify worker HTTP server restarted (auto by healthcheck)
```

### Run E2E test
```bash
bash /home/romel/hostamar.com/scripts/test-e2e-video.sh
```

### View logs
```bash
# App
docker logs --tail 200 hostamar-app
docker logs --follow hostamar-app

# Worker
docker logs --tail 200 hostamar-gpu-worker
docker logs --follow hostamar-gpu-worker

# Supervisor
journalctl -u hostamar-healthcheck.service -f
```

### Manual video upload (debug)
```bash
# Upload from worker to app
docker exec hostamar-gpu-worker sh -c \
  'cat /tmp/hostamar-videos/video_xxx.mp4 | wget --method=POST --body-file=/dev/stdin -q -O- http://hostamar-app:8899/upload/video_xxx.mp4'

# Serve test
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/videos/video_xxx.mp4
```

---

## Pipeline: video generation flow

```
/generate page → POST /api/ai/videos/generate → BullMQ queue (Redis)
  → hostamar-gpu-worker picks up job
    → CPU generator (Pillow+FFmpeg, ~1.7s for 3s 720p)
    → Upload via POST to hostamar-app:8899/upload/<filename>
    → Callback via POST to hostamar-app:3000/api/worker/video-update
  → Frontend polls /api/videos/status/<id>
  → Video served at /videos/<hash>.mp4
```

### Provider priority
```
cpu → huggingface → replicate → fal → local
```
`cpu` is the primary provider. Cloud APIs are fallbacks if keys are added.

---

## Recovery procedures

### App container is down
```bash
# Auto-recovered by systemd supervisor within 2 min
# Manual:
docker start hostamar-app
```

### Worker is down
```bash
# Auto-recovered by systemd supervisor
# Manual:
docker start hostamar-gpu-worker
# Verify HTTP server on 8899 (auto-started by healthcheck)
```

### Video uploads fail
```bash
# Check worker HTTP server
docker exec hostamar-gpu-worker sh -c 'wget -q -O /dev/null http://127.0.0.1:8899/' && echo "OK" || echo "DOWN"
# If down, healthcheck auto-starts it.
# Check app video proxy:
docker exec hostamar-app sh -c 'wget -q -O /dev/null http://127.0.0.1:8899/' && echo "OK" || echo "DOWN"
```

### Callback 500s
```bash
# Check worker callback URL:
docker exec hostamar-gpu-worker sh -c 'grep "APP_CALLBACK_URL" /app/workers/video_worker_gpu.py | head -1'
# Ensure it points to http://hostamar-app:3000/api/worker/video-update
```

---

## Deployment

### Rebuild app container
```bash
cd /home/romel/hostamar.com
PG_IP=$(docker inspect hostamar-postgres --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
docker build --build-arg DATABASE_URL="postgresql://hostamar:***@${PG_IP}:5432/hostamar" -t hostamar-app:latest .
docker stop hostamar-app && docker rm hostamar-app
docker run -d --name hostamar-app \
  -p 3000:3000 --restart unless-stopped \
  --network flociops-assistant_hostamar-network \
  --env-file /home/romel/hostamar.com/.env.prod \
  hostamar-app:latest
```

### Apply migration
```bash
docker exec -i hostamar-postgres psql -U hostamar -d hostamar \
  < prisma/migrations/001_add_video_url_columns/migration.sql
```

### Run backfill
```bash
docker exec hostamar-app sh -c 'cd /app && npx tsx scripts/backfill-video-urls.ts'       # dry-run
docker exec hostamar-app sh -c 'cd /app && npx tsx scripts/backfill-video-urls.ts --apply'  # apply
```

---

## Rollback

### App
```bash
docker run -d --name hostamar-app -p 3000:3000 --restart unless-stopped \
  ghcr.io/romelraisul/hostamar-app:<previous-tag>
```

### Worker
```bash
docker restart hostamar-gpu-worker  # reverts to previous image if using tagged images
```

### DB
- Columns are nullable — no urgent drop needed after code rollback.
- Revert code first, then remove columns in a follow-up:
  ```sql
  ALTER TABLE "Video" DROP COLUMN "videoUrl", DROP COLUMN "thumbnailUrl";
  ```

### Supervisor
```bash
bash /home/romel/hostamar.com/scripts/install-systemd.sh --remove
# Cron fallback still runs every 2 min
```

---

## Security

### Secrets inventory

| Secret | Location | Rotation |
|--------|----------|----------|
| `DATABASE_URL` | `.env.prod`, Docker env | After password change |
| `WORKER_SHARED_SECRET` | `.env.prod`, Docker env | Every 90 days |
| `TAILSCALE_AUTH_KEY` | GitHub Actions secrets | After each deploy |
| `GHCR_PAT` | GitHub Actions secrets | After each deploy |

### Rotate Tailscale key
1. Open Tailscale admin → Keys → Generate auth key (reusable, ephemeral)
2. Update GitHub secret: `gh secret set PRODUCTION_TAILSCALE_KEY --body "<new-key>" --env Production`
3. Revoke old key in Tailscale admin after verifying new key works

### Rotate worker secret
```bash
NEW_SECRET=$(openssl rand -hex 32)
echo "WORKER_SHARED_SECRET=$NEW_SECRET" >> /home/romel/hostamar.com/.env.prod
docker restart hostamar-app
docker restart hostamar-gpu-worker
```

---

## Monitoring

### What to watch

| Signal | Check | Action |
|--------|-------|--------|
| Health 500 | `/api/health` | Restart app, check DB |
| Callback 500 | Worker logs | Check secret mismatch, DB schema |
| Upload fails | Worker logs | Check proxy (8899) on both containers |
| Disk >75% | `df -h` | Run cleanup, check retention |
| Crash loop | Slack alert | Rollback image, check config |

### Logs to tail after deploy
```bash
docker logs --follow hostamar-app 2>&1 | tee /var/log/hostamar/app-$(date +%Y%m%d).log
docker logs --follow hostamar-gpu-worker 2>&1 | tee /var/log/hostamar/worker-$(date +%Y%m%d).log
```

---

## Architecture diagram (text)

```
Internet ── 3000 ──► hostamar-app (Next.js standalone)
                       │
                       ├── /api/health ────────────────► PostgreSQL
                       ├── /api/ai/videos/generate ────► BullMQ (Redis)
                       ├── /api/worker/video-update ◄──┐
                       ├── /videos/[filename] ─────────► /app/videos/ (disk)
                       └── :8899 (video proxy) ────────► worker:8899

hostamar-gpu-worker (BullMQ consumer)
  ├── CPU generator (Pillow + FFmpeg)
  ├── Uploads to app:8899/upload/<file>
  └── HTTP server :8899 ──► /tmp/hostamar-videos/

systemd timer ── 2min ──► hostamar-healthcheck.sh
                              ├── Restart unhealthy containers
                              ├── Start worker HTTP server if down
                              └── Slack alert on crash loop
```

---

## Contacts

- **Repo owner:** Romel Raisul (`romelraisul@gmail.com`)
- **CI/CD:** GitHub Actions at `github.com/romelraisul/hostamar.com/actions`
- **Secrets:** GitHub Environments → Production
