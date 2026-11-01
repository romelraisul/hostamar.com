# DEBUGGING — hostamar.com

## Context

P4 root cause: `@libsql/hrana-client` transitively required `node:sqlite` (not available in Cloudflare workerd) and imported `@libsql/isomorphic-ws` at top level (not bundleable under OpenNext/esbuild). Fix: lazy WebSocket import + `node:sqlite` stub via `scripts/patch_handler_sqlite.mjs`.

**P4 Status: CLOSED** — `/models.json` 404 fixed (was @libsql/isomorphic-ws esbuild bug).
**P5 Status: IN PROGRESS** — f005 CDN Worker (B2 version) deployed, routes pending Zone permission.

## Task

Document P4 root cause, P5 f005 debugging, common errors, log locations, runbooks, and 4x200 probe curl commands.

## Includes

### P4 Root Cause (models.json 404 on Cloudflare)

**Symptom**: `https://hostamar.com/models.json` returned 404 instead of 200 (4491 bytes, v40, 152 models). No `cf-ray` initially, then `cf-ray` present but still 404 on some deploys.

**Root Cause Chain**:
1. `@libsql/hrana-client` → `@libsql/client` → `node:sqlite` (Node.js built-in)
2. OpenNext esbuild tried to resolve `node:sqlite` for workerd bundle → failed
3. `@libsql/hrana-client` top-level `export { WebSocket } from "@libsql/isomorphic-ws"` → esbuild tried to bundle `@libsql/isomorphic-ws` → failed
4. Worker build failed silently → old/deployed worker served 404 for `/models.json`

**Fix Applied** (two layers):

**Layer 1 — Lazy WebSocket** (pnpm store + nested copies):
- Files patched:
  - `node_modules/.pnpm/@libsql+hrana-client@0.7.0_.../lib-esm/index.js`
  - `node_modules/.pnpm/@libsql+hrana-client@0.4.4_.../lib-esm/index.js`
  - `node_modules/@libsql/client/node_modules/@libsql/hrana-client/lib-esm/index.js`
- Change: removed top-level `export { WebSocket } from "@libsql/isomorphic-ws"`, made `openWs()` lazy:
  ```js
  let WebSocket;
  try { WebSocket = (await import("@libsql/isomorphic-ws")).WebSocket } catch { throw new WebSocketUnsupportedError(...) }
  ```

**Layer 2 — `node:sqlite` stub** (build-time, automated):
- File: `.open-next/server-functions/default/handler.mjs`
- Script: `scripts/patch_handler_sqlite.mjs` replaces all `require("node:sqlite")` with `({})`
- Integrated into `package.json` `worker:build`: `... && node scripts/patch_handler_sqlite.mjs`
- Rationale: Prisma on Workers uses `@libsql/client/web` fetch-only path — `node:sqlite` is never actually called, just needs to resolve at bundle time

### P5 f005 CDN Worker Debugging

**Symptom**: `/api/tv` returns `{"count":353,"fallback":true,"source":"hardcoded-353"}` instead of live count.

**Root Cause Chain** (if f005 deployed but not working):
1. Worker secrets not set: `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`
2. B2 bucket inaccessible: key restricted to `hostamar-prod` only, cannot access `hostamar-manifests`
3. Routes not configured: Cloudflare Worker routes require Zone permission
4. Sync script failed: libsql DB query failed, `tv.json` not uploaded to B2

**Fix Applied**:
- Worker: `workers/f005-cdn/src/index.ts` uses B2 S3-compatible API with SigV4 signing
- Wrangler: `workers/f005-cdn/wrangler.toml` B2 vars, no R2 binding, routes for `hostamar.com/models.json`, `hostamar.com/api/tv*`
- Sync: `scripts/sync-manifest-to-b2.mjs` uses `@aws-sdk/client-s3` with B2 endpoint, queries libsql for live count
- Next.js: `app/api/tv/route.ts` fetches from f005, falls back to local manifest, **never returns hardcoded 353**

### Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Could not resolve "@libsql/isomorphic-ws"` | hrana-client top-level import | Lazy-WebSocket patch (Layer 1) |
| `Could not resolve "node:sqlite"` | Node built-in in workerd | Stub via `patch_handler_sqlite.mjs` (Layer 2) |
| `404 /models.json` | Worker build failed, old worker serving | Re-run `pnpm worker:build` + `wrangler deploy` |
| `x-vercel` present | Served from Vercel, not Cloudflare | Check DNS → Cloudflare proxy, not Vercel alias |
| No `cf-ray` | Not hitting Cloudflare edge | Check DNS records, AAAA `100::` intact |
| `Insufficient balance` | NVIDIA guard 429 | Zhipu fallback, rotate keys via `~/.hermes/nvidia-guard` |
| Neon password auth failed | Free-tier suspended | Check Neon dashboard, reconnect over 443 |
| Port 5432 blocked | DPI blocking | `@neondatabase/serverless` over HTTPS 443 |
| `/api/tv` returns hardcoded-353 | f005 worker not deployed or routes not active | Deploy worker, configure routes, sync B2 |
| `wrangler deploy` fails | Missing `esbuild` or Zone permission | Install esbuild, verify token has Zone route perm |
| B2 sync fails | Libsql auth token parsing | Check `HOSTAMAR_DATABASE_URL` format (quoted authToken) |

### Log Locations

| Log | Location | How to read |
|-----|----------|-------------|
| Wrangler deploy | terminal output | `npx wrangler deploy -c wrangler-pages.toml` |
| Worker runtime | Cloudflare dashboard → Workers → Logs | Real-time tail |
| Build output | `.open-next/worker.js` | Inspect after `npm run worker:build` |
| Prisma queries | `DATABASE_LOG=1` env var | Console output during dev |
| bKash webhooks | `WebhookEvent` table | Prisma studio or direct query |
| CI logs | `.github/workflows/` runs | GitHub Actions tab |

### Runbooks

**P4 Re-verify (after any deploy)**:
```bash
# 1. Build
pnpm worker:build

# 2. Deploy
source /home/romel/automation/infisical.env
npx wrangler deploy -c wrangler-pages.toml

# 3. Probe (all must be 200)
curl -sI https://hostamar.com/models.json | grep -E "HTTP/2|cf-ray|x-vercel"
curl -s https://hostamar.com/models.json | wc -c    # expect 4491
curl -s -o /dev/null -w "%{http_code}" https://hostamar.com/tv
curl -s -o /dev/null -w "%{http_code}" https://hostamar.com/api/tv
curl -s -o /dev/null -w "%{http_code}" https://hostamar.com/api/tv/live
```

**P5 Re-verify (after f005 deploy)**:
```bash
# 1. Build & Sync
npm run worker:build
source /home/romel/automation/infisical.env
node scripts/sync-manifest-to-b2.mjs
# Expect: "Uploaded models.json to B2 (hostamar-prod)", "tv.json: count=353, source=b2-live"

# 2. Deploy f005 worker
CLOUDFLARE_API_TOKEN=<workers-token> npx wrangler deploy -c workers/f005-cdn/wrangler.toml --cwd /home/romel/hostamar.com/workers/f005-cdn

# 3. Cloudflare Purge
# Dashboard → Caching → Purge Everything + Custom Purge hostamar.com/models.json, hostamar.com/api/tv*

# 4. Probe (all must be 200)
curl -s https://hostamar.com/api/tv | jq '.count, .source'  # expect live count > 353, "b2-live"
curl -sI https://hostamar.com/models.json | grep -E "cf-ray|cache"
curl -s https://hostamar.com/api/tv/live | head -10  # HLS manifest
curl -s -o /dev/null -w "%{http_code}" https://hostamar.com/tv
```

**Rollback**:
```bash
git revert <bad-commit>
git push origin main
# Cloudflare Pages auto-deploys from main
```

**Worker Logs Tail**:
```bash
wrangler tail --format pretty
```

### 4x200 Probe Reference (P4)
```
/tv              → 200 (TV page)
/api/tv          → 200 (count=353 fallback until P5 f005 CDN)
/api/tv/live     → 200 (HLS stream)
/models.json     → 200 (4491 bytes, cf-ray present, no x-vercel)
```

### P5 Probe Reference
```
/api/tv          → 200, count > 353, source: "b2-live"
/models.json     → 200, 4491 bytes, cf-ray present, cache HIT
/api/tv/live     → 200, HLS manifest segments
/tv              → 200, TV page renders with live count
```

## Output

This document. Run the P4/P5 re-verify runbook after every deploy.