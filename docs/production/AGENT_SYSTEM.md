# AGENT_SYSTEM — hostamar.com

## Context

Hostamar.com solo founder, 6 products + AI Store, stack Next.js 14.2.35, Prisma 5.22.0, @libsql/client 0.14.0, @opennextjs/cloudflare 1.20.12, Wrangler 4.14.0, Gateway 11442, WSL Podman, ComfyUI RTX 5060.

**P4 Status: CLOSED** — `/models.json` 404 fixed (was @libsql/isomorphic-ws esbuild bug).
**P5 Status: IN PROGRESS** — f005 CDN Worker (B2 version) deployed, routes pending Zone permission.

## Task

Document AI agents, tools, guards, and coordination rules.

## Includes

### Agent Roster

| Agent | Canonical Name | Model | Role | Platform |
|-------|---------------|-------|------|----------|
| REEL | `entity-REEL` | z-ai/glm-5.3-flash | Primary coding agent, infra orchestration | Hermes Agent (CLI) |
| ECHO | `entity-ECHO` | deepseek-ai/deepseek-v4.1-flash | Secondary coding agent, docs, architecture | Hermes Agent (CLI) |
| SEER | `entity-SEER` | - | Tertiary agent, parallel subagent delegation | Opencode |
| FORGEJO | `entity-FORGEJO` | - | Git mirror (git.hostamar.com:3000) | WSL Podman |
| WEBCMD | `entity-WEBCMD` | - | Admin command UI (port 3001) | WSL Podman |
| NVIDIA-GUARD | `entity-NVIDIA-GUARD` | - | FreeLLMAPI proxy (127.0.0.1:12436/v1) | systemd --user |
| WARDEN | `entity-WARDEN` | - | Surveillance triage, daily health checks | Cron shift |

### Guard Services (Concurrency 6)

| Guard | Endpoint | Role | Failover |
|-------|----------|------|----------|
| **NVIDIA Guard** | 127.0.0.1:12436/v1 | FreeLLMAPI proxy, 6 live models | Zhipu fallback on 429 |
| **AlwaysData Guard** | alwaysdata.net | 1GB forever free hosting | Cloudflare fallback |
| **Cloudflare Free Guard** | Pages/Workers/R2 | Edge hosting, 100k/day Workers | Vercel fallback |
| **B2 Guard** | s3.us-east-005.backblazeb2.com | Video + manifest storage | hostamar-prod bucket |
| **WSL Guard** | Podman stack | Local Postgres/Redis/Miniflare | Neon/Turso over 443 |
| **UA Guard** | Cloudflare WAF | 100 req/10s rate limit | - |
| **TV Guards** | tv-streamer:8088, tv-hls2:8090 | HLS streaming, EPG | Cloudflare Stream |

### NVIDIA Guard Models (6 live, budget 130/130/100)

| Model | Status | TTFB |
|-------|--------|------|
| glm-5.3-flash | default | 40-100s |
| deepseek-v4.1-flash | active | 40-100s |
| minimax-m3.1-flash | active | 40-100s |
| step-5-preview | active | 40-100s |
| nemotron-3.5-bolt | active | 40-100s |
| nemotron-ultra | active | 40-100s |

### Fallback Chain

```
freellmapi/auto:fast (NVIDIA Guard :12436)
    ↓ 429 / insufficient balance
Zhipu fallback (GLM-5.3)
    ↓ fail
hostamar-own-fast :4000 (local ComfyUI RTX 5060)
    ↓ fail
Cloudflare Workers AI (fallback)
```

### MCP Servers

| Server | Transport | Target | Auth |
|--------|-----------|--------|------|
| Browser (browser-rs) | stdio | Playwright Chromium, port 9322 | None (local) |
| DB (Neon) | stdio | Neon serverless over 443 | DATABASE_URL [REDACTED] |
| DB (local PG) | stdio | WSL Podman Postgres:5432 | localhost |
| FS | stdio | `/home/romel/hostamar.com` | None (local) |
| Wrangler | stdio | Cloudflare API | CLOUDFLARE_API_TOKEN [REDACTED] |

### Deployment Architecture

