# Hostamar CEO Roadmap — 2026-06-27

## Current State
- Platform: Next.js 14 + Prisma/PostgreSQL + Redis + BullMQ + ComfyUI + Ollama
- Access: ssh.hostamar.com (OAuth), hostamar.com (Cloudflare tunnel ready)
- Beta page: https://hostamar.com/beta (live, 200 OK)
- Customers: 17 active in database
- Hardware: Windows host + WSL2, free-tier only, step-upgrade planned
- Model: kilo-auto/free via Kilo Gateway
- Decision: Keep PC running 24/7; defer VPS provisioning to later

## Completed
1. Repo build fully unblocked
   - Added missing stubs: lib/prisma.ts, lib/auth-config.ts, components/ui/button.tsx, components/ui/card.tsx
   - Pinned Prisma binary target for debian-openssl-3.0.x
   - Fixed Dockerfile base from node:22-alpine to node:22-bookworm-slim
   - Fixed next.config.js with webpack @ alias
   - /beta page deployed and accessible
   - Health endpoint clean with 17 customers

2. Infrastructure stable
   - 9 containers healthy: app, postgres, redis, comfyui, vectors, gpu-worker, model, cloudflared, ssh
   - Local access on http://localhost:3000
   - Secret rotation cron active at 03:30 UTC with logs

3. Documentation prepared
   - docker-compose.vps.yml ready (for later VPS switch)
   - ops/nginx/, ops/monitoring/, ops/ssh-gateway/ structured

## Blockers / Gaps
- Hosted inference fallback: /home/romel/ceo-secrets/inference-endpoint is empty
  Need: FALLBACK_API_URL, FALLBACK_API_KEY, FALLBACK_MODEL
- VPS not provisioned; no production-grade 24/7 hosting yet
- ttyd typing on ssh.hostamar.com is broken (OAuth succeeds but shell input fails)
- /api/logs and /api/generate return "Not authenticated" from unauthenticated requests (auth wiring may be misconfigured)

## CEO Action Plan
Priority order for next session:

A. Activate hosted inference fallback (C step)
   1. Paste inference credentials into /home/romel/ceo-secrets/inference-endpoint
      Format:
      FALLBACK_API_URL=https://api.openai.com/v1
      FALLBACK_API_KEY=sk-...
      FALLBACK_MODEL=gpt-4o-mini
   2. Restart app container to load new env
   3. Test fallback route manually

B. Fix ssh.hostamar.com typing
   1. Re-investigate ttyd WebSocket + oauth2-proxy interaction
   2. Likely fix: adjust ttyd WebSocket path or oauth2-proxy headers
   3. Confirm typing works end-to-end after OAuth redirect

C. Enable production auth for APIs
   1. Audit why /api/logs and /api/generate reject unauthenticated requests
   2. Align with beta signup / invite flow so beta users can access generation

D. Marketing / growth
   1. Publicize beta invite codes (20 seeded, accessible via /api/beta/signup)
   2. Verify payment numbers visible on site (bkash / rocket / nagad)
   3. Verify contact page + WhatsApp integration

E. VPS upgrade (phase 2)
   1. Prepare 192.168.1.7 or new VPS credentials
   2. Run setup-vps.sh or hostamar/setup:latest container
   3. Switch Cloudflare tunnel to VPS origin
   4. Migrate postgres + redis + storage to VPS
   5. Keep WSL as build bench; move runtime to VPS

## Files of interest
- /home/romel/hostamar-build/app/beta/page.tsx (beta entry)
- /home/romel/ceo-secrets/beta-codes.txt (20 invites)
- /home/romel/hostamar-build/docker-compose.vps.yml (VPS target)
- /home/romel/hostamar-build/ops/nginx/, ops/monitoring/, ops/ssh-gateway/ (production configs)
- hostamar-ollama container with hermes3:latest (Docker Model Runner)
