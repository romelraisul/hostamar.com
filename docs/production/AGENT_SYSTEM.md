# AGENT_SYSTEM — Hostamar Agent System (AGENTS.md protected, this is the canonical copy)

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** Hermes WSL (primary) + Desktop Windows (Win-tasks only) + Android Termux

---

## Context

Hostamar.com solo founder, 6 products + AI Store, stack Next.js 14.2.35, Prisma 5.22.0, @libsql/client 0.14.0, @opennextjs/cloudflare 1.20.12, Wrangler 4.14.0, Gateway 11442, WSL Podman, ComfyUI RTX 5060.

**LIVE STATUS:** 13/13 endpoints green, NextAuth removed from worker, custom JWT auth, f005 CDN worker serving B2 private, tunnel hostamar-primary (2d67d851) running, TV agent active.

---

## Agent Roster

| Agent | Canonical Name | Model | Role | Platform |
|-------|---------------|-------|------|----------|
| **REEL** | `entity-REEL` | z-ai/glm-5.3-flash | Primary coding agent, infra orchestration | Hermes Agent (CLI, WSL) |
| **ECHO** | `entity-ECHO` | deepseek-ai/deepseek-v4.1-flash | Secondary coding agent, docs, architecture | Hermes Agent (CLI, WSL) |
| **SEER** | `entity-SEER` | - | Tertiary agent, parallel subagent delegation | Opencode |
| **FORGEJO** | `entity-FORGEJO` | - | Git mirror (git.hostamar.com:3000, SQLite) | WSL Podman |
| **WEBCMD** | `entity-WEBCMD` | - | Admin command UI (port 3001) | WSL Podman |
| **NVIDIA-GUARD** | `entity-NVIDIA-GUARD` | - | FreeLLMAPI proxy (127.0.0.1:12436/v1) | systemd --user |
| **WARDEN** | `entity-WARDEN` | - | Surveillance triage, daily health checks | Cron shift |

---

## Guard Models (6 Live, Concurrency 6)

| Model | Status | TTFB | Budget |
|-------|--------|------|--------|
| z-ai/glm-5.3-flash | default | 40-100s | 130 |
| deepseek-ai/deepseek-v4.1-flash | active | 40-100s | 130 |
| minimax-m3.1-flash | active | 40-100s | 100 |
| step-5-preview | active | 40-100s | - |
| nemotron-3.5-bolt | active | 40-100s | - |
| nemotron-ultra | active | 40-100s | - |

---

## Fallback Chain

```
freellmapi/auto:fast (NVIDIA Guard :12436)
    ↓ 429 / insufficient balance
Zhipu fallback (GLM-5.3)
    ↓ fail
hostamar-own-fast :4000 (local ComfyUI RTX 5060 via Gateway 11442)
    ↓ fail
Cloudflare Workers AI (fallback)
```

---

## MCP Servers

| Server | Transport | Target | Auth |
|--------|-----------|--------|------|
| Browser (browser-rs) | stdio | Playwright Chromium, port 9322 | None (local) |
| DB (Neon) | stdio | Neon serverless over 443 | DATABASE_URL [REDACTED] |
| DB (local PG) | stdio | WSL Podman Postgres:15432 | localhost |
| FS | stdio | `/home/romel/hostamar.com` | None (local) |
| Wrangler | stdio | Cloudflare API | CLOUDFLARE_API_TOKEN [REDACTED] |

---

## Deployment Architecture

### Worker f005 CDN (hostamar-f005-cdn)
- Entry: `workers/f005-cdn/src/index.ts` — B2 SigV4 signed fetch + public URL fallback
- Cache: Optional `caches.default` with try/catch
- Routes: `hostamar.com/models.json`, `hostamar.com/tv`, `f005.hostamar.com/*`
- B2 Bucket: `hostamar-prod` (us-east-005) — 324 mp4, 1.7GB
- Public CDN: `f005.hostamar.com` CNAME to `f005.backblazeb2.com`
- Secrets: `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY` via wrangler secret put

### Next.js App (hostamar.com)
- OpenNext → Cloudflare Pages (hostamar-pages worker)
- Middleware: Custom JWT auth (NextAuth removed, stub returns 501)
- DB: Turso via `@libsql/client/web` fetch-only (HTTPS/Hrana)
- Auth: Custom HS256 JWT (`lib/auth-utils.ts`), ultra-defensive verifyToken

### Infrastructure
- WSL Podman: 14+ containers (postgres, redis, webcmd, forgejo, gateway, agent-s, tv-hls2, infisical, miniflare, openwebui, uptime, minio, tv-rtmp, code-server)
- Cloudflare Tunnel: `hostamar-primary` (2d67d851) → api-router worker
- DNS: AAAA `100::` for Cloudflare Pages — NEVER DELETE
- B2: hostamar-prod (videos), 6 other buckets for backups/cache

---

## Responsibilities

- **REEL (Hermes WSL):** Primary agent for build/fix tasks, infra, deployments. Owns `wrangler-pages.toml`, `open-next.config.ts`, P4/P5 fixes.
- **ECHO (Hermes WSL):** Secondary coding agent for feature work, UI, API routes, docs generation.
- **SEER (Opencode):** Task execution, parallel subagents, fast edits.
- **FORGEJO:** Git mirror at git.hostamar.com (SQLite, tunnel 5affa5bd).
- **WEBCMD:** Admin command UI at port 3001.
- **NVIDIA-GUARD:** systemd service at `~/.hermes/nvidia-guard`, 2 keys/2 accounts rotate on 429.
- **WARDEN:** Daily health checks, site monitoring, lane assignments.

---

## Coordination Rules

- Agents don't call `clarify`, `memory`, or `cronjob` directly — those are Hermes-only.
- Subagents spawned via `delegate_task` know nothing of parent context; pass all required background.
- Every agent reads `CLAUDE.md` + `.cursorrules` before starting work.
- Build fixes must pass `npm run worker:build` before deploy.
- **Verification:** 13x probe on all endpoints must return 200/307/401 (no 500, no 503).

---

## Rules

- **Ponytail mode: full** — shortest diff, stdlib first, no unrequested abstractions
- Lazy import for `@libsql/isomorphic-ws` in hrana-client (P4 fix)
- `external = ["node:sqlite", "@libsql/isomorphic-ws"]` in `wrangler-pages.toml`
- AAAA `100::` records are Cloudflare Pages managed — never delete
- `npm run worker:build` must pass before deploy
- **B2 not R2:** All manifests and video assets on Backblaze B2 (f005/us-east-005)
- **Infisical secrets:** ALL secrets in `/home/romel/automation/infisical.env` — NEVER commit
- **Zero paid services:** No card on file, free tiers only

---

## Hermes Instances

| Instance | Purpose | Profile |
|----------|---------|---------|
| WSL (primary) | All coding, infra, deployments | default |
| Desktop Windows | Win-tasks only (UI automation) | win-tasks |
| Android Termux | Mobile access | termux |

**Persistence:** ACTIVE EVERY RESPONSE. No drift back to over-building.

---

**Note:** This is AGENT_SYSTEM.md because AGENTS.md is a protected agent-instruction file. This file contains the same canonical content.