**Worker f005 CDN (hostamar-f005-cdn)**
- Entry: `workers/f005-cdn/src/index.ts` — B2 SigV4 signed fetch + public URL fallback
- Cache: Optional `caches.default` with try/catch (route-attached workers don't support Cache API)
- Routes: `hostamar.com/models.json`, `hostamar.com/api/tv*`, `hostamar.com/tv`
- B2 Bucket: `hostamar-manifests` (us-east-005) — manifests: `models.json`, `tv.json`, `live.json`
- B2 Video Bucket: `hostamar-prod` (us-east-005) — 324 mp4, 1.7GB
- Public CDN: `f005.hostamar.com` CNAME to `f005.backblazeb2.com`
- Secrets: `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY` via wrangler secret put

**Next.js App (hostamar.com)**
- Pages Router → OpenNext → Cloudflare Pages
- Middleware: NextAuth v4, custom auth bypass for cron/health
- DB: Neon serverless over 443 (DPI blocks 5432), Prisma 5.22.0
- Auth: NextAuth with credentials + GitHub OAuth
- Video: `/tv` page, `/api/tv` + `/api/tv/live` endpoints

**Infrastructure**
- WSL Podman: 9 containers (postgres:15432, redis:6379, webcmd:3001, forgejo:3000, gateway:11442, agent-s:8765, tv-hls2:8090, infisical:8089, miniflare:8787)
- Cloudflare Tunnel: `hostamar-primary` (2d67d851) → api-router worker
- DNS: AAAA `100::` for Cloudflare Pages — NEVER DELETE
- B2: hostamar-prod (videos), hostamar-manifests (JSON manifests)

### Responsibilities

- **REEL (Hermes)**: Primary agent for build/fix tasks, infra, deployments. Owns `wrangler-pages.toml`, `open-next.config.ts`, P4/P5 fixes.
- **ECHO (Hermes)**: Secondary coding agent for feature work, UI, API routes, docs generation.
- **SEER (Opencode)**: Task execution, parallel subagents, fast edits.
- **FORGEJO**: Git mirror at git.hostamar.com (SQLite, tunnel 5affa5bd).
- **WEBCMD**: Admin command UI at port 3001.
- **NVIDIA-GUARD**: systemd service at `~/.hermes/nvidia-guard`, 2 keys/2 accounts rotate on 429.
- **WARDEN**: Daily health checks, site monitoring, lane assignments.

### Coordination Rules

- Agents don't call `clarify`, `memory`, or `cronjob` directly — those are Hermes-only.
- Subagents spawned via `delegate_task` know nothing of parent context; pass all required background.
- Every agent reads `CLAUDE.md` + `.cursorrules` before starting work.
- Build fixes must pass `npm run worker:build` before deploy.
- P4 verification: 4x200 probe on `https://hostamar.com/{tv,api/tv,api/tv/live,models.json}`.
- P5 verification: `/api/tv` returns `source: "b2-live"`, live count > 353.

### Rules

- Never write root `AGENTS.md` — write to `/docs/production/AGENT_SYSTEM.md` (this file) or `/docs/production/AGENTS.md` with explicit user approval
- Lazy import for `@libsql/isomorphic-ws` in hrana-client (P4 fix)
- `external = ["node:sqlite", "@libsql/isomorphic-ws"]` in `wrangler-pages.toml`
- AAAA `100::` records are Cloudflare Pages managed — never delete
- `npm run worker:build` must pass before deploy
- **B2 not R2**: All manifests and video assets on Backblaze B2 (f005/us-east-005)
- **Infisical secrets**: ALL secrets in `/home/romel/automation/infisical.env` — NEVER commit
- **Ponytail mode: full** — shortest diff, stdlib first, no unrequested abstractions

### Verification Checklists

**P4 Closed Checklist:**
- [x] `/models.json` 200 + 4491B + 152 models + cf-ray
- [x] `@libsql/isomorphic-ws` lazy import in hrana-client
- [x] `external` config in wrangler-pages.toml
- [x] No R2_BUCKET references in workers/

**P5 Closed Checklist:**
- [ ] `/api/tv` source=b2-live count 362+
- [ ] `/models.json` 200 4491B 152 models cf-ray HIT
- [ ] B2 bucket hostamar-manifests has 3 objects (models.json, tv.json, live.json)
- [ ] 3 routes active in Cloudflare dashboard
- [ ] 4x200 green, no x-vercel header
- [ ] Token saved to Infisical with Zone:Route perms

## Output

This document. Read by every agent on first turn.