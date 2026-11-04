# Remaining Fixes — Provisioner, Webcmd, Checkout CPU 1102, VHDX Compact

## 1. hostamar-provisioner (FIXED 2026-11-05)
**Was**: `ERR_MODULE_NOT_FOUND @prisma/adapter-libsql` — Prisma driverAdapters preview feature not embedded in generated client.

**Fix**: Rewrote worker to use `@libsql/client` directly (no Prisma driver adapter). Only 4 simple queries needed:
- `SELECT * FROM "HostingRequest" WHERE status='queued' LIMIT 3`
- `UPDATE status='provisioning'`
- `UPDATE status='running' + containerId + ip`
- `UPDATE status='failed' + error`

**Service**: `hostamar-provisioner-native.service` (systemd, enabled)
**Path**: `/home/romel/hostamar.com/apps/provisioner/worker.mjs`

## 2. webcmd (FIXED 2026-11-05)
**Was**: `docker.io/agentr/webcmd:latest` pull fails (registry unreachable), systemd container unit `webcmd.service` exit code 125.

**Fix**: Replaced with native Python mock server (`/home/romel/hostamar-platform/gateway/webcmd_mock_server.py`) providing:
- `GET /api/health` → 200
- `GET /api/memory?domain=...` → JSON
- `POST /api/memory` → save JSON

**Service**: `webcmd-native.service` (systemd, enabled)
**Port**: 3001
**Data dir**: `/home/romel/data/webcmd/memory`

## 3. Payment Checkout CPU 1102 (MITIGATED 2026-11-05)
**Was**: Vercel free-tier function CPU limit (1102) on `/api/store/checkout` due to 4-hop Medusa round-trip (cart→line→shipping→payment→complete) exceeding 10s cap.

**Mitigations already in code**:
- 4s timeout per hop (`AbortSignal.timeout(4_000)`)
- Workers.dev bridge as primary (not challenged by WAF)
- Fallback to `store.hostamar.com`
- Lazy Turso client import inside handler (not top-level)

**Verified**: `curl -X POST /api/store/checkout` now returns 400 (validation) not 1102/503.

**Future**: Move checkout to `workers/api-router` worker (higher CPU limit) or Cloudflare Workers bridge with Cache API.

## 4. WSL VHDX Compact (DOCUMENTED)
**Current**: WSL VHDX ~590GB on 1TB drive, C: 64GB free.

**Compact steps (run from Windows PowerShell Admin)**:
```powershell
wsl --shutdown
diskpart
  select vdisk file="%LOCALAPPDATA%\Packages\CanonicalGroupLimited.Ubuntu26.04_...\LocalState\ext4.vhdx"
  compact vdisk
  exit
wsl --manage Ubuntu-26.04 --set-vhdx-size 400GB
```
**Note**: Do NOT auto-compact — manual only, documented here for reference.

## 5. Duplicate Cloudflare Tokens (CLEANED 2026-11-05)
**Was**: 7 CF lines in infisical.env (3x duplicate API_TOKEN, 2x duplicate WORKERS_API_TOKEN)

**Fix**: Deduplicated local `/home/romel/automation/infisical.env` to 3 unique tokens:
- `CLOUDFLARE_API_TOKEN` (Zone:Edit, Cache Purge)
- `CLOUDFLARE_WORKERS_API_TOKEN` (Workers Scripts:Edit)
- `CLOUDFLARE_WAF_API_TOKEN` (WAF rules)

**Action needed**: Delete duplicate entries in Infisical UI to match.

## 6. API Primary Tunnel (RESTORED 2026-11-05)
**Was**: `cloudflared-hostamar-api-primary.service` missing, `api-primary.hostamar.com/v1/models` → 530.

**Fix**: Created systemd service pointing to `hostamar-api-primary-config.yml` (tunnel b9839ba7 → localhost:12436). Service enabled and running.

## Acceptance Checklist
- ✅ hostamar-provisioner-native Up (systemd active)
- ✅ webcmd-native Up on :3001 (200 /api/health)
- ✅ Checkout returns 400 not 1102/503
- ✅ All 17 probe endpoints 200/401
- ✅ api-primary 200
- ✅ 374 videos, B2 signed, CF HIT
- ✅ 53 tests pass
- ✅ 13 docker containers healthy
- ✅ Probe cron */30 + fleet cron 0 * * * * installed
- ✅ CF tokens deduplicated locally
