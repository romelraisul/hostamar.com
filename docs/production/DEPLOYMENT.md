# DEPLOYMENT — OpenNext Cloudflare Workers, Tunnels, Git

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** LIVE — hostamar-pages worker deployed, 13/13 endpoints green

---

## Deploy Commands (Verified Working)

```bash
# 1. Build Next.js + OpenNext worker
cd /home/romel/hostamar.com
npm run worker:build
# → .open-next/worker.js created, 11 require("node:sqlite") patched

# 2. Deploy to Cloudflare Pages (worker)
CLOUDFLARE_API_TOKEN=$(python3 -c "
import re
with open('/home/romel/automation/infisical.env') as f: t=f.read()
m=re.search(r'CLOUDFLARE_API_TOKEN=([a-zA-Z0-9_]+)', t)
print(m.group(1) if m else '')
")
npx wrangler deploy -c wrangler-pages.toml
# → Version ID: 683f939a-a90f-4740-94e8-0c255e66e453
# → https://hostamar-pages.romelraisul.workers.dev

# 3. Verify 13x probe
for u in https://hostamar.com/ https://hostamar.com/pricing https://hostamar.com/api/v1/models https://hostamar.com/api/store/products https://hostamar.com/tv https://hostamar.com/tv/manifest.json https://hostamar.com/api/tv https://hostamar.com/api/tv/playlist https://hostamar.com/api/tv/stable-channels https://hostamar.com/api/tv/status https://hostamar.com/api/tv/heartbeat https://hostamar.com/admin https://hostamar.com/api/admin/stats; do echo -n "$u: "; curl -s -o /dev/null -w "%{http_code}\n" -m 10 $u; done
```

---

## wrangler-pages.toml (Critical Rules)

**Top-level keys ONLY** (no keys after `[[rules]]` or they parse as rule members):

```toml
name = "hostamar-pages"
main = ".open-next/worker.js"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]
workers_dev = true
account_id = "e00717304c1139751214b8cda5078a8d"

[cache]
enabled = true

# ROUTES DISABLED in TOML — custom domains attached via dashboard
routes = [
  # { pattern = "hostamar.com/*", zone_name = "hostamar.com" },
]

[[kv_namespaces]]
binding = "HOSTAMAR_CATALOG"
id = "7ce14c69f70d48449dd50edd4be3dca3"

[[rules]]
type = "CompiledWasm"
globs = ["**/*.wasm"]
fallthrough = true

[assets]
directory = ".open-next/assets"
binding = "ASSETS"
not_found_handling = "single-page-application"
html_handling = "none"

[build]
command = "npm run worker:build"
external = ["node:sqlite", "@libsql/isomorphic-ws"]

[vars]
B2_S3_ENDPOINT = "https://s3.us-east-005.backblazeb2.com"
B2_S3_REGION = "us-east-005"
B2_CACHE_BUCKET = "hostamar-prod"
HOSTAMAR_PC_MAX_AGE_S = "1200"
TURSO_DATABASE_URL = "libsql://hostamar-db-romelraisul.aws-us-east-1.turso.io"
TURSO_AUTH_TOKEN = "eyJhbG...LrCQ"
B2_BUCKET_NAME = "hostamar-videos"
B2_ENDPOINT = "https://f002.backblazeb2.com"
NEXTAUTH_URL = "https://hostamar.com"
NEXTAUTH_SECRET = "hostamar-docker-local-dev-secret-2026"
NEXT_PUBLIC_SITE_URL = "https://hostamar.com"
TV_HLS_URL = "https://tv.hostamar.com/hls/live/tv/index.m3u8"
TV_AGENT_SECRET = "686dc8917e2d30103bc67b1c931adedd239e5a69a6274d9b"
OPENROUTER_EMBED_FALLBACK = "nvidia/llama-nemotron-embed-vl-1b-v2:free"
EMBEDDINGS_URL = "https://embeddings.hostamar.com/v1/embeddings"
DECISIONS_URL = "https://decisions.hostamar.com"
DECISION_API_URL = "https://decisions.hostamar.com"

[observability.logs]
enabled = true
```

---

## open-next.config.ts

```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig();
```

---

## Build Scripts

