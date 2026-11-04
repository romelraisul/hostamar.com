# Hostamar.com — Production Overview

**Last verified:** 2026-11-04 13:25 Asia/Dhaka  
**Live status:** 13/13 endpoints green, 374 TV videos, 152 AI models, 53 tests passing

## Project Goal

Agent Cloud (`agent.hostamar.com`) + Sovereign Video OS + EU-BD GPU spot market entry. Four 200s now: AI gateway, TV channel, bKash store, Bengali LLM training pipeline.

## Live Endpoints (13/13 Green)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/` | 200 | Homepage |
| `/login` | 200 | Custom JWT, amber notice for `?error=sso_callback_failed` |
| `/pricing` | 200 | 1cr=1 taka, bKash 01822417463 |
| `/api/v1/models` | 200 | 152 models, 10 categories |
| `/api/store/products` | 200 | 124 bKash products |
| `/tv` | 200 | 374 videos, auto-loop player |
| `/tv/manifest.json` | 200 | 374 videos, B2-served |
| `/api/tv` | 200 | B2 cache known |
| `/api/tv/playlist` | 200 | 374 signed URLs via f005 worker |
| `/api/tv/stable-channels` | 200 | Graceful fallback |
| `/api/tv/status` | 200 | |
| `/api/tv/heartbeat` | 200 | |
| `/admin` | 307 | Redirect to login |
| `/api/admin/stats` | 401 | Auth guard works |
| `/models.json` | 200 | v40, 152 models |

## Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Edge Runtime:** Cloudflare Workers via OpenNext (`useWorkerdCondition: true`)
- **Database:** Turso (libSQL) via `@libsql/client/web` — fetch-only, no Prisma in edge
- **Auth:** Custom JWT (HS256, `node:crypto`), NextAuth disabled (stub returns 501)
- **Video CDN:** Cloudflare Worker `hostamar-f005-cdn` → Backblaze B2 private bucket `hostamar-prod` via S3Client + getSignedUrl
- **Billing:** bKash tokenized checkout, 1cr = 1 BDT
- **Language:** Bengali-first (bn_BD), English fallback

## Brand Colors (Verified)

| Role | Hex | Usage |
|------|-----|-------|
| Primary | `#0E7C3A` | Buttons, accents, live indicator |
| Secondary | `#2563EB` | Links, secondary actions |
| Accent | `#F59E0B` | Warnings, amber notices |
| Surface Light | `#FFFFFF` / `#F8FAFC` | Backgrounds |
| Surface Dark | `#0F172A` | Dark mode surfaces |
| Text Primary | `#0F172A` | Headings |
| Text Secondary | `#475569` | Body |
| Text Muted | `#64748B` | Captions |

## Key Metrics (Live)

- **TV videos:** 374 (manifest.json count)
- **AI models:** 152 (v40 models.json)
- **Edge tools:** 53
- **Renders:** 168
- **Store products:** 124
- **B2 bucket `hostamar-prod`:** 324 MP4, 1.7GB/10GB
- **Git commits:** 2024 (unshallowed)
- **Tests:** 53 passing

## Deployment

- **Primary:** Cloudflare Pages + Workers (OpenNext)
- **Fallback:** Vercel `hostamar-build` (deleted, CNAME removed)
- **DNS:** Cloudflare proxied, AAAA `100::` is Pages-managed (DO NOT DELETE)
- **Tunnel:** `hostamar-primary` (2d67d851-d11e-4cb9-a6f3-5f5f3e6e2f1f) running

## Commands to Reproduce Verification

```bash
# 13x probe
for u in https://hostamar.com/ https://hostamar.com/login https://hostamar.com/pricing https://hostamar.com/api/v1/models https://hostamar.com/api/store/products https://hostamar.com/tv https://hostamar.com/tv/manifest.json https://hostamar.com/api/tv https://hostamar.com/api/tv/playlist https://hostamar.com/api/tv/stable-channels https://hostamar.com/api/tv/status https://hostamar.com/api/tv/heartbeat https://hostamar.com/admin https://hostamar.com/api/admin/stats https://hostamar.com/models.json; do echo -n "$u: "; curl -s -o /dev/null -w "%{http_code}\n" -m 10 $u; done

# Playback verification
curl -s https://hostamar.com/api/tv/playlist?format=json | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"count={d.get('count')} source={d.get('source')}\")"
curl -I $(curl -s https://hostamar.com/api/tv/playlist?format=json | python3 -c "import json,sys; print(json.load(sys.stdin)['videos'][0]['url'])") 2>&1 | head -10

# Tests
cd /home/romel/hostamar.com && pnpm test
```