# RUNBOOK — Recovery Procedures

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** LIVE — All procedures verified

---

## 1. Restore Infisical (Secret Store on :8089)

```bash
# Order matters: redis → postgres → infisical
podman start redis-infisical
podman start postgres-infisical  # Infisical's DB — host port 15433 (NOT docker 5432)
podman start infisical

# Verify
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8089   # expect 200
```

### Critical Traps

- **Port ownership:** docker `hostamar-postgres` owns host 5432; Infisical MUST talk to `postgres-infisical:15433` (bridge, real data volume, 773 tables)
- **Encryption key mismatch:** If `ENCRYPTION_KEY`/`JWT_AUTH_SECRET` mismatch → you're on the wrong DB. Do NOT "fix" keys, fix the target DB (INCIDENTS.md #2)
- **Decoy DB:** `postgres-15432` (:15432) holds EMPTY infisical schema — a decoy, not the data
- **Persisted keys:** `ENCRYPTION_KEY`/`JWT_AUTH_SECRET` in `/home/romel/automation/infisical.env` as `INFISICAL_ENCRYPTION_KEY` / `INFISICAL_JWT_AUTH_SECRET` (env-only keys die with `podman rm`)

### Rebuild Command Shape

```bash
podman run --network hostamar-network -p 8089:8089 \
  -e PORT=8089 \
  -e DATABASE_URL=postgresql://postgres:***@host.containers.internal:15433/infisical \
  -e ENCRYPTION_KEY=*** \
  -e JWT_AUTH_SECRET=*** \
  infisical/infisical
```

### 2026-11-02 Restore Procedure (DB was EMPTY)

```bash
# 1. Allow signup (flip allowSignUp=true in Infisical)
# 2. Admin signup via UI
# 3. OTP brute: HMAC-SHA256(token, JWT_AUTH_SECRET), redis key email-signup-otp:<emailHash>:hash field tokenHash
# 4. v3 select-organization
# 5. POST /api/v3/secrets/raw/<KEY> x171
# 6. PATCH for duplicate keys
# 7. allowSignUp=false relock
```

---

## 2. Restore teldrive

```bash
cd ~/teldrive && docker compose up -d
docker ps --filter name=teldrive --format '{{.Names}} {{.Status}}'   # both Up, no restarts
```

### Crash-Loop Fix

- Verify compose networks (`teldrive-net`)
- DB host: `teldrive-db:5432` — never `host.docker.internal` from foreign network

---

## 3. VM Restart-Loop Recovery

1. **Confirm loop:** uptime resetting every 35s–6.7min (see INCIDENTS.md #1)
2. **Ensure traps:** dbus-monitor logind keepalive unit active + `systemctl poweroff` wrapper trap installed
3. **Let wrapper power off VM cleanly** — never yank VM process mid-loop
4. **Restart from Windows side** (Task Scheduler / manual)
5. **After boot:** verify keepalive unit active, run 4x200 probe + container checks (TESTING.md)

---

## 4. Restart Gateway (openclaw)

```bash
openclaw gateway stop --force
openclaw gateway install
systemctl --user start openclaw-gateway
systemctl --user status openclaw-gateway    # active (running)
```

- Gateway auth token in `~/.openclaw/openclaw.json` — reference only, never print

---

## 5. Guard Health (LLM Serving)

```bash
curl -s http://127.0.0.1:12436/v1/models | jq '.data | length'   # expect 6
```

- Models: z-ai/glm-5.3-flash, deepseek-v4.1-flash, minimax-m3.1-flash, step-5-preview, nemotron-3.5-bolt, nemotron-ultra
- On guard failure → kilo.ai fallback (384 models) serves — verify provider field

---

## 6. Cloudflare Tunnel (hostamar-primary)

```bash
# Kill existing
pkill -f "cloudflared tunnel run"

# Start with correct config
cloudflared tunnel --config /home/romel/.cloudflared/hostamar-primary-config.yml run &

# Verify 4 QUIC connections in logs
```

### Config: `/home/romel/.cloudflared/hostamar-primary-config.yml`

```yaml
tunnel: 2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f
credentials-file: /home/romel/.cloudflared/2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f.json
origincert: /home/romel/.cloudflared/cert.pem

ingress:
  - hostname: hostamar.com
    service: http://localhost:3000
  - hostname: www.hostamar.com
    service: http://localhost:3000
  - service: http_status:404
```

---

## 7. TV Agent Service

```bash
systemctl --user daemon-reload
systemctl --user restart tv-agent.service
systemctl --user status tv-agent.service   # active (running)
```

### Secret: `/home/romel/hostamar.com/.tv-agent-secret.local`

```
TV_AGENT_SECRET=686dc8917e2d30103bc67b1c931adedd239e5a69a6274d9b
```

---

## 8. Full Deploy + Verify (After ANY Recovery)

```bash
# 1. Build
cd /home/romel/hostamar.com
npm run worker:build

# 2. Deploy worker
CLOUDFLARE_API_TOKEN=$(python3 -c "
import re
with open('/home/romel/automation/infisical.env') as f: t=f.read()
m=re.search(r'CLOUDFLARE_API_TOKEN=([a-zA-Z0-9_]+)', t)
print(m.group(1) if m else '')
")
npx wrangler deploy -c wrangler-pages.toml

# 3. 13x Probe
for u in https://hostamar.com/ https://hostamar.com/pricing https://hostamar.com/api/v1/models https://hostamar.com/api/store/products https://hostamar.com/tv https://hostamar.com/tv/manifest.json https://hostamar.com/api/tv https://hostamar.com/api/tv/playlist https://hostamar.com/api/tv/stable-channels https://hostamar.com/api/tv/status https://hostamar.com/api/tv/heartbeat https://hostamar.com/admin https://hostamar.com/api/admin/stats; do echo -n "$u: "; curl -s -o /dev/null -w "%{http_code}\n" -m 10 $u; done

# 4. Verify all 200/307/401 — NO 500, NO 503
```

---

## 9. Git Mirror Sync

```bash
cd /home/romel/hostamar.com
git push forgejo main
git push gitlab main
# git push codeberg main  # QUOTA-BLOCKED — delete via web UI first
```

---

## After ANY Recovery

- Re-run full probe set (TESTING.md): 13x endpoints, models.json 152, /api/tv 362 + b2-cache-known + b2_only true, container fleet Up, guard 6
- Append incident + outcome to QUILL daily report and CHANGELOG.md
- If fix was new (not in INCIDENTS.md/RUNBOOK.md), write postmortem + procedure before closing shift
