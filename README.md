# Hostamar 🚀

AI Video SaaS Platform — Create, collaborate, and grow with AI-powered video generation.

**Status**: V40 — FB Page Auto Post Every Hour 24/Day + Hostamar TV Always Nonstop + KV 0% B2 Only 7 Buckets 310 mp4s 485 files 40 Workers 300/day 9 Crons B2 Only 4 Directory 300/day 2AM/8AM/2PM/8PM x75 +1 Forgejo 2AM retention 3 days latest only +1 WebCMD 2:30AM 30 days +1 B2 Guard 3AM Free Quota 10GB Limit 9GB Alert Hard Delete Lifecycle 1 Day +1 FB Token Refresh Monthly 1st +1 FB Auto Post Every Hour 0 * * * * 24x Daily Nonstop +1 TV Loop Checker */30 Gateway 11442 152 Models Worker minimax/minimax-m3:free Ground llama-3.2-11b-vision-instruct Podman 4 Up 15432 6379 3001 3000 WebCMD 3001 8 Profiles Token 90% Agent-S 8765 backend_ok true Edge CDP 9222 Netsh 4 Rules Tunnel git.hostamar.com + ai/comfy/browser/hostamar.com GBP Video Ready Mobile <2min 6 Shots Location 17235782860415948553 Bing bizid 2d95ab64 PIN Wait Search Console 140 Validated Monitor 2 Weeks Product Hunt Tuesday 00:01 PST Gallery 6 Video B2 URL https://f002.backblazeb2.com/file/hostamar-prod/tv/product-hunt-demo.mp4 Paywall bKash Nagad Rocket +880****7463 Free 10 Paid 100 $5 Pro Unlimited $20 ComfyUI RTX 5060 8188 INT8 Auto Upload B2 Forgejo Webhook Live FB Page 1452448287944012 Manage Everything On Your Page + Live Video API Customized Scopes pages_show_list pages_manage_posts pages_read_engagement pages_manage_metadata publish_video System User Token Never Expires Page Token 60-day Refresh Monthly

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

