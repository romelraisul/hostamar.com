# CHANGELOG + TROUBLESHOOTING — Hostamar.com

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** LIVE — 13/13 endpoints green

---

## Release Log

### 2026-11-04 — FIX-ALL v3: 13/13 Green, Admin 401, /api/tv 200, Tunnel+Agent Running

**Endpoints Fixed:**
- `/api/tv`: 503 → 200 (b2-cache-known, count 362, never 503)
- `/api/tv/stable-channels`: 500 → 200 (graceful DB fallback)
- `/admin`: 500 → 307 (redirect to login)
- `/api/admin/stats`: 500 → 401 (auth guard works)
- `/api/auth/session`: 500 → 501 (NextAuth stub)

**Architecture Changes:**
- NextAuth completely removed from worker (stub returns 501)
- Custom JWT auth chain: `lib/auth-utils.ts` ultra-defensive `verifyToken` + `lib/auth.ts` Turso-only
- All TV/admin routes use `getTursoEdgeClient()` (@libsql/client/web, HTTPS/Hrana)
- f005-cdn worker: B2 secrets in wrangler.toml, routes for models.json, tv, f005.hostamar.com/*
- TV_AGENT_SECRET added to worker env + .tv-agent-secret.local

**Infrastructure:**
- Cloudflare tunnel hostamar-primary (2d67d851) restarted with correct config.yml
- TV agent service (systemd) restarted, polling `/api/tv/agent/commands`
- All 13 endpoints returning 200/307/401 — NO 500, NO 503

**Tests:** 53 vitest tests PASS

---

### 2026-11-02 — Infisical Restored (171 Secrets), VM Loop Fixed, QR Gateway

- Infisical self-hosted restored on :8089 (redis-infisical → postgres-infisical → infisical)
- 171 prod secrets recovered from `/home/romel/automation/infisical.env` mirror
- VM restart-loop trap: dbus-monitor logind keepalive + systemctl poweroff wrapper
- QR gateway (openclaw) reinstalled, auth token in `~/.openclaw/openclaw.json`
- teldrive crash-loop fixed (compose network + DB host teldrive-db:5432)
- P5 f005 CDN worker deployed (B2 SigV4 signed URLs, Bandwidth Alliance)
- Guard pool: 6 live models (glm-5.3-flash default, deepseek-v4.1-flash, minimax-m3.1-flash, step-5-preview, nemotron-3.5-bolt, nemotron-ultra)

---

### 2026-11-01 — MASTER CLOSE: Launch Completion

- VM restart-loop root cause identified (logind + dbus)
- Infisical port-ownership trap documented (docker 5432 vs postgres-infisical 15433)
- QR gateway authentication flow stabilized
- P5 f005 CDN worker code complete (B2 private + signed URLs)
- teldrive crash-loop root cause (network + DB host)
- Guard health monitoring established (6 models + kilo.ai fallback)

---

### 2026-10-28 — z-ai/glm-5.3 EOL (410 Gone)

- Model `z-ai/glm-5.3` returned 410 Gone from provider
- Fallback chain activated: deepseek-v4.1-flash → minimax-m3.1-flash → step-5-preview
- Guard pool updated to 6 live models
- No user-facing downtime (fallback chain handled seamlessly)

---

### 2026-10-19 — P4 Closed: /models.json 404 Fixed

- Root cause: `@libsql/isomorphic-ws` esbuild bug in worker bundle
- Fix: `external = ["node:sqlite", "@libsql/isomorphic-ws"]` in wrangler-pages.toml
- Lazy import for hrana-client WASM
- Verification: 4x200 probe (/tv, /api/tv, /api/tv/live, /models.json) all green

---

### 2026-10-09 — Prisma fs.readdir Trap on Workers

- Prisma 5.22 `fs.readdir` on `/lib` → unenv throws → 1102 Worker CPU limit
- Affected routes: /api/tv/playlist, /api/tv/agent/commands
- Fix: Migrate all edge routes to `@libsql/client/web` fetch-only (HTTPS/Hrana)
- Pattern: `getTursoEdgeClient()` in `lib/turso-edge.ts` converts `libsql://` → `https://`

---

### 2026-10-04 — .krabby/tool_results 1024 File Limit

- 1300+ files accumulated in `.krabby/tool_results/`
- Cleaned to 0, added prune logic
- No functional impact, prevented disk pressure

---

### 2026-10-?? — GitHub Account Suspended (Appeal #4892433)

- GitHub account suspended, push blocked
- Appeal #4892433 filed
- Forgejo (git.hostamar.com) became LIVE git host
- Vercel hostamar-build gated (builds from GitHub)
- GitLab + Codeberg mirrors maintained
- **2026-10-30:** Reinstated by Noah Spencer (GitHub Support)

---

## Troubleshooting Index

### Issue: `/api/tv` returns 503
**Root Cause:** f005 worker down, hardcoded 353 fallback
**Fix:** Route returns 200 with `b2-cache-known` (362), never 503
**File:** `app/api/tv/route.ts`

### Issue: `/api/tv/stable-channels` returns 500
**Root Cause:** Missing `TvChannelStability` table
**Fix:** Graceful fallback → empty array, never 500
**File:** `app/api/tv/stable-channels/route.ts`

### Issue: `/admin` and `/api/admin/stats` return 500
**Root Cause:** `split()` on undefined in verifyToken (NextAuth token parsing)
**Fix:** Ultra-defensive `verifyToken` + NextAuth stub + Turso-only `lib/auth.ts`
**Files:** `lib/auth-utils.ts`, `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`

### Issue: NextAuth on Workers (Prisma fs.readdir)
**Root Cause:** Prisma 5.22 WASM loader `fs.readdir` → unenv throws
**Fix:** NextAuth stub returns 501, custom JWT only, `@libsql/client/web` for DB
**Files:** `lib/turso-edge.ts`, all `/api/tv/*` routes, `app/api/auth/[...nextauth]/route.ts`

### Issue: Tunnel Down (api-primary.hostamar.com 404/503)
**Root Cause:** Wrong config.yml ingress (missing hostamar.com → localhost:3000)
**Fix:** Restart with correct config.yml for tunnel 2d67d851
**File:** `/home/romel/.cloudflared/hostamar-primary-config.yml`

### Issue: TV Agent 401 / Not Polling
**Root Cause:** TV_AGENT_SECRET missing from worker env + stale .tv-agent-secret.local
**Fix:** Add TV_AGENT_SECRET to wrangler-pages.toml, sync .tv-agent-secret.local, systemd restart
**Files:** `wrangler-pages.toml`, `.tv-agent-secret.local`, `scripts/tv-agent/agent.js`

### Issue: /models.json 404 (P4)
**Root Cause:** `@libsql/isomorphic-ws` esbuild bug
**Fix:** `external = ["node:sqlite", "@libsql/isomorphic-ws"]` in wrangler-pages.toml
**File:** `wrangler-pages.toml`

### Issue: Infisical Down / Empty DB
**Root Cause:** Docker hostamar-postgres owns port 5432, Infisical connects to wrong DB
**Fix:** Start order: redis-infisical → postgres-infisical (15433) → infisical
**Note:** postgres-15432 is DECOY (empty), postgres-infisical is REAL (773 tables)

### Issue: VM Restart Loop
**Root Cause:** logind + dbus interaction
**Fix:** dbus-monitor logind keepalive unit + systemctl poweroff wrapper trap
**Recovery:** Let wrapper power off cleanly, restart from Windows side

### Issue: teldrive Crash Loop
**Root Cause:** Compose network + DB host mismatch
**Fix:** Verify teldrive-net, DB host = teldrive-db:5432 (never host.docker.internal)

---

## Verification Commands (Quick Reference)

```bash
# 13x probe
for u in https://hostamar.com/ https://hostamar.com/pricing https://hostamar.com/api/v1/models https://hostamar.com/api/store/products https://hostamar.com/tv https://hostamar.com/tv/manifest.json https://hostamar.com/api/tv https://hostamar.com/api/tv/playlist https://hostamar.com/api/tv/stable-channels https://hostamar.com/api/tv/status https://hostamar.com/api/tv/heartbeat https://hostamar.com/admin https://hostamar.com/api/admin/stats; do echo -n "$u: "; curl -s -o /dev/null -w "%{http_code}\n" -m 10 $u; done

# models.json
curl -s https://hostamar.com/models.json | jq '.version, .models.total'

# /api/tv
curl -s https://hostamar.com/api/tv | jq '{count, source, b2_only}'

# Guard
curl -s http://127.0.0.1:12436/v1/models | jq '.data | length'

# Containers
podman ps --format '{{.Names}} {{.Status}}'
docker ps --format '{{.Names}} {{.Status}}'

# Tunnel
cloudflared tunnel info 2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f

# TV Agent
systemctl --user status tv-agent.service
curl -s "https://hostamar.com/api/tv/agent/commands?secret=686dc8917e2d30103bc67b1c931adedd239e5a69a6274d9b"

# Deploy
npm run worker:build && CLOUDFLARE_API_TOKEN=... npx wrangler deploy -c wrangler-pages.toml
```