# Hostamar 🚀

AI Video SaaS Platform — Create, collaborate, and grow with AI-powered video generation.

**V36 Final Closure Status (2026-10-27):** KV to B2 Migration complete zero KV in codebase KV namespaces HOSTAMAR_KV WEBCMD_MEMORY INDEXNOW_CACHE export JSON /tmp/*-export.json B2 buckets b2:hostamar-b2-kv-migration b2:hostamar-b2-webcmd-memory b2:hostamar-b2-indexnow-cache b2:hostamar-b2-forgejo b2:hostamar-prod 310 mp4s b2:hostamar-b2-video 485 files CDN live Forgejo push org hostamar 4 repos hostamar-platform marketing ansible terraform push main commits same webhook https://hostamar.com/api/webhook/forgejo HMAC 200 access token live B2 backup only 6 crons 4 directory 300/day 2AM/8AM/2PM/8PM ×75=300 + 1 forgejo 2AM + 1 webcmd B2 2:30AM no R2 no KV cost $0.06/mo GBP video ready upload mobile <2min continuous 6 shots street signs tools invoice permit software company location 17235782860415948553 store 17641410083244757304 gbp-live-final.png after upload no terminal Bing Places bizid 2d95ab64 PIN wait 5-6 days bing-live-final.png Search Console 140 validate fix monitor 2 weeks search-console-fixed.png Directories queue 1000 daily 300 remaining 690 after run 40 workers 8×5 4 crons token 90% stealth 403->200 logs 300/day screenshots 30/day no terminal B2 backup only Product Hunt launch Tuesday 00:01 PST gallery 6 video B2 URL https://f002.backblazeb2.com/file/hostamar-prod/tv/product-hunt-demo.mp4 tagline description maker comment X web UI FB page live 11 customers email Paywall bKash Nagad Rocket +880*7463 free 10 paid 100 $5 pro unlimited $20 usage metering inference metrics feedback evals high quality prompts prompt anatomy log customers 11 subscriptions 1 payments 1 usage daily TTFT TPOT LRU 1000 KV-cache 500 batch 4 FeedbackButtons 👍/👎 flywheel moat ComfyUI RTX 5060 port 8188 INT8 auto upload rclone copy output/*.mp4 b2:hostamar-prod/tv/ SHA1 manifest Cloudflare Cache HIT 168 renders 317->400+ mp4s B2 CDN live Fleet healthy Podman 4 Up 15432 6379 3001 3000 Gateway 11442 152 health 200 WebCMD 3001 health 200 8 profiles Agent-S 8765 backend_ok true minimax/m3 Edge CDP 9222 live Netsh 4 rules ai comfy browser git Firewall 3000 Allow Tunnel git.hostamar.com + ai/comfy/browser/hostamar.com Health pc.alive true age <1200s DB 11 Probe UP Sitemap 340 IndexNow batch 5 68 chunks delay 2s cache 1h KV 0% B2 only no KV 36 docs V36 Infisical 540 PATCHED.

## Stack

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS 3
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Neon)
- **Auth:** NextAuth.js + JWT
- **Deploy:** Vercel (primary), Docker (alternative)

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start dev server |
| `make build` | Production build |
| `make typecheck` | TypeScript check |
| `make lint` | ESLint |
| `make clean` | Remove build artifacts |
| `make migrate` | Run Prisma migrations |
| `make studio` | Open Prisma Studio |
| `make vercel-deploy` | Deploy to Vercel |

## Project Structure

```
app/              # Next.js App Router pages
  api/            # API routes (55+)
  dashboard/      # User dashboard
  admin/          # Admin panel
  collab/         # Collaboration
  generate/       # AI video generation
  ossu/           # OSSU curriculum
components/       # Reusable UI components
  home/           # Homepage sections
  collab/         # Collab page components
  generate/       # Generate page components
lib/              # Shared utilities
prisma/           # Database schema & migrations
payment/          # Payment integrations (bKash, Nagad, Crypto)
marketing-output/ # Marketing collateral
public/           # Static assets & PWA icons
deploy/           # Deployment scripts
```

## Environment Variables

See `.env.example` for required variables. Key ones:

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://hostamar.com
```

## Marketing

Marketing engine at `marketing-output/marketing-engine.py` supports:
- Facebook posting
- WhatsApp messaging
- Email campaigns
- YouTube uploads

Configure via `.env.marketing` file.

## Browser Automation

Camofox-based browser automation for research and content gathering:
- `npm run browser:health` — Check Camofox status
- `npm run browser:auto` — Run automation scripts
- `npm run browser:api` — API documentation


## Tunnel (Windows)
```bat
cloudflared tunnel list
cloudflared tunnel run hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b)
python C:\hostamar\gateway.py
```
Auto-start: Task Scheduler → hostamar-prod-new (ID 7a08ec13-21c1-41be-8664-0a89e371354b) + gateway.py on boot.