```json
// package.json scripts
{
  "build": "next build",
  "worker:build": "opennextjs-cloudflare build",
  "typecheck": "tsc --noEmit"
}
```

**Patch script** (`scripts/patch_handler_sqlite.mjs`):
- Runs after `worker:build`
- Replaces 11 occurrences of `require("node:sqlite")` with `({})`
- Node:sqlite does not exist in workerd

---

## f005-cdn Worker Deploy

```bash
cd /home/romel/hostamar.com/workers/f005-cdn

# Build
npx esbuild src/index.ts --bundle --platform=node --format=esm --outfile=dist/index.mjs \
  --external:@libsql/isomorphic-ws --external:node:sqlite \
  --external:@aws-sdk/client-s3 --external:@aws-sdk/s3-request-presigner

# Set secrets (NOT in vars!)
CLOUDFLARE_API_TOKEN=... npx wrangler secret put B2_APPLICATION_KEY_ID
CLOUDFLARE_API_TOKEN=... npx wrangler secret put B2_APPLICATION_KEY

# Deploy
CLOUDFLARE_API_TOKEN=... npx wrangler deploy
```

**wrangler.toml (f005-cdn):**
```toml
name = "hostamar-f005-cdn"
main = "src/index.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

[build]
command = "npx esbuild src/index.ts --bundle --platform=node --format=esm --outfile=dist/index.mjs --external:@libsql/isomorphic-ws --external:node:sqlite"

[vars]
B2_BUCKET_NAME = "hostamar-prod"
B2_ENDPOINT = "https://s3.us-east-005.backblazeb2.com"
B2_PUBLIC_URL = "https://f005.hostamar.com/file/hostamar-prod"
B2_REGION = "us-east-005"
F005_CDN_URL = "https://hostamar.com"

[[routes]]
pattern = "hostamar.com/models.json"
zone_name = "hostamar.com"

[[routes]]
pattern = "hostamar.com/tv"
zone_name = "hostamar.com"

[[routes]]
pattern = "f005.hostamar.com/*"
zone_name = "hostamar.com"
```

**Note:** B2 secrets MUST be set via `wrangler secret put`, not in `[vars]`.

---

## Cloudflare Tunnel (hostamar-primary)

```bash
# Config: /home/romel/.cloudflared/hostamar-primary-config.yml
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

```bash
# Restart tunnel
pkill -f "cloudflared tunnel run"
cloudflared tunnel --config /home/romel/.cloudflared/hostamar-primary-config.yml run &
```

---

## DNS Configuration

- **AAAA 100::** — Cloudflare Pages managed, **NEVER DELETE**
- **Custom domains** attached via dashboard: hostamar.com + www.hostamar.com → hostamar-pages worker
- **Cert SAN:** hostamar.com, www.hostamar.com, *.www.hostamar.com (Google Trust WE1, valid 2027-01-17)
- **Vercel CNAMEs** deleted before worker attach

---

## Git Remotes & Mirrors

```bash
# Push to all mirrors
git push forgejo main   # LIVE: git.hostamar.com (SQLite, tunnel 5affa5bd)
git push gitlab main    # Mirror
# git push codeberg main # QUOTA-BLOCKED — delete repo via web UI first
```

**GitHub:** Suspended (appeal #4892433, reinstated Oct 30 by Noah Spencer) — push blocked, Vercel hostamar-build gated.

---

## Environment Variable Extraction (Python, Mask-Safe)

```python
import re
with open('/home/romel/automation/infisical.env') as f: txt = f.read()

# Extract token without shell leakage
cf_token = re.search(r'CLOUDFLARE_API_TOKEN=([a-zA-Z0-9_]+)', txt).group(1)
b2_id = re.search(r'B2_APPLICATION_KEY_ID=([^\n]+)', txt).group(1).strip().strip('"')
b2_key = re.search(r'B2_APPLICATION_KEY=([^\n]+)', txt).group(1).strip().strip('"')

# Use in subprocess with env var, never echo
import subprocess
subprocess.run(['wrangler', 'secret', 'put', 'B2_APPLICATION_KEY_ID'], 
               input=b2_id.encode(), env={**os.environ, 'CLOUDFLARE_API_TOKEN': cf_token})
```