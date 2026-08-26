# No-Card R2 Alternative — 4-Tier Storage Architecture

**Date:** 2026-08-26
**Why:** Cloudflare R2 requires a card on the account (err `10042` on any R2 API call). Zero-budget constraint means no card, ever. This document defines what replaced it.

## The tiers (read order = failover order)

| Tier | Store | Role | Cost | Works when computer OFF |
|---|---|---|---|---|
| 1 | **Cloudflare Workers KV** (`HOSTAMAR_CATALOG`, ns `7ce14c69f70d48449dd50edd4be3dca3`) | Primary edge cache, <1ms reads, 1GB free, **no card needed** | ৳0 | ✅ |
| 2 | **GitHub raw** (`raw.githubusercontent.com/romelraisul/hostamar.com/main/MODEL_CATALOG.json`) | Versioned source of truth; hourly self-heal commits keep it fresh | ৳0 | ✅ |
| 3 | **MinIO on your computer** (podman `hostamar-minio`, :9000 S3 / :9001 console → `s3.hostamar.com` via tunnel) | Bulk storage: usage logs, openwebui backups, video artifacts. Unlimited free disk | ৳0 | ❌ (by design — local tier) |
| 4 | **Neon Postgres** (`model_catalog` table, JSONB) | Last-resort catalog backup; already hosts SeoEvent/HostingRequest/etc. | ৳0 | ✅ |

## Worker behavior (ai-gateway-worker/src/index.js)

`GET /v1/models` resolves the catalog through tiers automatically:

```
KV HOSTAMAR_CATALOG.get("MODEL_CATALOG")        -> source:"kv"
  miss ↓
fetch raw.githubusercontent.com .../MODEL_CATALOG.json  -> source:"github" (+ write-back to KV, TTL 1h)
  fail ↓
embedded CATALOG snapshot baked at deploy time   -> source:"embedded"
```

Response includes `"source"` so you can always see which tier served.

Chat responses log usage to KV `HOSTAMAR_LOGS` under `logs/usage/<date>/<ts>-<rand>` via `ctx.waitUntil` (survives response return, never blocks chat).

## Keys in KV (namespace 7ce14c69…)

- `MODEL_CATALOG` — `{generatedAt, count, models:[...]}` (wrapped shape from gen-model-catalog.mjs)
- `ROUTE_MAP` — id → upstream routing entry
- `124_MODELS` — rendered docs page

Update them manually:

```bash
export CLOUDFLARE_API_TOKEN=<token>
NS=7ce14c69f70d48449dd50edd4be3dca3
npx wrangler kv key put MODEL_CATALOG --namespace-id=$NS --path=./MODEL_CATALOG.json --remote   # --remote is REQUIRED, else local-only
```

The GitHub Action `model-heal.yml` does this hourly after regen + pong tests.

## MinIO (Tier 3)

Runs via `podman run` (compose file has the service too, but podman-compose chokes on short-image names):

```bash
podman run -d --name hostamar-minio --network hostamar-net \
  -p 9000:9000 -p 9001:9001 -v minio-data:/data \
  -e "MINIO_ROOT_USER=hostamar" -e "MINIO_ROOT_PASSWORD=hostamar123" \
  --restart unless-stopped docker.io/minio/minio:latest server /data --console-address ":9001"
podman exec hostamar-minio mc alias set local http://localhost:9000 hostamar hostamar123
podman exec hostamar-minio mc mb local/hostamar-models
```

Exposed at `s3.hostamar.com` (CNAME → tunnel `5affa5bd…`, ingress added to `~/.cloudflared/config.yml`). After editing ingress: `systemctl --user restart hostamar-tunnel`.

Use for: `/logs/usage/*.json` dumps from KV, `/backups/openwebui.tar.gz`, anything bulk. NOT for catalog serving (tiers 1–2 handle that when computer is off).

## Neon (Tier 4)

```sql
CREATE TABLE model_catalog (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
-- seeded rows: 'MODEL_CATALOG' (120 models), 'ROUTE_MAP' (120 keys)
```

## Verification checklist (all pass 2026-08-26)

- [x] `GET worker /v1/models` → `{"source":"kv","data":[...120]}`
- [x] `GET worker /health` → `{"ok":true,"models":120,"catalogSource":"kv"}`
- [x] Chat PONG via edge → KV log key written under `logs/usage/2026-08-26/`
- [x] `raw.githubusercontent.com/romelraisul/hostamar.com/main/MODEL_CATALOG.json` → 200, 120 models
- [x] Neon `model_catalog` → 2 rows, JSONB valid
- [x] MinIO up, bucket `hostamar-models` created
- [x] `s3.hostamar.com` live → 200 (MinIO through tunnel)
- [x] Tunnel endpoints: openwebui 200, ide 302, uptime 302, s3 200
- [x] Unified gateway: ai.hostamar.com/v1/models → `{"count":120,"source":"kv"}` (identical to workers.dev)

## Tunnel endpoint recovery (rootlessport fix)

Symptom: openwebui/ide/uptime returned 502 while `podman ps` showed containers "Up". Cause: the rootless `rootlessport` forwarder processes had died (WSL2 + podman 4.x long-uptime failure), so no kernel listener existed on 3003/8443/3002 despite the containers running. Fix: `podman start <container>` re-spawns the forwarder; `podman restart` fails with "conmon exited prematurely" on these stale containers. Recovery verified: all four endpoints (openwebui 200, ide 302, uptime 302, s3 200) green.
