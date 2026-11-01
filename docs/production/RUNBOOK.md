# RUNBOOK — recovery procedures: Infisical, teldrive, VM loop, gateway, guard health.

## Restore Infisical (secret store on :8089)

```bash
podman start redis-infisical
podman start postgres-infisical  # Infisical's DB — host port 15433 (NOT docker 5432)
podman start infisical
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8089   # expect 200
```

- Order matters: redis → postgres → infisical.
- If health fails, check the port-ownership trap first: docker hostamar-postgres owns
  host 5432; Infisical must talk to postgres-infisical:15433 (bridge, real data volume,
  773 tables). An encryption-key-label mismatch means you're on the wrong DB — do not
  "fix" keys, fix the target DB (INCIDENTS.md #2). postgres-15432 (:15432) holds an
  EMPTY infisical schema — a decoy, not the data.
- ENCRYPTION_KEY/JWT_AUTH_SECRET are persisted in /home/romel/automation/infisical.env
  as INFISICAL_ENCRYPTION_KEY / INFISICAL_JWT_AUTH_SECRET (learned the hard way:
  env-only keys die with `podman rm`). Rebuild command shape: podman run --network
  hostamar-network -p 8089:8089 -e PORT=8089, DB URI postgres://postgres:<pw>@
  host.containers.internal:15433/infisical.
- Secrets mirror stays at /home/romel/automation/infisical.env (chmod 600) — during the
  2026-11-02 restore the DB was EMPTY (users=0), so the mirror WAS the source of truth:
  admin signup (allowSignUp flip) + OTP brute (HMAC-SHA256(token, JWT_AUTH_SECRET),
  redis key email-signup-otp:<emailHash>:hash field tokenHash) + v3 select-organization
  + POST /api/v3/secrets/raw/<KEY> x171 + PATCH for dup keys + allowSignUp=false relock.

## Restore teldrive

```bash
cd ~/teldrive && docker compose up -d
docker ps --filter name=teldrive --format '{{.Names}} {{.Status}}'   # both Up, no restarts
```

- If it crash-loops: verify compose networks (teldrive-net) and DB host
  (teldrive-db:5432 — never host.docker.internal from a foreign network).

## VM restart-loop recovery

1. Confirm the loop (uptime resetting every 35s–6.7min) — see INCIDENTS.md #1.
2. Ensure the traps are in place: dbus-monitor logind keepalive unit active +
   `systemctl poweroff` wrapper trap installed.
3. Let the wrapper power the VM off cleanly, then **restart from the Windows side** —
   never yank the VM process mid-loop.
4. After boot: verify the keepalive unit is active again, then run the 4x200 probe and
   the container checks (TESTING.md) before calling it recovered.

## Restart the gateway (openclaw)

```bash
openclaw gateway stop --force
openclaw gateway install
systemctl --user start openclaw-gateway
systemctl --user status openclaw-gateway    # active (running)
```

- Gateway auth token lives in `~/.openclaw/openclaw.json` — reference it, never print it.

## Guard health (LLM serving)

```bash
curl -s http://127.0.0.1:12436/v1/models | jq '.data | length'   # expect 6
```

- Expect exactly 6 models. If the guard is down, the kilo.ai fallback (384 models) serves
  — verify which provider actually answered before trusting outputs.

## After ANY recovery

- Re-run the full probe set (TESTING.md): 4x200 endpoints, models.json 152, /api/tv
  362 + b2-cache + b2_only true, container fleet Up, guard 6.
- Append the incident + outcome to QUILL daily report and CHANGELOG.md.
- If the fix was new (not in INCIDENTS.md/RUNBOOK.md), write the postmortem + procedure
  before closing the shift.
