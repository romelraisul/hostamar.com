# INTEGRATIONS — hostamar.com

## Context

hostamar.com integrates with: Vercel (fallback origin), Cloudflare (primary edge + R2), bKash/Nagad/Rocket (payments), FreeLLMAPI + OmniRoute (AI models), Valkey/BullMQ (queues), B2/R2 (video storage), GitHub (repo mirror).

**P4 Status: CLOSED** — `/models.json` 404 fixed (was @libsql/isomorphic-ws esbuild bug).
**P5 Status: IN PROGRESS** — f005 CDN Worker (B2 version) deployed, routes pending Zone permission.

## Task

Document all external integrations, their roles, and failure modes.

## Includes

| Integration | Role | Config | Failure Mode |
|-------------|------|--------|--------------|
| Vercel | Fallback origin | `vercel ls`, project `prj_Ma6QbvfcJFG4RT6ckKefX8hC8lH1` | If Cloudflare down, traffic falls back |
| Cloudflare Pages | Primary edge | `wrangler-pages.toml`, zone `2aef176c6f2000da2af593f4890ec298` | AAAA `100::` must not be deleted |
| Cloudflare Workers | Edge logic | `hostamar-pages` worker, AI Gateway | `cf-ray` present, no `x-vercel` |
| Backblaze B2 | Video + asset storage | Bucket `hostamar-prod`, CDN `f005.backblazeb2.com` | 317 objects, SHA1-verified |
| B2 Manifests (f005) | Edge manifest cache | Bucket `hostamar-manifests` (or `hostamar-prod`), worker `hostamar-f005-cdn` | Cache API 5min TTL, fallback to Next.js |
| Infisical | Secrets management | `infisical export`, project `hostamar`, env `prod` | All secrets in Infisical, not in repo |
| bKash / Nagad / Rocket | Payments | Tokenized checkout, webhook HMAC | Webhook idempotency via dedupe |
| FreeLLMAPI | Free LLM access | NVIDIA guard `127.0.0.1:12436/v1` | 2 keys rotate on 429, budget 130/130/100 |
| OmniRoute | LLM router | Self-hosted, auto-rebalances models | Falls back to NVIDIA guard |
| Valkey / BullMQ | Job queues | `node:sqlite` stubbed on Workers, local Redis on Podman | Jobs pile up, retry via BullMQ |
| GitHub | Code + mirrors | `git.hostamar.com` (Forgejo, live), GitLab + Codeberg (empty) | GitHub suspended #4892433, mirrors empty until unshallow |
| Cloudflare Tunnel | Local→Edge | `hostamar-primary` token `2d67d851` | Alwaysdata fallback for `api.hostamar.com` |
| Neon | AI video DB | `@neondatabase/serverless` over 443 | Port 5432 DPI-blocked |
| Turso/libsql | Workers DB | `libsql://` via `@libsql/client/web` | WASM engine, fetch-only on Workers |

### Key Integration Details

**R2/B2 Video Pipeline**:
- 317 MP4 objects on B2 `hostamar-prod/tv`, SHA1-verified
- Bucket `allPrivate` → public toggle PENDING
- CDN: `NEXT_PUBLIC_TV_CDN=f005.backblazeb2.com/file/hostamar-prod`

**NVIDIA Guard (FreeLLMAPI)**:
- Endpoint: `127.0.0.1:12436/v1` (Hermes failback)
- Models: glm-5.3/flash, kimi-k3, deepseek-v4.1-flash
- systemd: `~/.hermes/nvidia-guard`
- 2 keys/2 accounts rotate on 429
- Budget: 130/130/100, TTFB 40-100s
- AutoClaw re-adds `zai_*` models on restart
- `'Insufficient balance'` = Zhipu fallback when guard 429s

**Git Mirrors**:
- Forgejo LIVE: `git.hostamar.com` (WSL :3100, tunnel `5affa5bd`, sqlite)
- GitLab + Codeberg remotes set but EMPTY until GitHub unshallow
- Script: `~/unblock_after_github.sh`
- `.git` size: 940M, history filter-repo pending after unshallow

**B2 Manifests (f005 CDN Worker)**:
- Bucket: `hostamar-manifests` (Backblaze B2, S3-compatible: `s3.us-east-005.backblazeb2.com`)
- Worker: `hostamar-f005-cdn` (Cloudflare Worker)
- Keys: `models.json` (4491 bytes, v40, 152 models), `tv.json` (live count from DB), `live.json` (HLS manifest)
- Cache: Cloudflare Cache API, 5min TTL (`Cache-Control: public, max-age=300`)
- Auth: AWS SigV4 in worker (lightweight), fallback to public URL
- Headers: `X-Source` = `b2-live` | `b2-cache` | `nextjs-live` | `fallback-b2-miss` | `fallback-zero`
- Sync: `scripts/sync-manifest-to-b2.mjs` runs in `worker:build`
- DB Query: `SELECT COUNT(*) FROM Video WHERE status='published'` via libsql
- Routes: `hostamar.com/models.json`, `hostamar.com/api/tv*`, `hostamar.com/tv`
- Next.js fetches from f005: `app/api/tv/route.ts` → `fetch(F005_CDN_URL/api/tv)`

**Infisical (Secrets Management)**:
- Project: `hostamar`, Environment: `prod`
- Export: `infisical export --env-file=.env.b2 --projectId=hostamar --env=prod`
- B2 Secrets: `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`, `B2_ENDPOINT`, `B2_REGION`, `B2_PUBLIC_URL`
- Worker secrets set via: `wrangler secret put B2_APPLICATION_KEY_ID -c workers/f005-cdn/wrangler.toml`
- Local sync script sources: `source /home/romel/automation/infisical.env`

## Rules

- No integration credentials committed — all via Infisical/env ([REDACTED]).
- bKash webhooks idempotent — dedupe by webhook_id.
- GitHub mirrors empty until unshallow — don't push to GitHub directly.
- **B2 not R2**: All manifests and video assets on Backblaze B2 (f005/us-east-005), NOT Cloudflare R2
- **Infisical secrets**: ALL secrets in `/home/romel/automation/infisical.env` — NEVER commit
- **4x200 Probe**: `/tv`, `/api/tv`, `/api/tv/live`, `/models.json` must all return 200 with `cf-ray`, no `x-vercel`
- **353 Removal**: Hardcoded `count: 353` fallback REMOVED from `app/api/tv/route.ts`

## Output

This document. Reference for every new integration.