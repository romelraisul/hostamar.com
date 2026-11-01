# SETUP — hostamar.com

## Context

Zero-cost setup for hostamar.com: WSL + Podman + ComfyUI (Windows RTX 5060) + Cloudflare Tunnel. No money, no card — free tiers only.

**P4 Status: CLOSED** — `/models.json` 404 fixed (was @libsql/isomorphic-ws esbuild bug).
**P5 Status: IN PROGRESS** — f005 CDN Worker (B2 version) deployed, routes pending Zone permission.

## Task

Document zero-cost local and production setup: WSL_GO_LIVE, PRODUCTION_PODMAN, portproxy, Task Scheduler Highest, Cloudflare Tunnel config.yml.

## Includes

### WSL_GO_LIVE (local dev)

```bash
# Strip /mnt/c from PATH so Linux node/npx wins
export PATH=$(echo "$PATH" | tr ':' '\n' | grep -v '/mnt/c' | tr '\n' ':')
export PATH="$PATH:/usr/bin:/bin"

# Start local infra
podman-compose -f docker-compose.podman.yml up -d

# Run migrations
npx prisma migrate dev

# Start dev
pnpm dev  # http://localhost:3000
```

### PRODUCTION_PODMAN (hosted stack)

```bash
# Local mirror stack (runs on always-on PC when available)
podman run -d --name postgres -e POSTGRES_PASSWORD=... postgres:15
podman run -d --name redis -p 6379:6379 redis:7-alpine
podman run -d --name miniflare -p 8787:8787 miniflare/wrangler
```

### Port Forwarding (WSL → Windows)

Windows `netsh` portproxy to expose WSL ports:

```powershell
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$(hostname -I | awk '{print $1}')
```

### Task Scheduler Highest (Windows auto-start)

Create scheduled task:
- Name: `hostamar-wsl-dev`
- Trigger: At logon
- Action: `wsl.exe -d Ubuntu -e bash -c "cd /home/romel/hostamar.com && pnpm dev"`
- Run with highest privileges
- Hidden: yes

### Cloudflare Tunnel config.yml (`/home/romel/.cloudflared/config.yml`)

```yaml
tunnel: hostamar-primary
credentials-file: /home/romel/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: api.hostamar.com
    service: http://localhost:20128
  - hostname: decisions.hostamar.com
    service: http://localhost:8083
  - hostname: embeddings.hostamar.com
    service: http://localhost:11434
  - service: http_status:404
```

### Tunnel Tokens (live)

- `hostamar-primary`: `2d67d851` (proxies local services to edge)
- Alwaysdata fallback for `api.hostamar.com` when tunnel down

### Backblaze B2 Setup (f005 CDN Worker)

**Current Working Config** (uses existing `hostamar-prod` bucket with current key):

```bash
# 1. Verify existing bucket access
source /home/romel/automation/infisical.env
b2 ls b2://hostamar-prod/

# 2. Infisical secrets (already configured)
# B2_APPLICATION_KEY_ID=005B2_KEY_ID_PLACEHOLDER0000000001
# B2_APPLICATION_KEY=K005En5I2K9MzTzLR3itLtU5DBgBZvc
# B2_BUCKET_NAME=hostamar-prod
# B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
# B2_REGION=us-east-005
# B2_PUBLIC_URL=https://f005.hostamar.com/file/hostamar-prod

# 3. Set Worker secrets
source /home/romel/automation/infisical.env
wrangler secret put B2_APPLICATION_KEY_ID -c workers/f005-cdn/wrangler.toml
wrangler secret put B2_APPLICATION_KEY -c workers/f005-cdn/wrangler.toml

# 4. Verify
wrangler secret list -c workers/f005-cdn/wrangler.toml
```

**Ideal Config** (when new key with bucket creation permissions available):

```bash
# 1. Create B2 bucket
b2 create-bucket hostamar-manifests allPrivate

# 2. Create application key with bucket access
b2 key create hostamar-f005-cdn listBuckets,listFiles,readFiles,writeFiles,deleteFiles --bucket hostamar-manifests

# 3. Store in Infisical
infisical secrets set B2_APPLICATION_KEY_ID=<key-id> --projectId=hostamar --env=prod
infisical secrets set B2_APPLICATION_KEY=<app-key> --projectId=hostamar --env=prod
infisical secrets set B2_BUCKET_NAME=hostamar-manifests --projectId=hostamar --env=prod
infisical secrets set B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com --projectId=hostamar --env=prod
infisical secrets set B2_REGION=us-east-005 --projectId=hostamar --env=prod
infisical secrets set B2_PUBLIC_URL=https://f005.hostamar.com/file/hostamar-manifests --projectId=hostamar --env=prod
```

### Infisical Setup

```bash
# Login
infisical login

# Export for local scripts
infisical export --env-file=.env.b2 --projectId=hostamar --env=prod

# Use in shell
source /home/romel/automation/infisical.env
node scripts/sync-manifest-to-b2.mjs
```

### P5 Deploy Verification

```bash
# 1. Build
npm run worker:build

# 2. Sync manifests to B2
source /home/romel/automation/infisical.env
node scripts/sync-manifest-to-b2.mjs
# Expected: "Uploaded models.json to B2 (hostamar-prod)", "tv.json: count=353, source=b2-live"

# 3. Deploy f005 worker
CLOUDFLARE_API_TOKEN=<workers-token> npx wrangler deploy -c workers/f005-cdn/wrangler.toml --cwd /home/romel/hostamar.com/workers/f005-cdn

# 4. Verify P5 acceptance
curl -s https://hostamar.com/api/tv | jq '.count, .source'  # expect live count, "b2-live"
curl -sI https://hostamar.com/models.json | grep -E "cf-ray|cache"

# 5. Cloudflare Purge
# Dashboard → Caching → Purge Everything + Custom Purge hostamar.com/models.json, hostamar.com/api/tv*
```

## Rules

- Never commit `.cloudflared/*.json` credentials.
- Tunnel restarts on reboot via Task Scheduler.
- Port 5432 DPI-blocked on Neon — use `@neondatabase/serverless` over 443.
- Free tiers only: Cloudflare free, Vercel hobby, Neon free, Turso free.
- **B2 not R2**: All manifests and video assets on Backblaze B2 (f005/us-east-005), NOT Cloudflare R2
- **Infisical secrets**: ALL secrets in `/home/romel/automation/infisical.env` — NEVER commit
- **4x200 Probe**: `/tv`, `/api/tv`, `/api/tv/live`, `/models.json` must all return 200 with `cf-ray`, no `x-vercel`

## Output

This document. Followed for every new dev machine setup.