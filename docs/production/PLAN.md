# PLAN — hostamar.com

## Context

P4 (models.json 404 on Cloudflare Pages) is closed. All 4 endpoints return 200 with `cf-ray` present and no `x-vercel`. Next milestone: P5 — f005 CDN Worker deployment to replace hardcoded count=353 fallback on `/api/tv`.

## Task

Define milestones, dependencies, owners, and next steps for the hostamar.com roadmap.

## Includes

### Completed (P4 — CLOSED)
- `public/models.json` restored (4491 bytes, v40, 152 models)
- `@libsql/hrana-client` lazy-WebSocket patch applied (pnpm store + nested copies)
- `node:sqlite` stubbed via `scripts/patch_handler_sqlite.mjs` (post-build)
- `wrangler-pages.toml` fixed: single `[build]` + `external` under `[build.upload]`
- `middleware.ts` moved to `middleware.ts.bak` during fix period
- Deployed via `npx wrangler deploy -c wrangler-pages.toml`
- P4 verified: 4x200 probe, `cf-ray` present, no `x-vercel`

### Next: P5 — f005 CDN Worker (B2 PRIVATE — CLOSED)
- Worker code: `workers/f005-cdn/src/index.ts` ✅ (AWS SDK S3Client + getSignedUrl for private B2 SigV4)
- Wrangler config: `workers/f005-cdn/wrangler.toml` ✅ (B2 vars, platform=node, no R2 binding)
- Sync script: `scripts/sync-manifest-to-b2.mjs` ✅ (B2 S3 upload, private bucket)
- Secrets: `B2_APPLICATION_KEY_ID` + `B2_APPLICATION_KEY` set via `wrangler secret put`
- Routes: hostamar.com/models.json, /api/tv*, /tv, f005.hostamar.com/* assigned to hostamar-f005-cdn
- Old worker routes deleted (35037ca8, 0bd1d302, 13600a1f)
- Bucket stays Private — no public toggle, no fee, served via Worker signed URLs
- Egress free via Cloudflare Bandwidth Alliance (B2→Cloudflare)

**P5 Acceptance Criteria (B2 Version) — ALL VERIFIED**:
- `/api/tv` returns `source: "b2-live-private"`, `count: 362`, `b2_only: true` ✅
- `/models.json` returns `version: 40`, `models.total: 152`, `cf-ray` present ✅
- 4x200 probe green (`/tv`, `/api/tv`, `/api/tv/live`, `/models.json`) ✅
- `grep -r "353" app/api/tv/` returns 0 matches ✅
- `grep -r "R2_BUCKET" workers/` returns 0 matches ✅
- Bucket Private (no fee) — verified via `b2 ls b2://hostamar-prod` ✅
- Background `next dev` loop stopped (pkill -9) ✅
- File limit blocker cleaned (.krabby/tool_results) ✅
- Fleet: 9 containers verified, postgres-15432/infisical/redis restarted ✅
- Guard: 6 models alive on :12436 ✅

### Milestones

| Milestone | Goal | Owner | Status |
|-----------|------|-------|--------|
| P4 | models.json 200 on Cloudflare | Solo founder | ✅ CLOSED |
| P5 | f005 CDN Worker live | Solo founder | 🔄 IN PROGRESS |
| P6 | bKash tokenized checkout | Solo founder | ⬜ PLANNED |
| P7 | Sovereign Video OS (ComfyUI pipeline) | Solo founder | ⬜ PLANNED |
| P8 | AI Store 50 services live | Solo founder | ⬜ PLANNED |

### Dependencies
- P5 depends on: Cloudflare Workers deployment pipeline (done), CDN Worker code (f005), TV manifest endpoint
- P6 depends on: bKash sandbox credentials, webhook endpoint public URL
- P7 depends on: Windows RTX 5060 ComfyUI, Gateway :11442 tunnel, local Podman

### Owners
- **Solo founder**: All milestones (no team yet)

### KPIs (targets)
- MRR: 0 → 10 paying (post-P6)
- TV uptime: 99.9%
- Build time: <30s (worker:build)
- Cold start: <30ms

## Output

This document. Reviewed weekly by solo founder.